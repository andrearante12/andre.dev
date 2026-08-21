"""Bake the SO-ARM101 URDF + STL parts into one web-sized GLB.

The source (from helium_final_presentation.zip) is 14 print-resolution STLs,
~326k triangles / 16 MB, loaded at runtime by urdf-loader. That is far too
heavy for a homepage hero and needs 14 requests plus a URDF parser.

This bakes the kinematic tree into a glTF node hierarchy instead: one node per
link, named after the joint that drives it, with the joint origin as the node
transform. The page can then pose the arm by rotating nodes by name — same
articulation, one file, no URDF loader.

Meshes are welded and quadric-decimated; the two material groups (printed
parts vs servo bodies) are kept separate so the page can shade them.
"""
import os
import xml.etree.ElementTree as ET

import numpy as np
import trimesh
import fast_simplification

SRC = '/tmp/claude-1000/-home-andre-andre-dev/6d8af505-9c8f-4580-bd14-f672be563a84/scratchpad/helium'
URDF = os.path.join(SRC, 'so101.urdf')
OUT = '/home/andre/andre.dev/models/so101.glb'

# Fraction of triangles to keep. The arm renders ~500px tall on the page, so
# print-resolution curvature is invisible; 10% still holds every silhouette.
KEEP = 0.10
MIN_TRIS = 260          # don't decimate small parts into rubble


def rpy_xyz_matrix(xyz, rpy):
    """URDF origin → 4x4. URDF rpy is fixed-axis roll-pitch-yaw (X then Y then Z)."""
    r, p, y = rpy
    cr, sr, cp, sp, cy, sy = np.cos(r), np.sin(r), np.cos(p), np.sin(p), np.cos(y), np.sin(y)
    R = np.array([
        [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
        [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
        [-sp,     cp * sr,                cp * cr],
    ])
    M = np.eye(4)
    M[:3, :3] = R
    M[:3, 3] = xyz
    return M


def floats(s, n=3):
    v = [float(x) for x in s.split()]
    return v if len(v) == n else [0.0] * n


def load_part(path):
    m = trimesh.load(path, process=True)
    if isinstance(m, trimesh.Scene):
        m = trimesh.util.concatenate(tuple(m.geometry.values()))
    return m


def decimate(mesh):
    n = len(mesh.faces)
    target = max(MIN_TRIS, int(n * KEEP))
    if n <= target:
        return mesh
    v, f = fast_simplification.simplify(
        np.asarray(mesh.vertices, dtype=np.float32),
        np.asarray(mesh.faces, dtype=np.int32),
        target_reduction=1.0 - target / n,
    )
    return trimesh.Trimesh(vertices=v, faces=f, process=True)


tree = ET.parse(URDF)
root = tree.getroot()

# ── links: merge each link's visuals into one mesh per material ──────────
cache = {}
link_geom = {}          # link -> {material: Trimesh}
for link in root.findall('link'):
    name = link.get('name')
    by_mat = {}
    for vis in link.findall('visual'):
        mesh_el = vis.find('geometry/mesh')
        if mesh_el is None:
            continue
        fn = mesh_el.get('filename').replace('package://', '')
        path = os.path.join(SRC, 'robots/so101', fn)
        if path not in cache:
            raw = load_part(path)
            cache[path] = decimate(raw)
            print(f'  {os.path.basename(path):46s} {len(raw.faces):6d} -> {len(cache[path].faces):6d} tris')
        part = cache[path].copy()

        o = vis.find('origin')
        xyz = floats(o.get('xyz', '0 0 0')) if o is not None else [0, 0, 0]
        rpy = floats(o.get('rpy', '0 0 0')) if o is not None else [0, 0, 0]
        part.apply_transform(rpy_xyz_matrix(xyz, rpy))

        mat_el = vis.find('material')
        mat = mat_el.get('name') if mat_el is not None else '3d_printed'
        by_mat.setdefault(mat, []).append(part)

    link_geom[name] = {m: trimesh.util.concatenate(parts) for m, parts in by_mat.items()}

# ── joints: parent/child + origin ────────────────────────────────────────
joints = []
for j in root.findall('joint'):
    o = j.find('origin')
    axis_el = j.find('axis')
    limit = j.find('limit')
    joints.append({
        'name': j.get('name'),
        'parent': j.find('parent').get('link'),
        'child': j.find('child').get('link'),
        'xyz': floats(o.get('xyz', '0 0 0')) if o is not None else [0, 0, 0],
        'rpy': floats(o.get('rpy', '0 0 0')) if o is not None else [0, 0, 0],
        'axis': floats(axis_el.get('xyz', '1 0 0')) if axis_el is not None else [1, 0, 0],
        'lower': float(limit.get('lower')) if limit is not None else 0.0,
        'upper': float(limit.get('upper')) if limit is not None else 0.0,
    })

children = {j['parent']: [] for j in joints}
for j in joints:
    children.setdefault(j['parent'], []).append(j)
    children.setdefault(j['child'], [])
base = next(l.get('name') for l in root.findall('link'))

# ── build the glTF scene graph ───────────────────────────────────────────
scene = trimesh.Scene()
# No baked colours: node names carry the material group and the page picks the
# palette, so the arm can be shaded to whichever theme is showing it.


def add_link(link, frame):
    """One node per link, named after the joint that drives it, so the page can
    pose the arm with getObjectByName(<joint>).rotation."""
    for mat, mesh in link_geom.get(link, {}).items():
        scene.add_geometry(mesh.copy(), node_name=f'{link}__{mat}', geom_name=f'{link}__{mat}',
                           parent_node_name=frame)
    for j in children.get(link, []):
        child_frame = j['name']
        scene.graph.update(frame_to=child_frame, frame_from=frame,
                           matrix=rpy_xyz_matrix(j['xyz'], j['rpy']))
        add_link(j['child'], child_frame)


scene.graph.update(frame_to=base, frame_from=scene.graph.base_frame, matrix=np.eye(4))
add_link(base, base)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
# Normals are ~a third of the buffer and three.js can rebuild them on load.
glb = trimesh.exchange.gltf.export_glb(scene, include_normals=False)
with open(OUT, 'wb') as f:
    f.write(glb)

tris = sum(len(m.faces) for g in link_geom.values() for m in g.values())
print(f'\n{OUT}  {len(glb)/1e6:.2f} MB  ({tris} tris)')
print('joints:', ', '.join(f"{j['name']}[{j['lower']:.2f},{j['upper']:.2f}]" for j in joints))
print('axes  :', {j['name']: j['axis'] for j in joints})
print('bounds:', np.round(scene.bounds, 4).tolist(), ' extents:', np.round(scene.extents, 4).tolist())
