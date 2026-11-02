# SplitEase

A full-stack expense-splitting app (a Splitwise-style tracker) for friends and groups. Add shared expenses, split them equally, by exact amount or by percentage, and settle up with a request-and-accept flow.

**Live demo:** https://splits-ease.vercel.app/

> The backend may be hosted on a free tier, so the first request after a period of inactivity can take a few seconds while the server wakes up.

<!--
Add screenshots, then uncomment this block:

| Dashboard | Group expenses | Settlements |
|-----------|----------------|-------------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Group](docs/screenshots/group.png) | ![Settlements](docs/screenshots/settlements.png) |
-->

## Features

- **Accounts:** sign up and sign in with a username or a phone number.
- **Friends:** search for users, send friend requests, accept or reject them.
- **Groups:** create groups and invite members by user or by phone number.
- **Expenses:** add expenses to a group or between friends, with three split types:
  - equal
  - exact amounts
  - percentages
- **Balances:** see what you owe and what you are owed, per group and per friend.
- **Settlements:** record a payment, or request one that the other person accepts. A pending request can be cancelled by the person who sent it.
- **Activity and notifications:** a feed of recent activity.
- **Profile:** view and update your profile, or delete your account.
- **Responsive UI:** works on desktop and mobile.

## Tech stack

| Layer | Technology |
|-------|------------|
| Client | React, Vite |
| Server | Node.js, Express 5 |
| Database | PostgreSQL (`pg`) |
| Auth | JWT access and refresh tokens, bcrypt, httpOnly cookies |
| Validation | zod |
| Security | express-rate-limit, CORS allowlist |
| Tests | Node's built-in test runner (`node --test`) |
| Hosting | Vercel (client), Render (API) |

## Design decisions

**Money is stored as integers.** Amounts are `bigint` values in the smallest currency unit (paise), never floats. For equal and percentage splits, the leftover paise are distributed so the shares always add up to exactly the expense total, and the server rejects any split that doesn't match.

**Settlements are transactional.** Creating and accepting settlements runs inside a database transaction, and the expense row is locked with `SELECT ... FOR UPDATE`. This prevents two simultaneous requests from settling more than the remaining amount owed.

**Authentication follows token-rotation practice.**
- Access tokens last 15 minutes; refresh tokens last 7 days and are sent as httpOnly cookies.
- Refresh tokens are stored hashed (SHA-256) in a `sessions` table and rotated on every use, so a reused token is rejected.
- Sessions can be revoked on logout.
- Passwords are hashed with bcrypt.
- Login, signup and username-check endpoints are rate limited.

**Requests are validated at the edge.** Every write endpoint validates its body and URL parameters with zod before touching the database, and the schema adds `CHECK` constraints and unique indexes as a second line of defence.

**One origin for the browser.** In production the Vercel client proxies `/api/*` to the backend with a rewrite, so cookies stay same-origin.

## Project structure

```
SplitEase/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── pages/           # Landing, Auth, Dashboard, GroupChat, FriendChat, Profile, ...
│       └── components/
└── Server/                  # Express API
    ├── config/              # env loading, DB pool, cookie options
    ├── routes/              # route definitions
    ├── controllers/         # HTTP layer
    ├── services/            # business logic (auth, groups, friends, ...)
    ├── queries/             # SQL
    ├── validators/          # zod schemas
    ├── middleware/          # rate limiting
    ├── db/                  # Splitwise Schema.sql
    └── test/
```

## API overview

All routes are under `/api`.

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | `signup`, `login`, `getme`, `refresh-token`, `logout`, `check-username` |
| `/api/friends` | search and add friends, friend requests, friend expenses, settlements and settlement requests |
| `/api/groups` | create groups, invitations, group expenses, settlements and settlement requests |
| `/api/activity` | recent activity feed |
| `/api/users` | view a profile (`/:username`), update or delete your account (`/me`) |

## Getting started

### Prerequisites

- Node.js and npm
- PostgreSQL

### 1. Set up the database

Create an empty database and apply the schema:

```bash
createdb splitease
psql -d splitease -f "Server/db/Splitwise Schema.sql"
```

The SQL file is a fresh-database snapshot, not a migration. Apply it only to a new, empty database; do not rerun it against one that already has data.

### 2. Configure and start the API

Create `Server/.env`:

```
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=splitease
DB_HOST=localhost
DB_PORT=5432
JWT_SECRET=replace_with_a_long_random_secret
PORT=3000

# Optional: extra allowed origins, comma separated
# CORS_ORIGINS=https://your-frontend.example.com
```

Keep real credentials in the git-ignored `.env`; never commit them. Then:

```bash
cd Server
npm install
npm start
```

The API starts on `http://localhost:3000`.

### 3. Run the client

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to the URL in `VITE_API_URL`, so set it before starting, for example in `client/.env.local`:

```
VITE_API_URL=http://localhost:3000
```

### Deploying

- **Client (Vercel):** `client/vercel.json` rewrites `/api/*` to the deployed API and everything else to `index.html`. Update the rewrite destination to your own API URL.
- **API (Render or similar):** set the same environment variables as above, set `NODE_ENV=production` so cookies are marked `secure`, and add your frontend origin to `CORS_ORIGINS`.

## Testing

```bash
cd Server
npm test
```

The suite uses Node's built-in test runner and covers:

- request validation (registration, groups, expense participants, malformed IDs)
- equal and percentage splits summing exactly to the total
- settlement rules (only pending requests, never beyond the remaining share, only the sender can cancel)
- refresh-token reuse being rejected
- the login rate limit

These tests run without a live database. The config loader still needs the environment variables above to be set (a `Server/.env` file is enough).

Client checks:

```bash
cd client
npm run lint
npm run build
```

## Known limitations and roadmap

- OTP sign-in and password recovery are not implemented.
- The person adding an expense is always recorded as its payer.
- Balances are tracked per expense; there is no "simplify debts" view yet.
- Tests do not yet run against a real database or exercise concurrent requests.

Planned next:

- [ ] Debt simplification (net balances with the minimum number of payments)
- [ ] Integration tests against a real PostgreSQL instance, including concurrent settlements
- [ ] Choose any group member as the payer of an expense
- [ ] Split the largest frontend components into smaller ones

## Author

**Atharv Satpute**
[LinkedIn](https://www.linkedin.com/in/atharv-s16/) | [GitHub](https://github.com/Atharvs16) | satputeatharv2005@gmail.com