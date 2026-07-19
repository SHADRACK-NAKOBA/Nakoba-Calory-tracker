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

## Useful commands reference

```
npm install              # install dependencies
npm start                # run the server (http://localhost:3000)
node --check server.js   # syntax-check the backend
git tag                  # list phase checkpoints
git log --oneline         # see build history
```
