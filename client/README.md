# SplitEase client

The client uses React, React Router, and Vite. For full-stack setup and the required API configuration, see the repository [README](../README.md).

```powershell
npm install
npm run dev
```

In production, API requests use the same-origin `/api` path and Vercel rewrites them to the Render API, keeping refresh cookies first-party. The production API destination is configured in `vercel.json`. During local development, set `VITE_API_URL` in `.env.local` (for example, `http://localhost:3000`) to configure Vite's API proxy.

Run the client checks with:

```powershell
npm run lint
npm run build
```
