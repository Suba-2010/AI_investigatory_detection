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

Deploy `server` to a Node.js host with MongoDB Atlas and backend environment variables. Deploy `client` to Vercel with `VITE_API_URL` set. Restrict backend `CLIENT_URL` to the Vercel site origin. Verify the full create, investigate, hint, accusation, and result flow after deployment. No live deployment is configured by this repository.

All cases, transcripts, image descriptions, and camera logs are fictional. Image evidence is rendered as a descriptive placeholder; generated text does not produce real photographs or video.
