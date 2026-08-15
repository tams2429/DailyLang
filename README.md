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

Copy `backend/.env.example` to `backend/.env` and add a free Gemini API key
from https://aistudio.google.com/apikey if you want to generate new scenarios
(the preprogrammed phrases work fine without it).

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

- `GET /api/phrases` — list all phrases (preprogrammed + previously generated)
- `GET /api/phrases/daily` — deterministic "phrase of the day"
- `GET /api/phrases/:id` — fetch a single phrase
- `POST /api/phrases/:id/responses` — submit a practice response `{ text }`
- `GET /api/phrases/:id/responses` — list past responses for a phrase (in-memory, resets on restart)
- `POST /api/phrases/generate` — generate phrases for a scenario via the Gemini API, or return them from cache. Body: `{ scenario, label?, force? }`
- `GET /api/scenarios/generated` — list scenarios previously generated via the LLM
- `GET /audio/:file` — serves audio files from `backend/public/audio`

## Adding audio

Phrases are defined in [backend/src/data/phrases.ts](backend/src/data/phrases.ts).
Drop matching `.mp3` files into `backend/public/audio/` (see the README there)
to enable playback for each phrase.

## Generating new scenarios with Gemini

Beyond the preprogrammed scenarios, you can request new ones (e.g. "job
interview") from the search box in the app. The backend:

1. Slugifies the scenario name and checks `backend/data/generated-phrases.json`
   for a cached result.
2. If not cached (or "Regenerate" is used), calls the free-tier Gemini API
   (`gemini-2.0-flash`) to generate a set of phrases matching the app's
   `Phrase` shape, using structured JSON output.
3. Saves the result to the JSON cache file and merges it into the in-memory
   phrase list, so subsequent requests for that scenario are served instantly
   without calling the API again.

This requires a `GEMINI_API_KEY` in `backend/.env` (see `.env.example`).
Google AI Studio offers a free tier suitable for personal use; check current
rate limits at https://ai.google.dev/pricing.
