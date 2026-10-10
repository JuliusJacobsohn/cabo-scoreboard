[Fully vibe-coded, does not represent me as a developer]

## Cabo Scoreboard

[Live site](https://juliusjacobsohn.github.io/cabo-scoreboard/) - single-page scoreboard for Cabo.

[Repository](https://github.com/JuliusJacobsohn/cabo-scoreboard) · [Deployment status](https://github.com/JuliusJacobsohn/cabo-scoreboard/actions/workflows/pages.yml) · [Skull King Scoreboard](https://github.com/JuliusJacobsohn/skull-king-scoreboard)

### Overview
Cabo Scoreboard is a lightweight web app for tracking a Cabo game round by round.
It follows the structure and dark/yellow style of Skull King Scoreboard, is designed for quick mobile use, works without a backend, and persists state locally in the browser.

### Features
- Player setup for 2–5 players, with recent names available to reuse.
- Fast, tap-friendly card input: values 0–13 in five columns, a backspace key, card sums and **OK** per player. OK advances to the next unconfirmed player.
- Select the Cabo caller with one tap on a name, without a dropdown.
- Live round points preview and running totals, including the failed-caller penalty, Kamikaze and the 100-point reset.
- Score progression graph in a fixed-height panel below the game, starting at round 0.
- History dialog with two tabs: **Graph** (default) shows one line per player; **Runden** shows per-round points and totals.
- Main menu with open games, new-game setup, and finished games showing the winners. Switch games and resume unfinished card entries.
- **Spielarchiv** opens completed games and their graphs; **Spielerstatistik** shows games played, wins, losses, win rate, average points, average position, and minimum/maximum end scores.
- Statistics charts for wins/losses, point comparison, a selected player's end scores over time, and finish positions. Player details also include round averages, Cabo calls with penalties, Kamikaze hands and resets.
- Mobile history and statistics use one vertical scrolling area per dialog; wide tables can also be swiped horizontally.
- Local persistence via `localStorage`. Input undo and reopening the last completed round work after reloading, including after game end.
- Visible links to this repository and the Skull King scoreboard in the app footer.

### Usage
1. Add players on the setup screen.
2. Start a new game, or resume an open game from the main menu.
3. For each player, tap their remaining 1–4 cards and press **OK**. Tap an entered card to remove it, or use **⌫** to remove the last card.
4. Tap the name of the player who called Cabo. Press **Runde abschließen** to apply scoring and advance to the next round.
5. See the graph below the game, or open **Graph & Verlauf** to switch between graph and round table.
6. Use **Hauptmenü** to pause or switch games, or **Spiel beenden** to finish with the scores from completed rounds.
7. Open **Spielarchiv** or **Spielerstatistik** from the main menu to review completed games and player statistics.

### Scoring
Uses the [official cabogame.com rules with the five-point penalty](https://www.cabogame.com/how-to-play). Other published editions differ; see [RULES.md](RULES.md) for the source comparison.

- Lowest hand scores 0; everyone else scores their card sum.
- A caller with more points than the lowest hand receives their sum **+5**.
- Lowest-hand ties including the caller favor the caller; ties without the caller award 0 to all tied lowest players.
- Exactly `12,12,13,13`: 0 for that player, 50 for everyone else, overriding the usual scoring and penalty.
- Exactly 100 cumulative points resets to 50 once per player per game.
- A total above 100 ends the game; lowest total wins. Shared final winners are supported.
- Card values and physical deck counts are validated.

Player statistics include only completed games with at least one completed round, including games ended manually. Shared winners each receive a win. Equal totals share a position; subsequent positions are skipped. Names are matched without case differences. End-score history follows game start order. Round averages include penalties before the cumulative 100→50 reset, so they can differ from final totals.

### Development
- Pure HTML/CSS/JS with no build step.
- Graph views use [Chart.js](https://www.chartjs.org/) bundled locally with the site and its license.
- Open `index.html` directly in a browser while editing, or use a static server.
- After changing `app.js`, `scoring.js`, `statistics.js` or `style.css`, run `npm run version-assets` to refresh their cache keys.
- Run `npm ci`, `npm run check` and `npm test` for scoring, state, persistence, undo, statistics and chart-data tests. These run in Node without launching a browser.
- Use browser control at a mobile viewport to check layout, dialog scrolling and touch interactions.

### GitHub Pages
The included workflow tests the app, verifies asset cache keys, packages the public files and deploys on pushes to `master`. Pull requests run checks without deploying. It can also be started manually.

For another repository, enable **Settings → Pages → GitHub Actions**. The deployment uses the `github-pages` environment and standard OIDC permissions; no repository secret is required.

### Data
Games and statistics stay in this browser under `cabo_mobile_v1`. No account, analytics or backend. Clearing browser data removes them. Invalid saved data is preserved rather than overwritten, and storage failures show a warning.

Unofficial scorekeeping companion. No Cabo card artwork is included.
