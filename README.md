# Nakoba Calorie Tracker

A calorie tracking app built with Node.js, Express, and vanilla HTML/CSS/JS. Log meals manually or by snapping a food photo analyzed by Google's Gemini Vision API, track daily calorie intake against a goal, and review a weekly history chart plus a daily insight.

**Live at:** https://nakoba-calory-tracker.onrender.com (Render free tier — first request after idling takes ~30-50s to wake up)

Built end-to-end with Claude Code across three phases, then hardened for production. Full click-by-click build log, production steps, and every error hit along the way: see [NAKOBA_IMPLEMENTATION.md](NAKOBA_IMPLEMENTATION.md).

## Features

| Feature | Status |
|---|---|
| Add/edit/delete meals, daily goal, progress bar | ✅ (localStorage, client-side) |
| Weekly history chart | ✅ |
| Daily insight (calories vs goal, avg healthiness, suggestion) | ✅ |
| Snap Your Food — upload or webcam photo analyzed by Gemini | ✅ |
| UI animations + accessibility (ARIA, keyboard, WCAG AA contrast) | ✅ |
| Security hardening (helmet, CORS, rate limiting) | ✅ |
| CI (GitHub Actions) | ✅ |
| Deployment (Render) | ✅ Live |

## Tech stack

- **Backend:** Node.js + Express (ES modules, `async`/`await`)
- **Frontend:** Vanilla HTML/CSS/JS — no framework, no CSS library, one self-contained `public/index.html`
- **AI:** Google Gemini API (`@google/generative-ai`, model `gemini-2.5-flash`) for food-photo analysis
- **Security:** `helmet`, `cors`, `express-rate-limit`
- **Storage:** Browser `localStorage` for meals/goals (no database)
- **CI:** GitHub Actions (`.github/workflows/ci.yml`)

## Project structure

```
k21-calorie-tracker/
├── server.js                  # Express app + POST /api/analyze-food
├── public/
│   └── index.html              # Entire frontend UI, inline CSS/JS
├── .github/workflows/ci.yml    # GitHub Actions CI
├── .env                        # GEMINI_API_KEY — never committed
├── .gitignore
├── package.json
├── CLAUDE.md                   # Coding conventions for AI-assisted development
├── README.md                   # This file
└── NAKOBA_IMPLEMENTATION.md    # Step-by-step build + production guide
```

## Getting started

1. Clone the repo:
   ```
   git clone https://github.com/SHADRACK-NAKOBA/Nakoba-Calory-tracker.git
   cd Nakoba-Calory-tracker
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the project root:
   ```
   GEMINI_API_KEY=your-api-key-here
   PORT=3000
   ```
   Get a free key at https://aistudio.google.com/ (see NAKOBA_IMPLEMENTATION.md for exact steps).
4. Start the server:
   ```
   npm start
   ```
5. Open `http://localhost:3000`.

## Coding conventions

- ES modules (`import`/`export`), not CommonJS.
- `async`/`await` for asynchronous code.
- No external CSS frameworks — plain, hand-written CSS.
- No frontend framework — plain HTML/CSS/JS.

Full conventions in [CLAUDE.md](CLAUDE.md).

## Security note

`.env` holds `GEMINI_API_KEY` and must never be committed, printed, or shared — it's excluded via `.gitignore` and is never read or logged by this codebase's tooling.

## Author

**Shadrack Nakoba** — sole author and maintainer.
