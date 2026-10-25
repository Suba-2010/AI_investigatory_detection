# AI Mystery Room

An AI-powered fictional deduction game. Players create a mystery, investigate evidence, use optional hints, and accuse a suspect. Gemini generation, case ownership, clue/hint tracking, and scoring are handled by the Express API.

## Requirements

- Node.js 20+
- MongoDB (local or Atlas)
- Gemini API key for mystery generation

## Local setup

1. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI`, `GEMINI_API_KEY`, and SMTP values if you want email invitations.
2. Install dependencies with `npm install`, `npm --prefix client install`, and `npm --prefix server install`.
3. Run `npm run dev`. The Vite client uses port 5173 and the API uses port 5000.
4. Run `npm run build` for the production client build and `npm test` for API tests.

The API supports `MONGODB_URI=memory` for lightweight local API development without MongoDB; that mode is in-memory and loses cases when the server restarts. Gemini is required to create new cases. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` to send invitations automatically. Without SMTP, the app still creates a secure link and offers copy-link and prefilled-email actions. Invitation links are single use and expire after 48 hours. No email account password belongs in the frontend.

Case owners can invite a teammate from the investigation room. Teammates join through the email link, then share clue discoveries, hints, pinned evidence, and theory notes. The current anonymous play model uses the secure invite link as the join credential; it does not create a permanent user account.

## Environment

See `server/.env.example`. Keep secrets on the backend. Set `CLIENT_URL` to the deployed frontend origin, and `VITE_API_URL` in the frontend build environment to the backend `/api` base URL.

## Deployment

Deploy the API and web client as two services:

### 1. Create MongoDB Atlas storage

Create an Atlas cluster and a database user, then copy the application's MongoDB connection string. Add the backend host to the Atlas project's IP access list. Atlas only accepts connections from listed addresses; prefer restricting access to the backend host's egress addresses where your hosting plan provides them.

### 2. Deploy the API to Render

Create a **Web Service** connected to this repository and set:

- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`

Add these environment variables in Render. Do not upload or commit `server/.env`.

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Atlas connection string |
| `GEMINI_API_KEY` | Gemini API key |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` |
| `GEMINI_FALLBACK_MODEL` | `gemini-3.8-flash` |
| `CLIENT_URL` | Your Vercel site origin, added after step 3 |

Render supplies `PORT` automatically. After deployment, copy the service URL, for example `https://your-api.onrender.com`.

### 3. Deploy the client to Vercel

Import the same repository as a Vercel project and set:

- Root Directory: `client`
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_URL=https://your-api.onrender.com/api`

Deploy and copy the Vercel origin, for example `https://your-app.vercel.app`.

### 4. Connect the two deployments

In Render, set `CLIENT_URL` to the exact Vercel origin (no trailing slash), then redeploy the API. If you change `VITE_API_URL` later, redeploy the Vercel client so the new value is included in its build. `client/vercel.json` routes direct links such as `/join/<invite-token>` back to the React app.

### 5. Verify the live app

Open `https://your-api.onrender.com/api/health` and confirm it returns `{"status":"ok"}`. Then test case generation, clue discovery, hints, team invite links, accusation, and results on the Vercel site. Automatic invite emails are optional; without SMTP configuration, the app offers a copyable link and a prefilled email draft.

No live deployment is configured by this repository.

All cases, transcripts, image descriptions, and camera logs are fictional. Image evidence is rendered as a descriptive placeholder; generated text does not produce real photographs or video.
