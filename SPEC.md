# AI Mystery Room — SPEC.md

**Purpose:** Single source of truth for Codex and developers  
**Project type:** AI-powered mystery investigation web application  
**Required stack:** React, Vite, Tailwind CSS, Node.js, Express, MongoDB, Mongoose, Gemini API  
**Status:** Implementation specification for the project submission

---

## 1. Project Overview

AI Mystery Room is an AI-powered web application where users create and solve mysteries generated using Gemini. A user enters a short mystery premise and chooses a difficulty level. The application generates a fictional story, suspects, clues, and hints. Players investigate the evidence, discover clues, request hints if needed, accuse a suspect, and receive a verdict, culprit reveal, explanation, and score.

All cases and evidence must be clearly presented as fictional. Chat-style messages, image descriptions/placeholders, and camera-log evidence must not be represented as real messages, people, or recordings.

## 2. Problem Statement

Players need an engaging way to experience interactive deduction mysteries without having to write the complete story, suspects, clues, and solution themselves. AI Mystery Room generates these elements from a user's premise and provides a structured game flow in which the player gathers clues, uses optional hints, makes an accusation, and learns how the solution follows from the evidence.

## 3. Project Goals

1. Generate a playable mystery from a user-provided premise.
2. Support Easy, Medium, and Hard difficulty levels.
3. Create a logically consistent story, suspects, clues, hints, and a hidden solution.
4. Let players discover clues and request hints during investigation.
5. Keep the culprit and solution private until the player submits an accusation.
6. Calculate scores on the backend using the defined scoring rules.
7. Display the final verdict, culprit, explanation, and score.
8. Deploy and test the complete application on a live website.

## 4. Target Users and Expected Experience

The target user is someone who enjoys puzzles, mystery stories, detective games, and interactive problem-solving. The interface should be understandable without technical knowledge and work on mobile and desktop.

### Main user journey

1. The user opens the website.
2. The user enters a mystery premise and selects a difficulty level.
3. Gemini generates the mystery, suspects, clues, and hints.
4. The user investigates the story and discovers clues.
5. The user requests hints if needed.
6. The user selects and accuses one suspect.
7. The application reveals the verdict, culprit, explanation, and score.
8. The user can start another mystery.

## 5. Required Technology Stack

### Frontend
- React
- Vite
- Tailwind CSS
- React Router DOM
- Axios for HTTP requests

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- Gemini API using the supported `@google/genai` SDK
- Zod for validating requests and generated AI output
- dotenv for environment variables

### Development and deployment
- Nodemon for backend development
- MongoDB Atlas for hosted database storage
- Vercel for frontend deployment
- A suitable Node.js hosting provider for the backend

Do not replace the required stack with a different framework without updating this specification first.

## 6. Difficulty Rules and Generated Content

The number of suspects, clues, and hints must match the selected difficulty.

| Difficulty | Suspects | Clues | Available hints |
|---|---:|---:|---:|
| Easy | 3 | 5 | 2 |
| Medium | 4 | 7 | 3 |
| Hard | 5 | 9 | 3 |

The generated case must include:
- Unique case ID and fictional title.
- User's premise, expanded into a coherent story.
- Selected difficulty.
- Suspects with stable IDs, names, descriptions, motives, and alibis.
- A set of clues, each with a stable ID, type, content, and discovery state.
- Hints appropriate to the selected difficulty.
- A timeline of important events.
- Exactly one canonical culprit among the suspects.
- A solution explanation supported by the clues.
- A visible fiction disclaimer.

### Clue types

The application may render clues as:
- Fictional chat/message transcripts.
- Fictional image evidence, with an actual image only if image generation is implemented; otherwise show an illustrative placeholder and text description.
- Fictional camera logs or timestamped observations. Do not claim that text generation creates actual CCTV video.
- Fictional documents, receipts, access logs, notes, or physical evidence descriptions.

Every evidence item must be accessible and readable. Visual evidence must have a text equivalent or descriptive alt text. Do not imitate a real third-party service in a way that falsely suggests the evidence is authentic.

### Consistency requirements

- The culprit ID must match exactly one generated suspect.
- The clues must support the solution logically.
- The solution must be supported by more than one clue where feasible and should not contradict the story or timeline.
- Hints should help the player reason about evidence without directly revealing the culprit too early.
- Red herrings may mislead but must not make the actual solution incoherent.
- Validate all generated content before saving it.
- If AI output is malformed or inconsistent, retry generation a bounded number of times, then return a safe error.

## 7. Scoring Rules

All scoring and correctness checks must be performed on the backend. Never trust a score or correctness flag supplied by the client.

