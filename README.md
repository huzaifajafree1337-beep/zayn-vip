# ZAYN VIP — WinGo 1M History & Statistics

A responsive, read-only historical analytics dashboard. It does not generate betting predictions or claim to forecast future outcomes.

## Requirements
- Node.js 18+ (built-in `fetch` is used)
- npm

## Run locally
```bash
npm install
npm start
```
Open http://localhost:3000

## API integration
The server proxies requests to the exact configured source:
`https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json`

The browser calls `/api/history`; this avoids browser CORS restrictions. The proxy does not fabricate data. If the upstream service blocks server requests, check its access policy and hosting network logs. Do not expose private credentials in client-side code.

The frontend understands common list containers (`list`, `records`, `history`, including nested `data`) and expects each row to include `issueNumber` and `number`. If the upstream JSON uses a different nesting shape, update `extractRows()` in `public/app.js` after inspecting a real response.

## Deployment
Deploy this folder to any Node.js host that supports Node 18+ and set the start command to `npm start`. The host must allow outbound HTTPS requests to `draw.ar-lottery01.com`. Add your own domain in the hosting provider's dashboard.

## Data behavior
- Live history is fetched through the server proxy every 10 seconds.
- Duplicate issue numbers are ignored.
- Results are sorted newest-first using numeric issue ordering.
- Up to 500 records are cached in browser local storage for stale/offline viewing.
- API errors are shown; cached data is clearly labelled stale.
- The Load more button requests subsequent pages from the upstream API.

## Important
This project is a history/statistics viewer only. Frequencies and gaps describe past records and are not predictions or guarantees about future results.
