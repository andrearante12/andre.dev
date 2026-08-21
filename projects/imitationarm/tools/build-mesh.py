#!/usr/bin/env python3
"""
build-mesh.py — pack the arm's STL meshes into one quantised binary for the web.

Reads the binary STLs referenced by the URDF and writes docs/media/arm-mesh.bin,
a single file the hero renderer fetches in one request.

Positions are quantised to uint16 per mesh against that mesh's own bounding box,
which is ~3 micron precision on a 20 cm part — far finer than anything visible —
and halves the payload versus float32. Normals are not stored; the renderer
computes flat face normals, which is the correct look for machined brackets and
matches how the MuJoCo scene renders.

Layout:
    uint32                  header length in bytes
    <header>                UTF-8 JSON, padded to a 4-byte boundary
    <data>                  uint16 position triples, little-endian

Header JSON:
    {"meshes": [{"name","tris","min":[x,y,z],"scale":[x,y,z],"offset":bytes}, ...]}

Dequantise as:  p = min + q * scale

Usage:  python3 docs/tools/build-mesh.py
"""

import json
import os
import struct
import sys
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
URDF = os.path.join(ROOT, "src/robot/robotic_arm_model_v3/urdf/robotic_arm_model_v3.urdf")
MESHDIR = os.path.join(ROOT, "src/robot/robotic_arm_model_v3/meshes")
OUT = os.path.join(ROOT, "docs/media/arm-mesh.bin")


def read_binary_stl(path):
    """Return a flat list of floats, 9 per triangle."""
    with open(path, "rb") as f:
        data = f.read()
    if len(data) < 84:
        raise ValueError(f"{path}: too short to be a binary STL")
    (count,) = struct.unpack_from("<I", data, 80)
    expected = 84 + count * 50
    if len(data) != expected:
        raise ValueError(
            f"{path}: expected {expected} bytes for {count} triangles, got {len(data)}"
        )
    verts = []
    off = 84
    for _ in range(count):
        # 12 bytes of face normal, then 3 vertices, then 2 bytes attribute
        vs = struct.unpack_from("<9f", data, off + 12)
        verts.extend(vs)
        off += 50
    return count, verts


def link_meshes():
    """Ordered [(link_name, stl_path)] from the URDF's visual geometry."""
    root = ET.parse(URDF).getroot()
    out = []
    for link in root.findall("link"):
        mesh = link.find("visual/geometry/mesh")
        if mesh is None:
            continue
        origin = link.find("visual/origin")
        if origin is not None:
            xyz = [float(v) for v in origin.get("xyz", "0 0 0").split()]
            rpy = [float(v) for v in origin.get("rpy", "0 0 0").split()]
            if any(abs(v) > 1e-9 for v in xyz + rpy):
                # The renderer assumes each mesh sits in its link frame.
                raise SystemExit(
                    f"{link.get('name')}: non-identity visual origin "
                    f"(xyz={xyz} rpy={rpy}) — the renderer would place it wrong."
                )
        fn = os.path.basename(mesh.get("filename"))
        out.append((link.get("name"), os.path.join(MESHDIR, fn)))
    return out


def main():
    meshes = link_meshes()
    if not meshes:
        raise SystemExit("no visual meshes found in the URDF")

    header = {"meshes": []}
    blobs = []
    offset = 0
    total_tris = 0

    for name, path in meshes:
        if not os.path.exists(path):
            raise SystemExit(f"missing mesh: {path}")
        tris, verts = read_binary_stl(path)
        total_tris += tris

        xs, ys, zs = verts[0::3], verts[1::3], verts[2::3]
        lo = [min(xs), min(ys), min(zs)]
        hi = [max(xs), max(ys), max(zs)]
        # scale maps the box onto 0..65535; a flat axis gets scale 0
        scale = [((hi[i] - lo[i]) / 65535.0) if hi[i] > lo[i] else 0.0 for i in range(3)]

        q = bytearray()
        for i in range(0, len(verts), 3):
            for a in range(3):
                s = scale[a]
                v = 0 if s == 0 else int(round((verts[i + a] - lo[a]) / s))
                q += struct.pack("<H", max(0, min(65535, v)))

        header["meshes"].append(
            {"name": name, "tris": tris, "min": lo, "scale": scale, "offset": offset}
        )
        blobs.append(bytes(q))
        offset += len(q)
        print(f"  {name:22s} {tris:6d} tris   {len(q)/1024:7.1f} KB")

    hjson = json.dumps(header, separators=(",", ":")).encode("utf-8")
    pad = (-(4 + len(hjson))) % 4
    hjson += b" " * pad

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "wb") as f:
        f.write(struct.pack("<I", len(hjson)))
        f.write(hjson)
        for b in blobs:
            f.write(b)

    size = os.path.getsize(OUT)
    print(f"\n{len(meshes)} meshes, {total_tris} triangles")
    print(f"wrote {OUT}  ({size/1024:.1f} KB)")


if __name__ == "__main__":
    sys.exit(main())
