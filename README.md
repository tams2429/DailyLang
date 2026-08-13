# DailyLang

A simple web app for practicing Japanese with daily phrases: listen to
preprogrammed phrases and practice writing responses.

## Stack

- **Frontend**: React + Vite + Tailwind CSS + Zustand
- **Backend**: Bun (self-contained HTTP server, no framework, no database)

## Project structure

```
dailyLang/
  frontend/   Vite React app (port 5173)
  backend/    Bun HTTP server (port 4000)
```

## Getting started

Install dependencies (run once from the repo root, or in each folder):

```bash
bun install
```

Run the backend:

```bash
cd backend
bun run dev
```

Run the frontend (in a separate terminal):

```bash
cd frontend
bun run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` and `/audio`
requests to the backend on port 4000.

## Backend API

- `GET /api/phrases` — list all preprogrammed phrases
- `GET /api/phrases/daily` — deterministic "phrase of the day"
- `GET /api/phrases/:id` — fetch a single phrase
- `POST /api/phrases/:id/responses` — submit a practice response `{ text }`
- `GET /api/phrases/:id/responses` — list past responses for a phrase (in-memory, resets on restart)
- `GET /audio/:file` — serves audio files from `backend/public/audio`

## Adding audio

Phrases are defined in [backend/src/data/phrases.ts](backend/src/data/phrases.ts).
Drop matching `.mp3` files into `backend/public/audio/` (see the README there)
to enable playback for each phrase.
