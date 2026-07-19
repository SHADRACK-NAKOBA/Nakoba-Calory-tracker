# Nakoba Calorie Tracker

## Project Purpose
A calorie tracking app. Users log food and track daily calorie intake.
Food photos can be analyzed via Google's Gemini API to automatically
estimate calories, a healthiness rating, and a portion recommendation.

## Tech Stack
- Node.js + Express (backend/API server)
- Vanilla HTML/CSS/JS (frontend, no framework)
- Google Gemini API — `@google/generative-ai` is in use; `POST /api/analyze-food`
  in `server.js` accepts a base64 image and returns structured JSON.
- Security: `helmet` (CSP allows inline script/style since `index.html` is
  self-contained), `cors` (same-origin only unless `ALLOWED_ORIGIN` is set),
  and `express-rate-limit` on `/api/analyze-food` (100 requests / 15 min).

## Folder Structure
As the project grows, expect this layout:

```
k21-calorie-tracker/
├── server.js          # Express app entry point
├── public/            # Static frontend assets
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .env                # API keys (never commit, never read in chat)
├── .gitignore
└── package.json
```

## Key Commands
- `npm install` — install dependencies
- `npm start` — run the server

## Coding Conventions
- Use ES modules (`import`/`export`), not CommonJS (`require`).
- Use `async`/`await` for asynchronous code, not raw `.then()` chains.
- No external CSS frameworks (no Bootstrap/Tailwind) — plain, hand-written CSS.
- Keep the frontend dependency-free (no React/Vue/etc.) — plain HTML/CSS/JS.
- Prefer small, focused modules over large monolithic files.

## Important Rule
**NEVER read, edit, display, or print the contents of `.env` in chat output,
logs, or commits.** Only reference it by filename or describe its expected
keys (e.g. "set `GEMINI_API_KEY` in `.env`"). Treat its contents as secret at
all times.
