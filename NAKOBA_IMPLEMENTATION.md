# Nakoba Calorie Tracker — Step-by-Step Implementation & Production Guide

This is the real, click-by-click record of how this app was built with Claude Code, from an empty folder to a security-hardened, CI-checked app ready for production — plus every error actually hit along the way and how it was fixed. Not a generic tutorial: this is what happened in this build.

---

## Phase 0 — One-time setup

### 0.1 Verify Node.js

```
node --version
npm --version
```
Confirmed: `v24.13.0` / `11.13.0` (need v18+).

### 0.2 Get a free Gemini API key (click by click)

This step can only be done by the account owner in a browser — no CLI or agent can do it for you.

1. Open **https://aistudio.google.com/** in your browser.
2. **Sign in** with your Google account.
3. Click **Get API key** (top of the page or left sidebar).
4. Click **Create API key**.
5. If prompted, choose **Create API key in new project** (or select an existing Google Cloud project).
6. A key appears, starting with `AIzaSy...`. Click the copy icon.
7. Do **not** paste it into any chat — open your project's `.env` file yourself and replace the placeholder line:
   ```
   GEMINI_API_KEY=your-api-key-here
   ```
   with your real key, then save the file.

### 0.3 Create the project folder

```
mkdir k21-calorie-tracker
cd k21-calorie-tracker
code .
```

### 0.4 Initial scaffold

Three files created first, before any app code:

- **`.env`** — placeholder `GEMINI_API_KEY=your-api-key-here` (real key added by hand in step 0.2.7, never typed into chat)
- **`.gitignore`** — excludes `.env`, `node_modules/`, OS files, logs, build output, editor folders, and (added later) local AI-assistant session files (`.claude/*.local.*`, `.playwright-mcp/`)
- **`CLAUDE.md`** — project purpose, tech stack, folder structure, key commands, coding conventions, and the hard rule: never read/print/commit `.env`

```
git init
git add .
git commit -m "Initial scaffold: .env (template), .gitignore, CLAUDE.md"
git status   # confirms .env is NOT tracked
```

---

## Phase 1 — Basic textual tracker (no AI)

Built `server.js` (static Express server) and `public/index.html` (single file, all CSS/JS inline) with:
- Header with title + today's date
- Daily Summary card: calories consumed vs. editable goal, progress bar
- Add Meal form: name, calories, type (breakfast/lunch/dinner/snack)
- Today's Meals list with delete
- Weekly History bar chart (vanilla JS, last 7 days)
- All meal/goal data persisted in `localStorage`

```
npm install
npm start
```
Opened `http://localhost:3000`, verified: add a meal → summary updates → refresh → data persists → delete works → resized window for mobile check.

Committed and tagged:
```
git commit -m "Phase 1 complete: working textual calorie tracker"
git tag phase-1-done
```

---

## Phase 2 — Gemini Vision food analysis

**Backend** (`server.js`):
- Added `dotenv` and `@google/generative-ai`
- `POST /api/analyze-food` — accepts `{ image: "data:<mime>;base64,<data>" }`, validates size ≤ 4MB, calls Gemini, returns:
  `{ food_name, estimated_calories, healthiness_rating (1-5), portion_recommendation, confidence, notes }`
- Response is coerced/clamped server-side so a malformed model reply never reaches the client
- Errors caught and returned as a generic `502` — never leaks the API key or raw SDK errors

**Frontend** (`public/index.html`):
- New "Snap Your Food" section: file upload + webcam capture (`getUserMedia` + `<canvas>`)
- Loading spinner while calling the endpoint
- Result card: food name, calorie estimate, 1-5 star rating, portion tip, confidence badge
- "Add to Today" button pre-fills and submits the existing Add Meal form (`mealForm.requestSubmit()` — reuses the same handler, no duplicated logic)
- The returned `healthiness_rating` is stored on the meal as `healthinessRating` for later use

Committed and tagged:
```
git commit -m "Phase 2 complete: Gemini AI image recognition for calories"
git tag phase-2-done
```

---

## Phase 3 — Autonomous iteration with the Ralph Loop plugin

Started via the `ralph-loop` skill with `--max-iterations 5` and three goals in priority order: daily insight → UI polish/animations → accessibility.

- **Iteration 1:** Added the daily insight line (calories vs goal, average healthiness rating, rule-based suggestion for tomorrow), computed client-side from `localStorage`.
- **Iteration 2:** Fade-in on meal add, fade/collapse-out on delete (respecting `prefers-reduced-motion`), mobile spacing refinements.
- **Iteration 3:** ARIA attributes (`aria-live`, `role="status"/"alert"`, `aria-expanded`, `aria-label`), visible `:focus-visible` states, and — after actually computing WCAG contrast ratios — darkened the palette (green `#2f9e6e→#1c7550`, orange `#f0924a→#a8511a`, muted `#6b7d73→#566860`, snack badge purple) since the originals failed AA 4.5:1 for button text and badges.
- **Iterations 4-5:** Regression verification only (all three goals were already done) — `node --check`, live server tests of every route, a real Gemini call, and a full read-through of the touched code. No further changes needed.

```
git tag phase-3-done
```

---

## Security hardening

Added to `server.js`:
- **`helmet`** — CSP, HSTS, X-Frame-Options, etc. CSP explicitly allows inline `<script>`/`<style>` since `index.html` is one self-contained file with no external assets.
- **`cors`** — same-origin only by default (`origin: process.env.ALLOWED_ORIGIN || false`)
- **`express-rate-limit`** — 100 requests / 15 min on `/api/analyze-food` specifically, since that's the endpoint that costs Gemini quota

