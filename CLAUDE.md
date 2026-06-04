# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal portfolio site for Andre Arante (Robotics & Computer Vision Engineer). Pure static HTML/CSS/JS — no build system, no package manager, no frameworks. Served via GitHub Pages from the repo root, so **all asset paths are relative and case-sensitive** (it builds on Linux; macOS won't catch casing mistakes). Open `index.html` over a local HTTP server (e.g. `python3 -m http.server`) to preview — it uses ES modules, so `file://` won't load them.

## File Structure

- `index.html` — Main portfolio: an interactive **3D "workshop" room** built with Three.js. Each device on the desk is a clickable project; a CV-style detection box brackets it and a detail panel slides in. Includes a "scan room" mode, a "research" view that flies out to a front-yard drone-delivery scene, and a photography gallery modal opened from the DSLR prop.
- `index-classic.html` — The previous single-scroll portfolio (hero / about / project grid with slide-in modal / timeline / contact). Kept as a fallback; not linked from the live site.
- `photography.html` — Standalone photography gallery: masonry grid, category filter bar, lightbox viewer.
- `room/` — ES modules that build and drive the 3D room (see below).
- `photos/` — Curated, web-sized photos used by the in-room gallery modal (separate from the larger `photography/` set used by `photography.html`).

## Architecture

`index.html` is a thin shell: inline `<style>` for all HUD/overlay/panel CSS, an `<script type="importmap">` pinning Three.js from the unpkg CDN (`three@0.160.0`), and `<script type="module" src="room/main.js">` to boot the scene. The only other external dependency is Google Fonts.

### `room/` modules

- `main.js` — entry point: scene, renderer, camera, OrbitControls, lighting, render loop; wires the other modules together.
- `lib.js` — geometry/material helpers (`box`, `cyl`, `sphere`, `cone`, `capsule`, `group`, `mat`, `COL`, `tagInteractive`).
- `buildRoom.js` — static environment: floor, walls, L-desk, shelves, plants, capybaras, paintings, lamps.
- `buildObjects.js` — the interactive project props (arm, PiCrawler, monitor, phone, Switch, IoT hub) and `buildCamera` (the DSLR). Monitor/Switch screens are in-scene video textures (`videos/minecraft_envs.mp4`, `videos/vgc_demo.webm`).
- `data.js` — `PROJECTS` metadata + `PROJECT_ORDER`. See "Adding/editing projects" below.
- `interaction.js` — raycasting against invisible AABB hover proxies, detection-box drawing, idle auto-cycle, click-to-focus camera pans, the research-view entry hook.
- `ui.js` — renders the detail panel, the LUMINA app (mapped onto the phone's 3D screen via CSS homography), and the screen-app overlay.
- `lamps.js` — lamp controller the LUMINA app drives in real time.
- `gallery.js` — the photography modal (reads from `photos/`).
- `exterior.js` — the research-view front-yard scene (house, driveway, helipad) and the drone-delivery animation.

### Design system (CSS variables)

`index.html` and `photography.html` use a warm dark palette. `index.html`'s `:root`:

| Variable | Value | Role |
|---|---|---|
| `--bg` | `#130f0a` | Warm near-black background |
| `--text` / `--muted` | `#f1eadf` / `#b6a78f` | Text hierarchy |
| `--teal` | `#00d4aa` | Teal accent (scan button, gallery) |
| `--mono` | `'DM Mono'` | Monospace labels, HUD, tags |
| `--display` | `'Syne'` | Display headings |
| `--body` | `'DM Sans'` | Body copy |

Per-project accent colors live in each `PROJECTS` entry's `accent` field and drive the detection box + panel via the `--accent` CSS variable, set at runtime.

### Adding photos

There are two independent photo galleries:

- **In-room gallery** (the DSLR prop in `index.html`) — edit the `PHOTOS` array at the top of `room/gallery.js`. Each entry: `{ src: 'photos/dc-01.jpg', title, location, category }`. Images live in `photos/` (curated, web-sized). Category filter buttons are generated from the unique `category` values.
- **Standalone `photography.html`** — edit its own `PHOTOS` array in the inline `<script>`; images live in the larger `photography/` directory.

### Adding/editing projects (`index.html` / the 3D room)

Each project needs **two pieces**:

1. **Metadata** — an entry in `PROJECTS` in `room/data.js`, keyed by `id`. Fields: `title`, `type`, `accent` (hex, drives the detection box/panel color), `tag` (label shown in the detection box), `blurb`, `highlights` (bullets), `stack` (tags), `detail`/`github` links, and optional `docs`. Add the `id` to `PROJECT_ORDER` so it joins the idle auto-cycle and chip nav. `app: 'lumina'` flags the IoT phone app.
2. **A clickable object** — a prop built in `room/buildObjects.js` and registered with the same `id` (via `tagInteractive`), plus an invisible AABB hover proxy so the detection box is stable and easy to hit. Screen-based props (monitor/Switch) use a video texture from `videos/`.

The old grid/modal `PROJECTS` array now lives only in `index-classic.html`.
