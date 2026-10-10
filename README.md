## Cabo Scoreboard

Mobile scoreboard for Cabo, following the HTML/CSS/JavaScript structure and dark/yellow visual style of [Skull King Scoreboard](https://github.com/JuliusJacobsohn/skull-king-scoreboard).

### Features
- Choose 2–5 players; tap recent player names to reuse them.
- Compact player selector, number pad (0–13), card sum and per-player **OK** confirmation.
- Tap a card to remove it. **Undo input** restores card edits, confirmations and caller changes, including after reloading.
- Select who called Cabo; preview the round points before committing.
- Reopen the last completed round, even after a finished game or a reload, to correct cards or the caller. Totals and reset eligibility are recalculated.
- Open and finished games, local persistence, round history and locally bundled Chart.js score progression.
- No backend, external fonts or runtime CDN dependencies. All site asset URLs are relative, including under a GitHub Pages repository path.

### Scoring
Uses the [official cabogame.com rules with the five-point penalty](https://www.cabogame.com/how-to-play), checked on 2026-10-10. Other editions (including Origames/Bézier) differ in penalties, round scoring and game end:
- Lowest hand gets 0 points; other players get their card sum.
- Failed Cabo caller gets their card sum **plus 5**. Tying for lowest does not incur the penalty.
- If the caller is tied for lowest, only the caller wins; otherwise all tied lowest players win.
- Exactly two 12s and two 13s: 0 for that player and 50 for everybody else, overriding normal scoring and penalties.
- Exactly 100 cumulative points resets to 50 **once per player per game**. Older editions may allow repeated resets.
- A total above 100 ends the game. Lowest cumulative score wins; tied winners are supported.
- Entries must contain 1–4 remaining cards. The physical deck's value counts are validated: two 0s and 13s, four of each other value.

### Development
Pure HTML/CSS/JS, no build step. Two-space JavaScript indentation and IIFE-based browser code, as in the reference project. `scoring.js` is also importable in Node for tests.

```sh
npm ci
npm run check
npm test
npm run version-assets
```

Open `index.html` directly or serve the directory with any static server. The tests cover scoring, persistence, editing, round undo, input undo, player selection and multi-game state using Node and jsdom. They do not launch a browser.

After changing `app.js`, `scoring.js` or `style.css`, run `npm run version-assets` and commit the refreshed cache keys in `index.html`.

### GitHub Pages
Validated locally on 2026-10-10: all 18 Node/jsdom tests and static checks passed. Chrome at 360 × 640 with five players: the player picker, number pad, confirmation, caller and round completion fit within the first screen (634px with the complete scoring preview). Input undo, failed caller +5, round completion, round undo and persistence were exercised in the browser. Deployment has not yet been verified on GitHub.

1. Create a public repository named `cabo-scoreboard` with default branch **master**.
2. Push this project's files to it.
3. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
4. The workflow tests the app, validates static assets and cache keys, packages only public site files, and deploys on a push to master. Pull requests run checks without deploying. It can also be started manually.

The deployment job uses the `github-pages` environment and the standard Pages OIDC permissions. No access token or other repository secret is required.

### Data
Games are stored only in this browser under `cabo_mobile_v1`. No account or analytics. Clearing browser data removes saved games. Invalid saved data is preserved without overwriting it; that session runs without persistence and displays a warning. A storage failure displays a warning rather than silently pretending that the game was saved.

Unofficial scorekeeping companion. No Cabo card artwork is included. Chart.js is bundled with its upstream license.
