# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RumiAR is a university research fair AR experience app. Users select 3D avatar mascots, view them in AR via Google Model Viewer, capture/upload photos, and browse a real-time gallery. Built for Instituto Superior Tecnológico Universitario Rumiñahui.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

## Tech Stack

- **React 19** (JSX, hooks, no TypeScript)
- **Vite** (rolldown-vite 7.2.5) with @vitejs/plugin-react
- **Firebase 12.6.0** — Firestore (collection: `galeria`) + Storage (path: `fotos_feria/`)
- **Google Model Viewer 3.3.0** — loaded from CDN in `index.html`, provides WebXR/Scene Viewer/Quick Look AR
- **Plain CSS** — per-component CSS files, no framework

## Architecture

**View routing** is handled via `useState` in `App.jsx` — three views: `menu`, `ar`, `gallery`. No router library.

**Component tree:**
```
App.jsx (view state + selectedAvatar state)
├── AvatarMenu.jsx    → Avatar selection grid, hardcoded avatar config array
├── ArExperience.jsx  → Model Viewer 3D display, photo upload with canvas compression/watermarking
└── Gallery.jsx       → Real-time Firestore gallery, admin mode for deletion
```

**Data flow:** Avatar selection in AvatarMenu passes avatar object up to App, which passes it down to ArExperience. Firebase is used for persistent photo storage only — no auth, no user accounts.

**3D assets:** GLB models and PNG previews live in `/public` (e.g., `ruCientifico.glb`). Model Viewer is used as a web component (`<model-viewer>` tag in JSX).

## Key Implementation Details

- **Image processing** (ArExperience.jsx): Canvas-based JPEG compression (max 1920px, 0.90 quality), watermark overlay from `/logo-instituto.png`, procedural snow effect for special Christmas avatars
- **File validation**: JPG/PNG/WEBP only, max 10MB
- **Gallery real-time sync**: Uses Firestore `onSnapshot` listener
- **Admin mode** in Gallery: password-protected photo deletion
- **Firebase config** is in `src/firebase-config.js` (public frontend keys, not secrets)
- **Styling**: Purple gradient theme (#667eea → #764ba2), mobile-first, desktop capped at 600px for menu/ar views

## Avatar Config

Defined in `AvatarMenu.jsx`. Each avatar has: `name`, `file` (GLB path), `img` (PNG preview), `description`, `color` (CSS accent). Special avatars have `isSpecial: true` and `snowEffect: true` for Christmas overlays.