Verified by inspecting actual response headers and re-running the Gemini smoke test to confirm nothing broke.

---

## CI/CD

Added `.github/workflows/ci.yml` — on every push/PR to `master`/`main`: checks out the repo, installs Node 20, runs `npm ci`, runs `node --check server.js`. Visible under the **Actions** tab on GitHub.

---

## Moving this to production

### Push to GitHub

```
git remote add origin https://github.com/SHADRACK-NAKOBA/Nakoba-Calory-tracker.git
git push -u origin master
git push origin phase-1-done phase-2-done phase-3-done
```

### Deploy to Render (click by click)

1. Go to **https://dashboard.render.com/** and sign in (GitHub login works).
2. **New** → **Web Service**.
3. Connect your GitHub account if prompted, then select the `Nakoba-Calory-tracker` repo.
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free tier is enough for this app
5. Under **Environment Variables**, add `GEMINI_API_KEY` = your real key (never commit it — only ever set it here and in your local `.env`).
6. Click **Create Web Service**. Render builds and deploys, giving you a public URL.
7. Every future push to `master` auto-redeploys.

**Note on Render's free tier:** the service spins down after inactivity, so the first request after idling takes ~30-50 seconds to wake up ("cold start"). This is expected, not a bug.

**Status: deployed and verified live** at https://nakoba-calory-tracker.onrender.com — confirmed with real requests against production: home page returns `200` with the correct title, Helmet's CSP/HSTS headers are present, `/api/analyze-food` correctly validates input (`400`, not a `500` "missing key" error — confirming `GEMINI_API_KEY` is set correctly in Render's environment), and a real Gemini call round-trips successfully end-to-end.

---

## Errors encountered and fixes (real, from this build)

### 1. Renaming/moving the project folder failed: "Device or resource busy" / "in use"
- **Cause:** the folder is the fixed working directory of the whole coding session (and, separately, of a stray persistent shell) — Windows locks a directory that's any process's current working directory, so a plain `mv`/`Rename-Item` can't touch it.
- **Fix:** instead of moving the live folder, **copied** its full contents (including `.git` history) to a sibling archive folder with `Copy-Item -Recurse`, verified the copy with `git log`/`git status` inside it, then deleted only the *contents* of the live folder (not the folder itself) to get a genuinely blank starting point at the same path.

### 2. `EADDRINUSE: address already in use :::3000`
- **Cause:** a Node server from an earlier test was still running in the background when a new one was started.
- **Fix:** `Get-CimInstance Win32_Process | Where-Object { Name -eq 'node.exe' }` to list actual node processes, then `Stop-Process -Force` on the right PID before restarting.

### 3. A process-kill command accidentally hit VS Code's TypeScript server
- **Cause:** a wildcard filter `CommandLine -like "*server.js*"` matched not just `node server.js` but also VS Code's `tsserver.js` language server (substring match).
- **Fix:** tightened the filter to an exact/anchored match (`-eq "node server.js"` / `-like "*node server.js"`). VS Code auto-restarts its TS server on its own, so no lasting damage, but this is a reminder to scope process filters narrowly.

### 4. Gemini call failed: `404 Not Found — models/gemini-1.5-flash is not found`
- **Cause:** `gemini-1.5-flash` (the model name used in most tutorials) has been deprecated/retired for this API key's account.
- **Fix:** queried `GET https://generativelanguage.googleapis.com/v1beta/models?key=...` to list models actually available for the key, and switched to `gemini-2.5-flash` (a current, non-preview, vision-capable model). Verified with a real end-to-end Gemini call before committing.

### 5. Original color palette failed WCAG AA contrast
- **Cause:** the green/orange accent colors and muted gray text looked fine visually but measured below the required 4.5:1 ratio for normal text when actually computed (e.g. white button text on the orange gradient measured 2.36:1).
- **Fix:** computed real contrast ratios (relative luminance formula) for every text/background combination in use, then darkened just enough to clear 4.5:1 everywhere (buttons, badges, muted captions) while keeping the same green-to-orange theme.

### 6. Ralph Loop skill invocation failed: "Contains subshell"
- **Cause:** the prompt text contained parentheses like `(1)`, `(2)`, `(3)` and literal newlines, which the shell-based permission checker misread as subshell syntax (`(...)`).
- **Fix:** rewrote the prompt as a single line, replacing numbered parenthetical markers with plain words ("First, ... Second, ... Third, ...").

### 7. `git push --force-with-lease` was rejected: "stale info"
- **Cause:** `--force-with-lease` needs a known remote-tracking ref to compare against, but this was a freshly re-initialized local repo with no prior fetch, so it had no baseline to check against.
- **Fix:** ran `git ls-remote origin` first to confirm exactly what commit the remote was actually at (and that nothing unexpected had been pushed there), then used a plain `git push --force` since the overwrite was already deliberate and confirmed.

### 8. `curl` returned exit code 7 / status `000` right after starting the server
- **Cause:** a background `npm start &` doesn't finish binding to the port instantly; the very next command sometimes ran before the port was open.
- **Fix:** added a short retry/`sleep` before the request, or simply re-ran the same `curl` — a transient timing issue, not a real bug.

---

## Useful commands reference

```
npm install              # install dependencies
npm start                # run the server (http://localhost:3000)
node --check server.js   # syntax-check the backend
git tag                  # list phase checkpoints
git log --oneline         # see build history
```
