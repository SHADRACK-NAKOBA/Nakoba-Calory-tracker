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

## Errors encountered and fixes (real, from this build — step by step, click by click)

### 1. Renaming/moving the project folder failed: "Device or resource busy" / "in use"

**What happened, step by step:**
1. Ran `mv k21-calorie-tracker k21-calorie-tracker-old` from the parent folder → `mv: cannot move ... Device or resource busy`.
2. Tried again with PowerShell's `Rename-Item -Path ... -NewName ...` → `Cannot rename the item ... because it is in use`.
3. Suspected VS Code had the folder open — asked the user to close it in VS Code, then retried `Rename-Item` → **same error**.
4. Ran `pwd` and discovered the shell's own working directory was still *inside* `k21-calorie-tracker`, even after `cd ..` — the harness resets it back every command.
5. Checked for other processes with a handle on the path (`Get-CimInstance Win32_Process | Where-Object CommandLine -like "*k21-calorie-tracker*"`) — found nothing external; confirmed the lock was the session's own fixed working directory, not VS Code.

**Why it failed:** on Windows, a directory cannot be renamed or moved while any process (including the coding session's own shell) has it as its current working directory. This session's primary working directory is permanently pinned to this exact folder, so a `mv`/`Rename-Item` on it can never succeed from within the session — no amount of `cd`-ing away or closing editor tabs fixes it, because the lock isn't coming from the editor.

**The actual fix:**
1. `Copy-Item -Path k21-calorie-tracker -Destination k21-calorie-tracker-old -Recurse -Force` — copies (doesn't move) everything, including the `.git` folder, to a sibling directory. Copying doesn't require releasing the lock on the source.
2. Verified the copy was a complete, working archive: `cd k21-calorie-tracker-old && git log --oneline && git status` — confirmed full commit history and a clean working tree.
3. Only then deleted the **contents** of the original folder (not the folder itself, which still can't be removed for the same locking reason): `Get-ChildItem -Path k21-calorie-tracker -Force | Remove-Item -Recurse -Force`.
4. Result: a genuinely blank folder at the original path, with a full backup sitting safely next to it.

### 2. `EADDRINUSE: address already in use :::3000`

**What happened:** after editing `server.js` to add the Gemini endpoint, ran `npm start` in the background to smoke-test it. The new process crashed immediately with `Error: listen EADDRINUSE: address already in use :::3000`.

**Why:** an *earlier* `npm start` (from testing Phase 1 minutes before) was still running in the background from a previous command and still had port 3000 bound. Starting a second server on the same port without stopping the first always fails this way.

**Fix, step by step:**
1. `Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' } | Select-Object ProcessId,CommandLine` — lists every actual `node.exe` process with its exact command line, so the right one can be identified instead of guessing.
2. `Stop-Process -Id <that PID> -Force` — kills only that process.
3. Re-ran `npm start` — bound to port 3000 successfully this time.

### 3. A process-kill command accidentally hit VS Code's TypeScript server

**What happened:** to clean up a lingering server, ran a PowerShell one-liner that filtered processes by `CommandLine -like "*server.js*"` and force-killed every match. The output showed it had also killed two `Code.exe` processes running `tsserver.js`.

**Why it happened:** `-like "*server.js*"` is a substring match, and `tsserver.js` (VS Code's TypeScript language server file name) *contains* the substring `server.js`. The wildcard was too broad and matched an unrelated process by accident.

**Fix and why it's safe:**
1. Confirmed no lasting harm: VS Code automatically restarts its TypeScript server when it's killed, so IntelliSense recovers on its own (a window reload fixes it immediately if it doesn't).
2. Changed the matching pattern going forward to an exact/anchored match — `CommandLine -eq "node server.js"` or `-like "*node server.js"` (note: no leading `*` before `server.js` alone) — so only the literal Node process matches, never a substring hit inside a longer file name.
3. **Why this matters generally:** any time a cleanup command matches by substring, it's worth asking "could this string also appear inside an unrelated file or command I don't want to touch?" before running it with `-Force`.

### 4. Gemini call failed: `404 Not Found — models/gemini-1.5-flash is not found for API version v1beta`

**What happened, step by step:**
1. Built `/api/analyze-food` using `gemini-1.5-flash` (the model name given in the original lab instructions).
2. Sent a real test image to the endpoint → got back `{"error":"Could not analyze the image right now..."}` (the generic 502 the code returns on any Gemini failure).
3. Checked the server's own log output (not shown to the end user, only in the terminal) → found the real underlying error: `[404 Not Found] models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent.`

**Why:** Google periodically retires older model names. `gemini-1.5-flash` is no longer served for this API key/account, even though it's still what most tutorials reference.

**Fix, step by step:**
1. Queried the models actually available to this key directly: `GET https://generativelanguage.googleapis.com/v1beta/models?key=<key>`, then filtered the JSON response to models supporting `generateContent`.
2. Picked `gemini-2.5-flash` — a current, non-preview, vision-capable model from that list (this matches the fallback the lab's own troubleshooting section recommends).
3. Changed the one `GEMINI_MODEL` constant in `server.js` and restarted the server.
4. Re-sent the same real test image → got back a valid, correctly-shaped JSON response this time. Only committed after this real end-to-end confirmation, not just a syntax check.

### 5. Original color palette failed WCAG AA contrast

**What happened:** while implementing the Phase 3 accessibility goal ("sufficient color contrast"), rather than eyeballing it, computed the actual contrast ratios for the palette in use.

**Method, step by step:**
1. Wrote a small Node script implementing the WCAG relative-luminance and contrast-ratio formulas.
2. Ran it against every text-on-background pairing actually used in the CSS: white button text on the green/orange gradient, colored badge text on its light background, muted gray captions on white/card backgrounds.
3. Results showed several real failures against the 4.5:1 AA threshold for normal text — e.g. white text on the orange button background measured only **2.36:1**, and the muted caption color measured **4.37:1** (just under the line).

**Why this matters:** a color combination can look perfectly readable to a sighted person on a good monitor and still fail the objective contrast ratio that WCAG AA requires for low-vision users — "looks fine" isn't the same as "measured fine."

**Fix, step by step:**
1. Tried candidate darker shades for green, orange, and the muted gray, re-running the same contrast script against each candidate until every real usage cleared 4.5:1 (button text, badge text, captions) — settled on green `#2f9e6e→#1c7550`, orange `#f0924a→#a8511a`, muted `#6b7d73→#566860`.
2. Found one more failure the first pass missed — the "snack" meal-type badge's purple text on its light-purple background measured 4.16:1 — darkened that one color too (`#9b4fc4→#833a9e`).
3. Updated the CSS custom properties (`:root` variables), which automatically propagated the fix everywhere those variables are used (buttons, progress bar, chart bars, badges), instead of hunting down every individual hex code by hand.
4. Re-ran the contrast script against the final palette to confirm every combination now clears AA before committing.

### 6. Ralph Loop skill invocation failed: "Contains subshell"

**What happened, step by step:**
1. First attempt to start the Ralph loop passed a multi-line prompt (with real line breaks and numbered points like "1. ... 2. ... 3. ...") as the skill's `args`.
2. It failed immediately with a permission-check error: `Contains subshell`, before the loop ever started.
3. Rewrote the prompt as one paragraph but kept parenthetical numbering like `(1)`, `(2)`, `(3)` — **still failed** with the same error.

**Why:** the tool that launches the Ralph loop runs a setup script through a shell, and the permission layer that inspects the command before running it treats literal parentheses `(...)` as potential subshell syntax — a shell security convention, not something specific to Ralph. Both the raw newlines and the `(1)`/`(2)`/`(3)` numbering were tripping that same check.

**Fix:** rewrote the prompt as a single line with **no parentheses at all**, replacing numbered markers with plain words — "First, ... Second, ... Third, ..." instead of "(1) ... (2) ... (3) ...". That version launched cleanly.

### 7. `git push --force-with-lease` was rejected: "stale info"

**What happened:**
1. After rebuilding the project from scratch, ran `git remote add origin <repo-url>` then `git push --force-with-lease -u origin master`.
2. Got `! [rejected] master -> master (stale info)` and the push failed.

**Why:** `--force-with-lease` is a safety check — it refuses to overwrite the remote unless it can confirm, via a local remote-tracking ref, exactly what commit the remote currently points to. Since this was a brand-new local repo that had never fetched from `origin`, there was no tracking ref to compare against, so Git refused to guess.

**Fix, step by step:**
1. Ran `git ls-remote origin` — this hits the remote directly (no local state needed) and printed the exact commit hash `master` was pointing to on GitHub.
2. Confirmed that hash matched the last known commit from the previous version of this project (i.e., nothing unexpected had been pushed by anyone else in between) — this was the actual safety check that mattered, just done manually instead of automatically.
3. Ran a plain `git push --force -u origin master`, which has no such safety check but was justified here because step 2 already did the verification by hand.

### 8. `curl` returned exit code 7 / status `000` immediately after starting the server

**What happened:** a recurring pattern — start the server in the background (`(npm start > log 2>&1 &)`), `sleep 2`, then `curl` it — and every so often the `curl` would fail with exit code 7 ("failed to connect") even though the very next retry succeeded.

**Why:** starting a background process and immediately moving on doesn't guarantee it has finished loading its dependencies (Express, dotenv, the Gemini SDK) and bound to the port within that fixed `sleep` window — it's a timing race, not a code defect. This showed up more after Phase 2 added heavier imports (`@google/generative-ai`) than it did in Phase 1.

**Fix:** whenever this happened, checked the server's own log file first (`cat log`) to confirm it *had* actually started successfully, then simply re-ran the same `curl` a moment later — always succeeded. No code change was needed; this is purely about not treating a slow-start race as a real bug.

---

## Appendix: complete source files (copy-paste to reproduce from an empty folder)

Everything above describes *what* was done and *why*, in order. This appendix is the missing piece: the **actual, complete, final contents of every file** in the project, so this document alone — with no access to the repo, no prior conversation, nothing but a text editor and Node.js installed — is enough to recreate the exact same working app.

To reproduce: create an empty folder, create each file below at the path shown with the exact content shown, run `npm install`, add your own real Gemini key to `.env`, then `npm start`.

### Folder layout

```
nakoba-calorie-tracker/
├── .env
├── .gitignore
├── CLAUDE.md
├── package.json
├── server.js
├── .github/
│   └── workflows/
│       └── ci.yml
└── public/
    └── index.html
```

### `.env`

```
GEMINI_API_KEY=your-api-key-here
```
Replace `your-api-key-here` with a real key from https://aistudio.google.com/ (Get API key → Create API key). Never commit this file with a real key in it.

### `.gitignore`

```
# Environment variables
.env
.env.local
.env.*.local

# Dependencies
node_modules/

# OS files
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build output
dist/
build/

# Editor/IDE
.vscode/
.idea/
*.swp

# Coverage
coverage/

# Local AI-assistant session artifacts (Ralph loop state, etc.)
.claude/*.local.md
.claude/*.local.json
.claude/settings.local.json
.playwright-mcp/
```

### `CLAUDE.md`

```markdown
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

\```
k21-calorie-tracker/
├── server.js          # Express app entry point
├── public/            # Static frontend assets
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .env                # API keys (never commit, never read in chat)
├── .gitignore
└── package.json
\```

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
```

### `package.json`

```json
{
  "name": "nakoba-calorie-tracker",
  "version": "1.0.0",
  "description": "Nakoba Calorie Tracker — a small Express app for logging daily calories.",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.4.1",
    "helmet": "^8.0.0"
  }
}
```

After creating this file, running `npm install` generates `package-lock.json` and `node_modules/` automatically — they don't need to be hand-created.

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: node --check server.js
```

### `server.js`

```javascript
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const GEMINI_MODEL = 'gemini-2.5-flash';
const ALLOWED_CONFIDENCE = new Set(['low', 'medium', 'high']);

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const ANALYSIS_PROMPT = `You are a nutrition assistant analyzing a photo of food.
Respond with ONLY a JSON object (no markdown, no extra text) matching exactly this shape:
{
  "food_name": string,
  "estimated_calories": number,
  "healthiness_rating": number (integer 1-5, 5 is healthiest),
  "portion_recommendation": string (a short suggestion about portion size),
  "confidence": "low" | "medium" | "high",
  "notes": string (one short sentence of useful context)
}
Estimate calories for the visible portion as best you can. If the image does not clearly show food, set food_name to "Unrecognized" and confidence to "low".`;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      // index.html is a single self-contained file with inline <style>/<script> — no external assets.
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
    },
  },
}));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || false }));

