# CABO scoring verification

Checked 2026-10-10 against publisher sources. The requested five-point rules agree with the current official [CABO / Shareful Games rules](https://www.cabogame.com/how-to-play), not every published edition.

## Rules matching the request

- Add each player's card values. The lowest hand scores zero; other players score their hand sum. An unsuccessful caller adds **5**, only when another hand is strictly lower. [Official rules, Scoring](https://www.cabogame.com/how-to-play)
- Lowest-hand tie including the caller: caller gets zero, the other tied players keep their hand points. Without the caller in that tie, all lowest hands get zero. The former follows the paragraph's combination of caller tie precedence and everyone else receiving hand points. [Official rules, Scoring](https://www.cabogame.com/how-to-play)
- A hand of **12,12,13,13** (“Shooting the Moon” / Kamikaze) scores zero; everybody else scores **50**, regardless of caller. This overrides ordinary scoring and the caller penalty. [Official rules, Strategies](https://www.cabogame.com/how-to-play)
- A cumulative total of exactly **100** resets to **50**, once per player per game. Finish when anyone exceeds **100**; lowest cumulative total wins. The official page provides no final-score tie breaker. [Official rules, Strategies and Ending the Game](https://www.cabogame.com/how-to-play)

## Edition ambiguity

The licensed French Origames / Bézier Games rulebook has different scoring: only a successful caller receives zero (ties count as successful); every noncaller keeps their hand sum, including the lowest noncaller. A failed caller adds **10**. Kamikaze still awards zero versus 50 and the reset is once per player. Its game end additionally triggers on a player's **second arrival at exactly 100**, and final ties favor the tied player with fewer points in the final round. [Publisher rulebook, page 3](https://www.origames.fr/wp-content/uploads/2022/06/Cabo-Regles.pdf)

Recommendation for this app: label the implemented rules as the official CABO rules linked above / five-point edition. Do not silently import the second-exact-100 or final-tie rules from the ten-point edition. Reset flags must be part of undoable round history. Kamikaze should require the actual four-card combination, not merely a hand total of 50 (an implementation recommendation).
