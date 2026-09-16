# Mathgoat

A family multiplication app for tables 1–12. React + TypeScript, Cloudflare Workers, D1 (SQLite), and Observable Plot. Designed for one family per deployment.

## Run locally

Use Node 22.12+ (recommended for current Wrangler tooling).

```sh
nvm use # if you use nvm
npm install
npm run build
npm run db:local
npm run preview
```

Open http://localhost:8789 on this Mac, or http://claudius.local:8789 from another device on the same local network. The preview server listens on all network interfaces on port 8789. Port 8787 is reserved by the Chappy Docker worker on this Mac. Create a parent password, then add children with a nickname, animal avatar, four-digit PIN, and points goal. Switch explorer to sign in as a child.

For frontend live reload, also run `npm run dev` and open http://127.0.0.1:5173. Vite proxies API requests to Wrangler on port 8789. Local data persists in `.wrangler/state`; it is separate from production data. Do not commit that directory.

## Learning and rewards

- **Quest:** always 20 questions; 10 points for a correct answer. Starts with tables 1 and 2. Further tables unlock in the order 5, 10, 3, 4, 6, 7, 8, 9, 11, 12. Unlocking needs 70% of facts in the current tables to have at least three attempts and 80% recent accuracy.
- **Adaptive selection:** targets struggling facts 50% of the time, unseen facts 25%, and familiar facts 25%. If a category is empty, chooses from the available unlocked facts. Avoids the immediately previous fact. Within these categories, facts from the next unbeaten regional boss’s tables receive triple selection weight, subject to the existing table unlocks. Missed quest facts are scheduled for another try after three to six intervening answers, without a hint initially. Struggling means recent accuracy below 90% or median correct-answer time above six seconds. Ordered facts (`3×4` vs `4×3`) have separate records.
- **Focused practice:** any table, 20 or 50 questions, no points. Builds confidence for boss battles.
- **Wild cards:** a 12% chance in quests; double points on a correct answer. No point deductions or speed bonuses.
- **Boss battles:** a 20-question test for any table. All 12 multipliers appear once, eight appear a second time, shuffled. 18/20 passes and earns the table’s animal card. Wrong answers always show the correct equation and wait for Enter or Next; the end-of-test review also shows missed facts. Correct answers advance automatically after 650 ms in every mode. Battles award cards, not points, and have no random bonuses.
- **Fluency:** a passed boss battle with a median correct-answer time of six seconds or less earns a fluent badge. Table passes and fluent badges persist as achievements.
- **Ongoing fact mastery:** at least 9 of the last 10 answers correct, spread across at least three rounds, with median correct-answer time ≤6 seconds. This can fall if recent performance declines. It is deliberately separate from a one-time table pass.
- **Regional bosses:** table groups 1–4, 5–8, and 9–12. Unlock by passing each of the four table bosses in the group. Twenty mixed questions, five from each table, no duplicate facts; 18/20 earns a regional card.
- **Final boss:** unlock by passing all three regional bosses. Twenty mixed questions cover every table, with no duplicate facts. Pass at 18/20 to complete the adventure and earn the final card/crown. The parent’s points goal is a separate challenge.
- **Historical points:** previously earned points are preserved. Only newly answered quest questions award points under the new rules.
- **Hints:** every wrong answer shows a short worked strategy (doubling, building from fives/tens, or adding/subtracting groups). Where there are alternatives, prefer prerequisites with demonstrated accuracy. The first hint for each child/fact is saved so repeat explanations stay consistent. Corrected answers are not resubmitted or counted as additional successes. Timers stop at submission; reading the hint does not add to response time.

Every submitted answer is stored, including wrong answers, actual response, elapsed milliseconds, question, round, mode, timestamp, bonus, and points. Timings are measured on the server from question issuance to submission, so network latency and breaks count. Answers are scored server-side and retries cannot duplicate points. Incomplete rounds retain submitted answers but do not earn test passes. The initial version does not resume abandoned rounds or support voice input.

The parent dashboard provides heatmaps for frequency, recent accuracy, and median correct response time, plus facts needing practice. Children can see their own details and family leaderboard totals; other children's answer histories are restricted to the parent.

Each times table has a fixed animal and caption, shared across quests, focused practice, boss battles, and collectible cards. The first factor identifies the table: `5 × 7` uses the fives character.

Edit **`src/cards.ts`** to replace the starter animal names, emojis, and jokes with custom characters.

Hint strategy references: [The Math Learning Center fact-fluency guide](https://www.mathlearningcenter.org/sites/default/files/pdfs/BOBCF4_0208w.pdf) and [NCETM on deriving facts from known facts](https://ncetm.org.uk/classroom-resources/primm-210-connecting-multiplication-and-division-and-the-distributive-law/). Explanations are implemented locally; no external AI service is used.

## Deploy to Cloudflare

This repository is configured but has not been deployed.

```sh
npx wrangler login
npx wrangler d1 create mathgoat
```

Put the returned database ID in `wrangler.jsonc`, replacing the all-zero local placeholder. Then:

```sh
npx wrangler d1 migrations apply DB --remote
npm run deploy
```

Visit the deployment immediately and create the parent account **before sharing its URL**. Initial setup is first-come, one-time. For a private family app, optionally restrict the hostname with Cloudflare Access. Keep the parent password in a password manager; the first version has no password recovery UI.

PINs and parent passwords are salted and PBKDF2 hashed. Login is limited to five attempts per account/IP per five minutes. Sessions use HttpOnly, SameSite cookies (Secure on HTTPS), expire after seven days, and API writes check the request origin. Children have simple PINs as requested; this is a private-family model, not multi-tenant school account management.

Cloudflare references: [Workers static assets](https://developers.cloudflare.com/workers/static-assets/binding/), [Wrangler and D1 bindings](https://developers.cloudflare.com/workers/wrangler/configuration/). Analytics use [Observable Plot cells](https://observablehq.github.io/plot/marks/cell).

## Checks

```sh
npm test
npm run build
npm run test:e2e
```

The end-to-end check automatically starts an isolated local server on port 8788, applies migrations, and creates test-only family data under `.wrangler/e2e`. It does not use the app’s normal local database or production. It uses Chrome installed on the local computer; change the Playwright `channel` if needed. Browser screenshots are saved in `test-results/`.