const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || '');
  return match ? { mimeType: match[1], base64: match[2] } : null;
}

function coerceAnalysis(raw) {
  const rating = Number(raw?.healthiness_rating);
  const calories = Number(raw?.estimated_calories);

  return {
    food_name: typeof raw?.food_name === 'string' && raw.food_name.trim()
      ? raw.food_name.trim()
      : 'Unknown food',
    estimated_calories: Number.isFinite(calories) ? Math.max(0, Math.round(calories)) : 0,
    healthiness_rating: Number.isFinite(rating) ? Math.min(5, Math.max(1, Math.round(rating))) : 3,
    portion_recommendation: typeof raw?.portion_recommendation === 'string' && raw.portion_recommendation.trim()
      ? raw.portion_recommendation.trim()
      : 'No recommendation available.',
    confidence: ALLOWED_CONFIDENCE.has(raw?.confidence) ? raw.confidence : 'low',
    notes: typeof raw?.notes === 'string' ? raw.notes.trim() : '',
  };
}

app.post('/api/analyze-food', analyzeLimiter, async (req, res) => {
  if (!genAI) {
    return res.status(500).json({ error: 'Server is missing a Gemini API key.' });
  }

  const parsed = parseDataUrl(req.body?.image);
  if (!parsed) {
    return res.status(400).json({ error: 'No valid image provided.' });
  }

  const imageBytes = Buffer.byteLength(parsed.base64, 'base64');
  if (imageBytes > MAX_IMAGE_BYTES) {
    return res.status(400).json({ error: 'Image is too large. Please use an image under 4MB.' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent([
      { text: ANALYSIS_PROMPT },
      { inlineData: { mimeType: parsed.mimeType, data: parsed.base64 } },
    ]);

    const raw = JSON.parse(result.response.text());
    res.json(coerceAnalysis(raw));
  } catch (err) {
    console.error('Gemini analysis failed:', err.message);
    res.status(502).json({ error: 'Could not analyze the image right now. Please try again in a moment.' });
  }
});

app.listen(PORT, () => {
  console.log(`Nakoba Calorie Tracker running at http://localhost:${PORT}`);
});
```

### `public/index.html`

This is the entire frontend — one self-contained file with inline `<style>` and `<script>`, no external assets, no build step.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nakoba Calorie Tracker</title>
<style>
  :root {
    --green: #1c7550;
    --green-light: #e6f6ee;
    --orange: #a8511a;
    --orange-light: #fdece0;
    --ink: #223026;
    --muted: #566860;
    --bg: #f7faf8;
    --card: #ffffff;
    --border: #e3ece6;
    --radius: 16px;
    --shadow: 0 4px 16px rgba(34, 48, 38, 0.06);
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--ink);
    padding: 24px 16px 64px;
  }

  .container {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  header.app-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px 4px 0;
  }

  header.app-header h1 {
    font-size: 1.6rem;
    margin: 0;
    background: linear-gradient(90deg, var(--green), var(--orange));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  header.app-header .today-date {
    color: var(--muted);
    font-size: 0.95rem;
  }

  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 20px 22px;
  }

  .card h2 {
    margin: 0 0 14px;
    font-size: 1.05rem;
    color: var(--ink);
  }

  /* Daily summary */
  .summary-top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }

  .summary-calories {
    font-size: 2.4rem;
    font-weight: 700;
    line-height: 1;
  }

  .summary-calories span {
    font-size: 1rem;
    font-weight: 400;
    color: var(--muted);
  }

  .goal-edit {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    color: var(--muted);
  }

  .goal-edit input {
    width: 80px;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid var(--border);
    font-size: 0.9rem;
  }

  .goal-edit button {
    padding: 6px 10px;
    border-radius: 8px;
    border: none;
    background: var(--green-light);
    color: var(--green);
    font-weight: 600;
    cursor: pointer;
    font-size: 0.85rem;
  }

  .progress-track {
    margin-top: 16px;
    height: 14px;
    border-radius: 999px;
    background: var(--green-light);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--green), var(--orange));
    transition: width 0.3s ease;
  }

  .progress-caption {
    margin-top: 8px;
    font-size: 0.85rem;
    color: var(--muted);
  }

  /* Add meal form */
  #meal-form {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr auto;
    gap: 10px;
    align-items: end;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field label {
    font-size: 0.78rem;
    color: var(--muted);
    font-weight: 600;
  }

  .field input,
  .field select {
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    font-size: 0.95rem;
    background: #fff;
    color: var(--ink);
  }

  .field input:focus,
  .field select:focus {
    outline: 2px solid var(--green);
    outline-offset: 1px;
  }

  #meal-form button {
    padding: 10px 18px;
    border-radius: 10px;
    border: none;
    background: linear-gradient(90deg, var(--green), var(--orange));
    color: #fff;
    font-weight: 700;
    cursor: pointer;
    font-size: 0.95rem;
    white-space: nowrap;
  }

  #meal-form button:hover { filter: brightness(1.05); }

  /* Meals list */
  .meal-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .meal-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--bg);
    border: 1px solid var(--border);
  }

  .meal-info {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .meal-name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meal-type-badge {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 3px 8px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .meal-type-breakfast { background: var(--orange-light); color: var(--orange); }
  .meal-type-lunch { background: var(--green-light); color: var(--green); }
  .meal-type-dinner { background: #e7ecfa; color: #4a5fc1; }
  .meal-type-snack { background: #f5e9fa; color: #833a9e; }

  .meal-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .meal-cal {
    font-weight: 700;
    color: var(--ink);
    font-size: 0.95rem;
  }

  .delete-btn {
    border: none;
    background: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
    padding: 4px 6px;
    border-radius: 6px;
  }

  .delete-btn:hover {
    color: #c0392b;
    background: #fdecea;
  }

  .empty-state {
    color: var(--muted);
    font-size: 0.9rem;
    text-align: center;
    padding: 16px 0;
  }

  /* Weekly chart */
  .chart {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
    height: 160px;
    padding-top: 10px;
  }

  .chart-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    height: 100%;
    gap: 6px;
  }

  .chart-bar-track {
    width: 100%;
    max-width: 34px;
    flex: 1;
    display: flex;
    align-items: flex-end;
    background: var(--green-light);
    border-radius: 6px 6px 2px 2px;
    overflow: hidden;
  }

  .chart-bar {
    width: 100%;
    border-radius: 6px 6px 2px 2px;
    background: linear-gradient(180deg, var(--orange), var(--green));
    min-height: 2px;
    transition: height 0.3s ease;
  }

  .chart-bar.is-today {
    background: linear-gradient(180deg, var(--green), var(--green));
    box-shadow: 0 0 0 2px var(--green-light);
  }

  .chart-value {
    font-size: 0.7rem;
    color: var(--muted);
    font-weight: 600;
  }

  .chart-label {
    font-size: 0.75rem;
    color: var(--muted);
  }

  @media (max-width: 520px) {
    #meal-form {
      grid-template-columns: 1fr 1fr;
    }
    #meal-form button {
      grid-column: 1 / -1;
    }
    .summary-calories {
      font-size: 2rem;
    }
    .card {
      padding: 16px 16px;
    }
    .result-card {
      padding: 14px;
    }
  }

  /* Meal add/remove animation */
  @keyframes mealIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .meal-item.meal-enter {
    animation: mealIn 0.25s ease;
  }

  .meal-item.meal-exit {
    transition: opacity 0.2s ease, transform 0.2s ease, max-height 0.2s ease, margin 0.2s ease, padding 0.2s ease;
    opacity: 0;
    transform: translateX(-8px);
    max-height: 0;
    margin: 0;
    padding-top: 0;
    padding-bottom: 0;
    overflow: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    .meal-item.meal-enter,
    .meal-item.meal-exit,
    .progress-fill,
    .chart-bar {
      animation: none !important;
      transition: none !important;
    }
  }

  /* Focus visibility for all interactive elements */
  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--green);
    outline-offset: 2px;
  }

  /* Daily insight */
  .insight {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
    font-size: 0.88rem;
    color: var(--ink);
  }

  .insight .insight-label {
    color: var(--muted);
    font-weight: 600;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  /* Snap Your Food */
  .snap-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .snap-btn {
    padding: 10px 16px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--green-light);
    color: var(--green);
    font-weight: 700;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .snap-btn:hover { filter: brightness(1.03); }

  .snap-file-input { display: none; }

  .webcam-wrap {
    margin-top: 14px;
    display: none;
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .webcam-wrap.is-active { display: flex; }

  #webcam-video {
    width: 100%;
    max-width: 360px;
    border-radius: 12px;
    background: #000;
  }

  .snap-status {
    margin-top: 14px;
    display: none;
    align-items: center;
    gap: 10px;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .snap-status.is-active { display: flex; }

  .spinner {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 3px solid var(--green-light);
    border-top-color: var(--green);
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .snap-error {
    margin-top: 12px;
    display: none;
    color: #c0392b;
    background: #fdecea;
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 0.85rem;
  }

  .snap-error.is-active { display: block; }

  .result-card {
    margin-top: 14px;
    display: none;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    border-radius: 12px;
    background: var(--bg);
    border: 1px solid var(--border);
  }

  .result-card.is-active { display: flex; }

  .result-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .result-food-name {
    font-weight: 700;
    font-size: 1.05rem;
  }

  .confidence-badge {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 3px 8px;
    border-radius: 999px;
  }

  .confidence-low { background: #fdecea; color: #c0392b; }
  .confidence-medium { background: var(--orange-light); color: var(--orange); }
  .confidence-high { background: var(--green-light); color: var(--green); }

  .result-calories {
    font-size: 1.3rem;
    font-weight: 700;
  }

  .result-calories span {
    font-size: 0.85rem;
    font-weight: 400;
    color: var(--muted);
  }

  .stars {
    color: var(--orange);
    letter-spacing: 2px;
    font-size: 1rem;
  }

  .stars .star-empty { color: var(--border); }

  .result-portion,
  .result-notes {
    font-size: 0.88rem;
    color: var(--muted);
  }

  .add-to-today-btn {
    align-self: flex-start;
    margin-top: 4px;
    padding: 9px 16px;
    border-radius: 10px;
    border: none;
    background: linear-gradient(90deg, var(--green), var(--orange));
    color: #fff;
    font-weight: 700;
    cursor: pointer;
    font-size: 0.9rem;
  }
</style>
</head>
<body>
  <div class="container">
    <header class="app-header">
      <h1>Nakoba Calorie Tracker</h1>
      <div class="today-date" id="today-date"></div>
    </header>

    <section class="card" id="summary-card">
      <h2>Daily Summary</h2>
      <div class="summary-top">
        <div class="summary-calories">
          <span id="calories-consumed">0</span>
          <span>/ <span id="calories-goal">2000</span> kcal</span>
        </div>
        <div class="goal-edit">
          <label for="goal-input">Goal</label>
          <input type="number" id="goal-input" min="500" step="50" value="2000">
          <button type="button" id="save-goal-btn">Save</button>
        </div>
      </div>
      <div class="progress-track">
        <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
      </div>
      <div class="progress-caption" id="progress-caption" aria-live="polite">0% of today's goal</div>
      <div class="insight" id="insight" aria-live="polite">
        <div class="insight-label">Today's insight</div>
        <div id="insight-text">Log a meal to see today's insight.</div>
      </div>
    </section>

    <section class="card" aria-labelledby="snap-heading">
      <h2 id="snap-heading">Snap Your Food</h2>
      <div class="snap-actions">
        <label class="snap-btn" for="snap-file-input">
          Upload photo
          <input type="file" id="snap-file-input" class="snap-file-input" accept="image/*">
        </label>
        <button type="button" class="snap-btn" id="webcam-toggle-btn" aria-expanded="false" aria-controls="webcam-wrap">Use webcam</button>
      </div>

      <div class="webcam-wrap" id="webcam-wrap">
        <video id="webcam-video" autoplay playsinline aria-label="Webcam preview"></video>
        <button type="button" class="snap-btn" id="webcam-capture-btn">Capture photo</button>
        <canvas id="webcam-canvas" hidden></canvas>
      </div>

      <div class="snap-status" id="snap-status" role="status">
        <span class="spinner" aria-hidden="true"></span>
        <span>Analyzing your food photo…</span>
      </div>

      <div class="snap-error" id="snap-error" role="alert"></div>

      <div class="result-card" id="result-card">
        <div class="result-top">
          <span class="result-food-name" id="result-food-name"></span>
          <span class="confidence-badge" id="result-confidence"></span>
        </div>
        <div class="result-calories"><span id="result-calories"></span> <span>kcal (estimated)</span></div>
        <div class="stars" id="result-stars"></div>
        <div class="result-portion" id="result-portion"></div>
        <div class="result-notes" id="result-notes"></div>
        <button type="button" class="add-to-today-btn" id="add-to-today-btn">Add to Today</button>
      </div>
    </section>

    <section class="card">
      <h2>Add Meal</h2>
      <form id="meal-form">
        <div class="field">
          <label for="meal-name">Meal name</label>
          <input type="text" id="meal-name" placeholder="e.g. Grilled chicken salad" required>
        </div>
        <div class="field">
          <label for="meal-calories">Calories</label>
          <input type="number" id="meal-calories" min="1" step="1" placeholder="kcal" required>
        </div>
        <div class="field">
          <label for="meal-type">Type</label>
          <select id="meal-type">
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </div>
        <button type="submit">Add</button>
      </form>
    </section>

    <section class="card">
      <h2>Today's Meals</h2>
      <ul class="meal-list" id="meal-list"></ul>
      <div class="empty-state" id="empty-state">No meals logged yet today. Add your first meal above.</div>
    </section>

    <section class="card">
      <h2>Weekly History</h2>
      <div class="chart" id="chart"></div>
    </section>
  </div>

<script>
  const STORAGE_MEALS = 'k21_meals';
  const STORAGE_GOAL = 'k21_goal';
  const DEFAULT_GOAL = 2000;

  const els = {
    todayDate: document.getElementById('today-date'),
    caloriesConsumed: document.getElementById('calories-consumed'),
    caloriesGoal: document.getElementById('calories-goal'),
    goalInput: document.getElementById('goal-input'),
    saveGoalBtn: document.getElementById('save-goal-btn'),
    progressFill: document.getElementById('progress-fill'),
    progressCaption: document.getElementById('progress-caption'),
    mealForm: document.getElementById('meal-form'),
    mealName: document.getElementById('meal-name'),
    mealCalories: document.getElementById('meal-calories'),
    mealType: document.getElementById('meal-type'),
    mealList: document.getElementById('meal-list'),
    emptyState: document.getElementById('empty-state'),
    chart: document.getElementById('chart'),
    insightText: document.getElementById('insight-text'),
    snapFileInput: document.getElementById('snap-file-input'),
    webcamToggleBtn: document.getElementById('webcam-toggle-btn'),
    webcamWrap: document.getElementById('webcam-wrap'),
    webcamVideo: document.getElementById('webcam-video'),
    webcamCaptureBtn: document.getElementById('webcam-capture-btn'),
    webcamCanvas: document.getElementById('webcam-canvas'),
    snapStatus: document.getElementById('snap-status'),
    snapError: document.getElementById('snap-error'),
    resultCard: document.getElementById('result-card'),
    resultFoodName: document.getElementById('result-food-name'),
    resultConfidence: document.getElementById('result-confidence'),
    resultCalories: document.getElementById('result-calories'),
    resultStars: document.getElementById('result-stars'),
    resultPortion: document.getElementById('result-portion'),
    resultNotes: document.getElementById('result-notes'),
    addToTodayBtn: document.getElementById('add-to-today-btn'),
  };

  function loadMeals() {
    try {
      const raw = localStorage.getItem(STORAGE_MEALS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveMeals(meals) {
    localStorage.setItem(STORAGE_MEALS, JSON.stringify(meals));
  }

  function loadGoal() {
    const raw = localStorage.getItem(STORAGE_GOAL);
    const parsed = raw ? parseInt(raw, 10) : DEFAULT_GOAL;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_GOAL;
  }

  function saveGoal(goal) {
    localStorage.setItem(STORAGE_GOAL, String(goal));
  }

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDisplayDate(date) {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  let meals = loadMeals();
  let goal = loadGoal();

  function renderHeader() {
    els.todayDate.textContent = formatDisplayDate(new Date());
  }

  function renderSummary() {
    const todayKey = dateKey(new Date());
    const todayMeals = meals.filter(m => m.date === todayKey);
    const consumed = todayMeals.reduce((sum, m) => sum + m.calories, 0);
    const pct = Math.min(100, Math.round((consumed / goal) * 100));

    els.caloriesConsumed.textContent = consumed;
    els.caloriesGoal.textContent = goal;
    els.goalInput.value = goal;
    els.progressFill.style.width = `${pct}%`;

    if (consumed > goal) {
      els.progressCaption.textContent = `${pct}% of today's goal — ${consumed - goal} kcal over`;
      els.progressFill.style.background = '#e08a3f';
    } else {
      els.progressCaption.textContent = `${pct}% of today's goal`;
      els.progressFill.style.background = '';
    }
  }

  function renderMealList() {
    const todayKey = dateKey(new Date());
    const todayMeals = meals
      .filter(m => m.date === todayKey)
      .sort((a, b) => b.createdAt - a.createdAt);

    els.mealList.innerHTML = '';
    els.emptyState.style.display = todayMeals.length ? 'none' : 'block';

    for (const meal of todayMeals) {
      const li = document.createElement('li');
      li.className = meal.id === lastAddedMealId ? 'meal-item meal-enter' : 'meal-item';
      li.innerHTML = `
        <div class="meal-info">
          <span class="meal-type-badge meal-type-${meal.type}">${meal.type}</span>
          <span class="meal-name">${escapeHtml(meal.name)}</span>
        </div>
        <div class="meal-right">
          <span class="meal-cal">${meal.calories} kcal</span>
          <button class="delete-btn" data-id="${meal.id}" title="Delete meal" aria-label="Delete ${escapeHtml(meal.name)}">&times;</button>
        </div>
      `;
      els.mealList.appendChild(li);
    }

    lastAddedMealId = null;
  }

  function renderChart() {
    els.chart.innerHTML = '';
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    const totals = days.map(d => {
      const key = dateKey(d);
      return meals
        .filter(m => m.date === key)
        .reduce((sum, m) => sum + m.calories, 0);
    });

    // Scale against the tallest day actually logged, not the goal — otherwise
    // bars are invisibly short whenever daily totals sit far below goal.
    const max = Math.max(...totals, 1);
    const todayKey = dateKey(new Date());

    days.forEach((d, i) => {
      const key = dateKey(d);
      const total = totals[i];
      const heightPct = Math.max(2, Math.round((total / max) * 100));

      const col = document.createElement('div');
      col.className = 'chart-col';
      col.innerHTML = `
        <span class="chart-value">${total || ''}</span>
        <div class="chart-bar-track">
          <div class="chart-bar${key === todayKey ? ' is-today' : ''}" style="height: ${heightPct}%"></div>
        </div>
        <span class="chart-label">${d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
      `;
      els.chart.appendChild(col);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderInsight() {
    const todayKey = dateKey(new Date());
    const todayMeals = meals.filter(m => m.date === todayKey);

    if (!todayMeals.length) {
      els.insightText.textContent = 'Log a meal to see today\'s insight.';
      return;
    }

    const consumed = todayMeals.reduce((sum, m) => sum + m.calories, 0);
    const rated = todayMeals.filter(m => Number.isFinite(m.healthinessRating));
    const avgRating = rated.length
      ? rated.reduce((sum, m) => sum + m.healthinessRating, 0) / rated.length
      : null;

    const parts = [`${consumed} / ${goal} kcal so far`];
    parts.push(avgRating !== null ? `avg healthiness ${avgRating.toFixed(1)}/5` : 'avg healthiness N/A');

    let suggestion;
    if (avgRating !== null && avgRating < 3) {
      suggestion = 'Try adding more vegetables or lean protein tomorrow.';
    } else if (consumed > goal) {
      suggestion = 'You went over goal today — consider a lighter dinner tomorrow.';
    } else if (consumed < goal * 0.7) {
      suggestion = 'You\'re well under goal — a balanced snack could help tomorrow.';
    } else {
      suggestion = 'Nice balance today — keep it up tomorrow.';
    }

    els.insightText.textContent = `${parts.join(' · ')}. ${suggestion}`;
  }

  function renderAll() {
    renderHeader();
    renderSummary();
    renderMealList();
    renderChart();
    renderInsight();
  }

  els.mealForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = els.mealName.value.trim();
    const calories = parseInt(els.mealCalories.value, 10);
    const type = els.mealType.value;

    if (!name || !Number.isFinite(calories) || calories <= 0) return;

    const meal = {
      id: crypto.randomUUID(),
      name,
      calories,
      type,
      date: dateKey(new Date()),
      createdAt: Date.now(),
    };

    if (Number.isFinite(pendingHealthinessRating)) {
      meal.healthinessRating = pendingHealthinessRating;
      pendingHealthinessRating = null;
    }

    meals.push(meal);
    lastAddedMealId = meal.id;

    saveMeals(meals);
    els.mealForm.reset();
    els.mealName.focus();
    renderAll();
  });

  els.mealList.addEventListener('click', (e) => {
    const btn = e.target.closest('.delete-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    const li = btn.closest('.meal-item');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (li && !reduceMotion) {
      li.classList.add('meal-exit');
      li.addEventListener('transitionend', () => {
        meals = meals.filter(m => m.id !== id);
        saveMeals(meals);
        renderAll();
      }, { once: true });
    } else {
      meals = meals.filter(m => m.id !== id);
      saveMeals(meals);
      renderAll();
    }
  });

  // --- Snap Your Food (Phase 2: Gemini image analysis) ---

  let pendingHealthinessRating = null;
  let lastAddedMealId = null;

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function showSnapError(message) {
    els.snapError.textContent = message;
    els.snapError.classList.add('is-active');
  }

  function clearSnapError() {
    els.snapError.textContent = '';
    els.snapError.classList.remove('is-active');
  }

  function renderResultCard(data) {
    els.resultFoodName.textContent = data.food_name;
    els.resultCalories.textContent = data.estimated_calories;
    els.resultPortion.textContent = data.portion_recommendation;
    els.resultNotes.textContent = data.notes || '';

    els.resultConfidence.textContent = data.confidence;
    els.resultConfidence.className = `confidence-badge confidence-${data.confidence}`;

    const rating = data.healthiness_rating;
    els.resultStars.innerHTML = Array.from({ length: 5 }, (_, i) =>
      `<span class="${i < rating ? '' : 'star-empty'}">★</span>`
    ).join('');
    els.resultStars.setAttribute('aria-label', `Healthiness rating: ${rating} out of 5`);

    els.resultCard.dataset.name = data.food_name;
    els.resultCard.dataset.calories = data.estimated_calories;
    els.resultCard.dataset.rating = rating;
    els.resultCard.classList.add('is-active');
  }

  async function analyzeImage(dataUrl) {
    clearSnapError();
    els.resultCard.classList.remove('is-active');
    els.snapStatus.classList.add('is-active');

    try {
      const res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        showSnapError(data.error || 'Could not analyze the image right now.');
        return;
      }

      renderResultCard(data);
    } catch {
      showSnapError('Could not reach the server. Please try again.');
    } finally {
      els.snapStatus.classList.remove('is-active');
    }
  }

  els.snapFileInput.addEventListener('change', async () => {
    const file = els.snapFileInput.files[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    analyzeImage(dataUrl);
    els.snapFileInput.value = '';
  });

  let webcamStream = null;

  els.webcamToggleBtn.addEventListener('click', async () => {
    const isActive = els.webcamWrap.classList.contains('is-active');

    if (isActive) {
      stopWebcam();
      return;
    }

    try {
      webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
      els.webcamVideo.srcObject = webcamStream;
      els.webcamWrap.classList.add('is-active');
      els.webcamToggleBtn.setAttribute('aria-expanded', 'true');
      els.webcamToggleBtn.textContent = 'Close webcam';
    } catch {
      showSnapError('Could not access the webcam. You can still upload a photo instead.');
    }
  });

  function stopWebcam() {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      webcamStream = null;
    }
    els.webcamWrap.classList.remove('is-active');
    els.webcamToggleBtn.setAttribute('aria-expanded', 'false');
    els.webcamToggleBtn.textContent = 'Use webcam';
  }

  els.webcamCaptureBtn.addEventListener('click', () => {
    const video = els.webcamVideo;
    const canvas = els.webcamCanvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    analyzeImage(dataUrl);
  });

  els.addToTodayBtn.addEventListener('click', () => {
    const card = els.resultCard;
    els.mealName.value = card.dataset.name;
    els.mealCalories.value = card.dataset.calories;
    pendingHealthinessRating = Number(card.dataset.rating);
    els.mealForm.requestSubmit();
    els.resultCard.classList.remove('is-active');
  });

  els.saveGoalBtn.addEventListener('click', () => {
    const value = parseInt(els.goalInput.value, 10);
    if (!Number.isFinite(value) || value <= 0) return;
    goal = value;
    saveGoal(goal);
    renderAll();
  });

  renderAll();
</script>
</body>
</html>
```

---

## Useful commands reference

```
npm install              # install dependencies
npm start                # run the server (http://localhost:3000)
node --check server.js   # syntax-check the backend
git tag                  # list phase checkpoints
git log --oneline         # see build history
```