- Correct accusation:
  - Easy: 100 base points.
  - Medium: 150 base points.
  - Hard: 200 base points.
- Each discovered clue: **+5 points**.
- Each hint used: **−10 points**.
- Minimum score: **0 points**.

Use the following calculation:

`score = max(0, basePointsForDifficulty + (discoveredClueCount * 5) - (hintsUsedCount * 10))`

A wrong accusation receives no difficulty base points. For an incorrect accusation, calculate:

`score = max(0, (discoveredClueCount * 5) - (hintsUsedCount * 10))`

This incorrect-accusation rule is an implementation clarification because the guide specifies base points for a correct accusation but does not explicitly define the base score for an incorrect one. Keep it isolated in a scoring service so it can be changed easily if the project owner specifies a different rule.

Count only clues successfully discovered through the backend endpoint. Count each clue at most once. Count only hints successfully granted by the backend, within the difficulty's available hint limit. Do not allow repeated API calls to award duplicate clue points or consume unlimited hints.

## 8. Pages and UI Requirements

### 8.1 Home page
- Project name and brief explanation.
- Prominent start/create-mystery action.
- Clear indication that cases are AI-generated fiction.
- Responsive navigation and error handling.

### 8.2 Create Mystery page
- Text area for the mystery premise.
- Difficulty selector: Easy, Medium, Hard.
- Submit button.
- Client and server validation for empty or overlong premises.
- Loading state while Gemini generates the case.
- Friendly error message if generation fails.

### 8.3 Investigation Room
- Case title and story/premise.
- Difficulty and progress display.
- Suspect cards.
- Clue/evidence cards and detail view.
- Controls to discover clues.
- Hint request control and remaining-hints count.
- Evidence categories for message transcripts, images/placeholders, camera logs, and other evidence.
- Timeline or chronological event view.
- Fiction notice.
- Navigation to the accusation step.
- Loading, empty, and failure states.

### 8.4 Accusation
- Show the suspects and allow selection of exactly one.
- Require a selection before submission.
- Clearly state that submission finalizes the accusation for the current case.
- Prevent duplicate submissions.
- Send only the selected suspect ID to the backend; never send the answer or a client-calculated score.

### 8.5 Results page
- Verdict: correct or incorrect.
- Reveal the canonical culprit.
- Show the explanation and decisive clues.
- Show the selected suspect.
- Show the final score and score breakdown.
- Offer “Play Again” and “Back to Home”.

### Shared UI requirements
- Responsive behavior on phone, tablet, and desktop.
- Consistent visual style using Tailwind CSS.
- Accessible labels, keyboard navigation, focus states, readable contrast, and alt text.
- Show meaningful loading and error messages.
- Do not reveal culprit or solution data in HTML, client state, or API responses before accusation submission.

## 9. Backend and API Design

