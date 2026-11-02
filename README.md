# SplitEase

> **Live application:** [splits-ease.vercel.app](https://splits-ease.vercel.app/)

SplitEase is a full-stack expense-sharing application for keeping track of shared spending with friends and groups. Create expenses, see who owes whom, and record or request settlements from one dashboard.

## What you can do

- Create an account and sign in with a username or phone number.
- Add friends and manage friend requests.
- Create groups, invite members, and share group expenses.
- Add expenses with participant splits and track balances.
- Request, accept, and record settlements.
- Review recent activity and update your profile.
- Use the responsive dashboard on desktop and mobile.

## Technology

| Area | Technologies |
| --- | --- |
| Frontend | React, Vite, React Router |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Validation and authentication | Zod, JWT, bcrypt, HTTP-only refresh-token cookies |
| Deployment | Vercel (client), Render (API) |

## Architecture

```text
client/                 React single-page application
  src/
    components/         Shared UI components
    pages/              Landing, authentication, dashboard, and profile pages
    api.js              Shared API URL helper

Server/                 Express API
  controllers/          HTTP request handlers
  services/             Application and authentication logic
  queries/               PostgreSQL queries
  validators/            Request validation
  db/                    Database schema snapshot
```

In production, the client sends API calls to its own Vercel origin; [`client/vercel.json`](client/vercel.json) rewrites `/api/*` to the Render API. This keeps the HTTP-only refresh-token cookie first-party. Local Vite development uses `VITE_API_URL` to proxy API requests to the configured backend. Authentication uses short-lived access tokens and rotating refresh-token cookies.

The API allows the production client and local Vite origins by default. Add any additional browser origins, such as a Vercel preview deployment, to Render's `CORS_ORIGINS` environment variable as a comma-separated list. Set `NODE_ENV=production` on Render so refresh cookies are marked `Secure`.

## Run locally

### Prerequisites

- Node.js and npm
- PostgreSQL

### 1. Create a database

Create an empty PostgreSQL database, then apply [`Server/db/Splitwise Schema.sql`](Server/db/Splitwise%20Schema.sql). This file is a **fresh-database schema snapshot**, not an upgrade migration. Do not apply it to an existing database; use data-preserving migrations for upgrades.

### 2. Configure and start the API

Create `Server/.env`:

```dotenv
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=splitease
DB_HOST=localhost
DB_PORT=5432
JWT_SECRET=replace_with_a_long_random_secret
PORT=3000
NODE_ENV=development
```

Keep actual credentials and secrets out of source control.

```powershell
Set-Location Server
npm install
npm start
```

The API starts on port `3000` unless `PORT` is set.

### 3. Configure and start the client

Set `VITE_API_URL` to the API URL in `client/.env.local` (for example, `http://localhost:3000`). Vite proxies local `/api` requests to that target.

```powershell
Set-Location client
npm install
npm run dev
```

The production API destination is configured in `client/vercel.json`; no API URL build variable is required on Vercel.

## Quality checks

Run these from their respective directories:

```powershell
# client/
npm run lint
npm run build

# Server/
npm test
```

## Project scope

The current authentication flow supports username/phone and password sign-in. OTP sign-in and password recovery are not currently implemented.
