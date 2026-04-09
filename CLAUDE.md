# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal portfolio site for Andre Arante (Robotics & Computer Vision Engineer). Pure static HTML/CSS/JS — no build system, no package manager, no frameworks. Open any `.html` file directly in a browser to preview.

## File Structure

- `index.html` — Main portfolio: hero, about/stack, projects (with slide-in modal), experience timeline, contact
- `photography.html` — Photography gallery: masonry grid, category filter bar, lightbox viewer

## Architecture

Both pages are self-contained: all CSS lives in an inline `<style>` block and all JS at the bottom in a `<script>` block. There are no external JS dependencies (only Google Fonts via CDN).

### Design system (CSS variables)

Both pages share the same token set defined in `:root`:

| Variable | Value | Role |
|---|---|---|
| `--bg` / `--bg2` / `--card` | `#0a0a0f` / `#111118` / `#14141c` | Background layers |
| `--accent` | `#6c63ff` | Primary purple accent |
| `--accent2` | `#00d4aa` | Teal accent (logo, eyebrows) |
| `--text` / `--muted` | `#e8e8f0` / `#6e6e88` | Text hierarchy |
| `--mono` | `'DM Mono'` | Monospace labels, nav, tags |
| `--display` | `'Syne'` | Display headings (h1, h2, h3) |
| `--body` | `'DM Sans'` | Body copy |

### Adding photos (`photography.html`)

Edit the `PHOTOS` array in the `<script>` block. Each entry:

```js
{ src: "photos/my-shot.jpg", title: "Title", location: "City", category: "Street", aspect: "tall" }
// aspect: "tall" | "wide" | "square"
// Omit `placeholder: true` for real photos
```

Category filter buttons are generated automatically from the unique `category` values in `PHOTOS`.

### Adding/editing projects (`index.html`)

Projects are defined in the `PROJECTS` array in the `<script>` block. Each entry drives both the card in the grid and the slide-in modal panel. Featured cards span 2 columns via `featured: true`. The modal renders `media` slots (placeholders until real images/video are added), a `desc` array of paragraphs, `highlights` bullet points, `stack` tags, and `actions` links.