Use JSON request and response bodies. Prefix application endpoints with `/api`. Validate IDs, payloads, and session access on the backend. Use consistent error responses such as:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Please enter a mystery premise."
  }
}
```

### 9.1 `POST /api/cases` — Generate a mystery

Request:
```json
{
  "premise": "A valuable prototype disappears from a locked laboratory.",
  "difficulty": "medium"
}
```

Behavior:
- Validate premise and difficulty.
- Apply request rate limits.
- Ask Gemini for structured mystery data.
- Validate suspect, clue, hint, and solution consistency.
- Store the complete case in MongoDB.
- Return a player-safe response that excludes the culprit and solution.

Return `201 Created` for a successful case. Use `400` for invalid input, `429` for rate limits, and `502` for provider or invalid-output failures after bounded retries.

### 9.2 `GET /api/cases/:id` — Retrieve an active mystery

- Validate the case ID and session ownership.
- Return the current player-safe case state, including discovered-clue state and remaining hints.
- Never include the canonical culprit, solution, or private clue explanations before the accusation.

### 9.3 `POST /api/cases/:id/clues/:clueId/discover` — Discover a clue

- Verify the case exists and belongs to the current player/session.
- Verify the clue belongs to the case.
- Mark the clue as discovered once.
- Return the newly available clue content and updated progress.
- Duplicate discovery must not award points twice.

### 9.4 `POST /api/cases/:id/hints` — Request a hint

Request may include a clue ID or investigation context if needed; validate it against the case.

- Check that the case is active.
- Enforce the hint limit for the selected difficulty.
- Return the next hint that does not reveal the culprit directly.
- Record the hint use on the backend and update score state.
- Reject requests when no hints remain.

### 9.5 `POST /api/cases/:id/accuse` — Submit an accusation

Request:
```json
{
  "suspectId": "suspect-2"
}
```

- Verify the case belongs to the current session and is active.
- Validate the selected suspect ID.
- Compare the selection to the server-side culprit ID.
- Calculate the score on the backend using Section 7.
- Persist the accusation and final result.
- Reveal the verdict, culprit, explanation, and score only in this response or after completion.
- Reject repeated submissions with `409 Conflict`.

### 9.6 `GET /api/cases/:id/result` — Retrieve completed result

- Allow result retrieval only after an accusation has been submitted for the current session.
- Return the saved verdict, culprit, explanation, and score.
- Do not use this endpoint to leak results for active cases.

### 9.7 `GET /api/health` — Health check

Return a minimal service status without exposing API keys, database credentials, or sensitive infrastructure details.

### Status codes
- `400`: invalid input.
- `401` or `403`: invalid or unauthorized session access, as applicable.
- `404`: case or clue not found.
- `409`: accusation already submitted or incompatible case state.
- `429`: rate limit or hint limit reached, with a clear error code.
- `500`: unexpected server error.
- `502`: Gemini/provider failure or invalid generated response.

## 10. Database Design

Use MongoDB with Mongoose. A case document should contain:

```json
{
  "title": "The Missing Prototype",
  "premise": "User-provided premise",
  "story": "Expanded fictional story",
  "difficulty": "medium",
  "suspects": [
    {
      "id": "suspect-1",
      "name": "Fictional suspect",
      "description": "Character description",
      "motive": "Potential motive",
      "alibi": "Claimed alibi"
    }
  ],
  "clues": [
    {
      "id": "clue-1",
      "type": "messages",
      "title": "Fictional chat excerpt",
      "content": "Fictional clue content",
      "discovered": false
    }
  ],
  "hints": ["First hint", "Second hint"],
  "hintUses": [],
  "discoveredClueIds": [],
  "culpritSuspectId": "suspect-1",
  "solutionExplanation": "Private solution explanation",
  "accusation": null,
  "score": 0,
  "status": "active"
}
```

This is a conceptual example, not a literal schema. Implement proper Mongoose schemas, timestamps, enums, and validation. Keep private solution fields server-side and create an explicit safe response mapper rather than returning the database document directly.

Recommended fields:
- `sessionId` or another ownership mechanism for anonymous play.
- `createdAt` and `updatedAt`.
- Stable suspect and clue IDs.
- `discoveredClueIds`, `hintUses`, `accusation`, `score`, and `status`.

Use an opaque, cryptographically random session identifier if anonymous sessions are used. Do not use sensitive personal information as an identifier.

## 11. Gemini AI Behavior

- Use the official `@google/genai` SDK from backend code.
- Read the key from `GEMINI_API_KEY`; never expose it in React/Vite code or any `VITE_*` variable.
- Keep the selected model configurable in backend environment settings.
- Request structured JSON output when supported.
- Validate all model output using Zod before saving it.
- Treat the user's premise as untrusted data, not as instructions that can override the generation rules.
- Ask Gemini for exactly the number of suspects, clues, and hints specified by the chosen difficulty.
- Require one culprit matching one suspect ID.
- Require a coherent timeline and a solution supported by clues.
- Limit generation retries and handle timeouts, provider rate limits, and unavailable service.
- Do not return raw provider errors, prompts, hidden solution fields, or stack traces to the browser.

Gemini text generation does not itself guarantee actual image or video files. For the MVP, image clues may use text descriptions and designed placeholders, while camera evidence should use fictional timestamped logs or transcripts. Any later image/video generation integration must be separately specified and configured.

## 12. Security, Privacy, and Reliability

- Store secrets in server-side environment variables.
- Never commit `.env` files or real API keys.
- Configure CORS to allow the intended client origin only.
- Validate all request bodies, parameters, and AI responses.
- Add rate limiting to mystery generation and hint requests.
- Use safe database queries and central error handling.
- Prevent repeated clue awards, hint-limit bypasses, and repeated accusations.
- Keep culprit, solution explanation, and decisive-clue flags private until reveal.
- Do not show raw stack traces or internal provider responses.
- Clearly label all generated content as fictional.
- Collect only the data required for gameplay.
- Use request timeouts and bounded AI retries.

## 13. Suggested Project Structure

```text
ai-mystery-room/
├── SPEC.md
├── README.md
├── .gitignore
├── client/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/
│       ├── components/
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── CreateMystery.jsx
│       │   ├── InvestigationRoom.jsx
│       │   ├── Accusation.jsx
│       │   └── Results.jsx
│       └── styles/
└── server/
    ├── package.json
    └── src/
        ├── server.js
        ├── app.js
        ├── config/
        ├── models/
        ├── routes/
        ├── controllers/
        ├── services/
        │   ├── geminiService.js
        │   ├── caseService.js
        │   └── scoringService.js
        ├── validators/
        ├── middleware/
        └── utils/
