# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run local dev server (Netlify Functions + frontend)
npm start               # runs: netlify dev --offline

# Build frontend (client/) into public/
npm run build           # runs: cd client && npm install --include=dev && npm run build

# Deploy to production
netlify deploy --build --prod
```

No automated test suite exists. Testing is done manually with curl against the local server or production URL (`https://splitbillbe.netlify.app`).

## Architecture Overview

This is a **Netlify serverless backend** for a split-bill app. Everything runs through a single Netlify Function entry point.

### Request Flow

```
HTTP request → netlify.toml redirect (/api/* → /.netlify/functions/api/:splat)
             → netlify/functions/api.js  (router: path parsing + dispatch)
             → api/**/*.js               (individual route handlers)
             → lib/                      (shared utilities, models, middleware)
```

The router in [netlify/functions/api.js](netlify/functions/api.js) manually parses the URL path and dispatches to handlers — there is no Express or framework routing. Path segments are extracted and matched with if/switch blocks.

### Key Architectural Decisions

**Single function entrypoint**: All API routes go through one Netlify Function (`netlify/functions/api.js`). Each route handler is a plain async function that receives `(event, context)` and returns a `Response` object.

**Netlify Functions v2 compatibility**: The code handles both Netlify Functions v1 (legacy `event.body`, `event.httpMethod`) and v2 (`event.url`, `event.method`, `event.json()`). Always use helpers from `lib/parsers.js` (`parseJsonBody`, `getQueryParams`) — never access `event.body` directly.

**Response helpers**: All responses must use helpers from `lib/http.js`:
- `jsonResponse(statusCode, body, headers)` 
- `errorResponse(error, headers)`
- `noContentResponse(headers)` — for OPTIONS preflight
- Always call `createCorsHeaders(event)` at the top of every handler and pass to all responses.

**Error handling**: Throw `HttpError` from `lib/errors.js` for any known error condition. Use `toHttpError(error)` in catch blocks before passing to `errorResponse`. In production, 5xx errors return generic messages.

### Authentication

`lib/middleware/auth.js` exports:
- `requireUser(event)` — verifies JWT, requires `isVerified: true`, returns user document
- `requireAdmin(event)` — calls `requireUser` then checks `isAdmin: true`
- `authMiddleware(handler)` / `adminMiddleware(handler)` — wrapper versions that attach `event.user`
- `generateTokens(userId)` — creates access (30m) + refresh (7d) JWT pair
- Email verification is **mandatory** — unverified users get HTTP 403

Account lockout: 5 failed login attempts → 15-minute lock (`User.incLoginAttempts()`).

### Database

- MongoDB via Mongoose, connection string in `MONGO_URI`
- `lib/db.js` manages a singleton connection with a cached promise — always call `await connectDatabase()` at the start of handlers
- Pattern for models: `mongoose.models.ModelName || mongoose.model('ModelName', schema)` — prevents re-registration in warm Lambda instances

### Rate Limiting

`lib/middleware/rateLimiter.js` provides in-memory rate limiters (not Redis — resets on cold start):
- `applyAuthRateLimit(event)` — 5 req / 15 min per IP (login/register)
- `applyEmailRateLimit(email)` — 3 emails / hour per email address
- `applyGeminiRateLimit(userId)` — 10 scans / hour per user

### Gemini Receipt Scanning

`api/gemini-scan.js` — scans receipt images via Gemini 2.5 Flash (`gemini-2.5-flash`). Requires auth. Deducts from `user.freeScanCount` (default: 10) on each successful scan. Accepts base64-encoded images (jpeg/png/webp, max 5MB).

### Email

`lib/email.js` uses the Resend SDK. Only verification emails are sent. From address: `noreply@splitbill.my.id`.

## Environment Variables

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Signs access tokens (30m expiry) |
| `JWT_REFRESH_SECRET` | Signs refresh tokens (7d expiry) |
| `GEMINI_API_KEY` | Google Gemini API key for receipt scanning |
| `RESEND_API_KEY` | Resend email service API key |
| `FRONTEND_URL` | Frontend origin (default: `https://splitbill.my.id`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed origins |
| `NODE_ENV` | `production` enables HSTS, generic 5xx errors, JSON log format |

## API Route Map

| Method | Path | Auth | Handler |
|---|---|---|---|
| POST | `/api/auth/register` | — | `api/auth/register.js` |
| POST | `/api/auth/login` | — | `api/auth/login.js` |
| POST | `/api/auth/logout` | — | `api/auth/logout.js` |
| GET | `/api/auth/me` | user | `api/auth/me.js` |
| GET | `/api/auth/verify` | — | `api/auth/verify.js` |
| POST | `/api/auth/resend-verification` | — | `api/auth/resend-verification.js` |
| GET/POST | `/api/split-bills` | user | `api/split-bills/index.js` |
| GET/PUT/DELETE | `/api/split-bills/:recordId` | user | `api/split-bills/[recordId].js` |
| POST | `/api/split-bills/drafts` | optional | `api/split-bills/drafts/index.js` |
| GET/PUT | `/api/split-bills/drafts/:draftId` | optional | `api/split-bills/drafts/[draftId].js` |
| POST | `/api/split-bills/drafts/:draftId/finalize` | user | `api/split-bills/drafts/[draftId].js` |
| GET/POST | `/api/participants` | user | `api/participants/index.js` |
| DELETE | `/api/participants/:participantId` | user | `api/participants/[participantId].js` |
| POST | `/api/gemini-scan` | user | `api/gemini-scan.js` |
| GET | `/api/reviews/public` | — | `api/reviews.js` |
| POST | `/api/reviews` | — | `api/reviews.js` |
| GET | `/api/reviews` | admin | `api/reviews.js` |
| GET | `/api/banners` | — | `api/banners.js` |
| POST/DELETE | `/api/banners` | admin | `api/banners.js` |
| GET | `/api/users` | admin | `api/users.js` |
| POST | `/api/payment/create` | — | `api/payment.js` |
| GET | `/api/payment/:paymentId` | — | `api/payment.js` |

## Data Models Summary

- **User**: name, email (unique), password (bcrypt/12), isVerified, isAdmin, freeScanCount (default 10), loginAttempts, lockUntil, verificationToken
- **SplitBillRecord**: user (ref, nullable for guest drafts), activityName, occurredAt, participants[], expenses[], additionalExpenses[], paymentMethodSnapshots[], summary (total, perParticipant, settlements), status (locked=FINALIZED|editable=DRAFT), last_step (STEP_1|STEP_2|STEP_3|FINALIZED)
- **Participant**: name, user (ref) — unique per user (case-insensitive)
- **Payment**: paymentId (unique), name, phone, amount, status (pending|paid|expired), expiresAt — has TTL index for auto-expiry
- **Review**: rating (1-5), name, review, contactPermission, email?, phone?
- **Banner**: image (URL), route

## Adding a New Endpoint

1. Create `api/<resource>.js` with a default export `async function handle<Resource>(event, context)`
2. Import and register it in `netlify/functions/api.js` with a routing condition
3. Always: call `createCorsHeaders(event)`, handle OPTIONS early, call `connectDatabase()`, use `requireUser`/`requireAdmin` as needed
4. Throw `HttpError` for validation/auth errors; wrap catch blocks with `toHttpError`