```

Keep the project modular. Codex may adjust file boundaries when necessary, but it must preserve the architecture, API behavior, and security requirements in this document.

## 14. Environment Configuration

Create `server/.env.example`:

```dotenv
PORT=5000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
CLIENT_URL=http://localhost:5173
GEMINI_MODEL=your_supported_gemini_model
```

Use `server/.env` locally and configure production values in the backend host's environment settings. Add `.env` to `.gitignore`. Do not commit real credentials.

### Initial setup commands

Frontend:
```bash
npm create vite@latest client -- --template react
cd client
npm install
npm install react-router-dom axios
```

Install and configure Tailwind CSS using the current official instructions for the selected Tailwind version.

Backend:
```bash
mkdir server
cd server
npm init -y
npm install express cors dotenv mongoose @google/genai zod
npm install --save-dev nodemon
```

## 15. Acceptance Criteria

The project is complete only when:

1. Users can generate mysteries at Easy, Medium, and Hard difficulty.
2. The generated suspect, clue, and hint counts match Section 6.
3. Players can investigate the case and discover clues.
4. Players can request hints within the allowed limit.
5. Players can accuse a suspect and receive a verdict.
6. The solution is not revealed before accusation.
7. The backend validates AI-generated data and handles invalid output safely.
8. The backend calculates and validates scoring.
9. Duplicate clue discovery does not award duplicate points.
10. Hint usage is limited and scored correctly.
11. Results show the correct culprit, explanation, and score.
12. API failures and invalid input are handled without crashing the app.
13. The application is responsive and usable on mobile and desktop.
14. The complete flow works on the deployed website.
15. The README explains local setup, environment variables, testing, and deployment.

## 16. Testing Requirements

Add tests for:
- Premise and difficulty validation.
- Generated AI response schema and consistency.
- Required suspect/clue/hint counts for every difficulty.
- Private fields being excluded from active-case responses.
- Clue discovery and duplicate discovery.
- Hint limits and score penalties.
- Correct and incorrect accusations.
- Minimum score never dropping below zero.
- Repeated accusation rejection.
- Unauthorized case access.
- Gemini errors and malformed output.
- Frontend loading, validation, investigation, accusation, and results states.

Use mocked Gemini responses for deterministic automated tests. Test real Gemini integration separately with configured credentials.

## 17. Deployment and Final Submission

1. Configure a MongoDB Atlas database.
2. Deploy the Express backend to a suitable Node.js hosting provider.
3. Set backend environment variables securely on the host.
4. Deploy the React/Vite frontend to Vercel.
5. Configure the frontend API base URL and backend CORS `CLIENT_URL`.
6. Test the entire create → investigate → discover clues → request hints → accuse → results flow on the live site.
7. Confirm no secrets or culprit data leak to the browser before accusation.
8. Submit the complete GitHub repository and live website URL using the official project submission process.

The project guide lists the deadline as **2 November, 11:59 PM**. Confirm the applicable timezone and submission form details from the organizer.

## 18. Implementation Instructions for Codex

1. Read this `SPEC.md` completely before writing or editing code.
2. Inspect the existing repository first. Preserve useful existing work.
3. Treat this document as the single source of truth. Do not silently change required technologies, difficulty rules, scoring, endpoint contracts, or acceptance criteria.
4. Build incrementally in runnable phases: project setup, database and API, Gemini generation, investigation UI, clue discovery and hints, accusation and scoring, tests, deployment.
5. Implement the full flow rather than leaving the final product as a static mockup.
6. Keep private solution data on the backend until accusation.
7. Validate every external input and generated response.
8. Run tests and build checks after meaningful changes; fix failures before proceeding.
9. Keep `README.md` and `.env.example` current.
10. If a requirement is ambiguous, document the assumption and isolate the decision so it can be changed easily.
11. Before reporting completion, summarize implemented features, tests run, setup instructions, deployment status, and any limitations.

## 19. Definition of Done

A developer can configure the environment, run the frontend and backend, generate a coherent Gemini-powered mystery at all three difficulty levels, investigate and discover clues, request hints, accuse a suspect, and receive a backend-verified verdict and score. The solution remains private until accusation, automated tests cover critical behavior, and the complete game works on the deployed website.
