# xOps

React + Vite frontend scaffolded from the PMIS / UIDAI design system.
This project currently ships the **authentication flow only** (login, forgot
password, reset password) — same design and folder structure as the source
app, trimmed down to the login screens.

## Getting started

```bash
npm install
npm run dev
```

The app opens on the Vite dev server and redirects to `/login`.

## Routes

| Path                | Screen           |
| ------------------- | ---------------- |
| `/login`            | UIDAI secure login (username + OTP) |
| `/forgot-password`  | Request reset link |
| `/reset-password`   | Set a new password |

## Structure

```
src/
  api/            REST client + auth endpoints
  assets/         logo, background, css/
  pages/          Uidailogin, ForgotPassword, ResetPassword
  store/project/  uiStore (global UI state)
  App.jsx         router (auth routes)
  main.jsx        entry point
```

Configure the backend base URL via `VITE_API_BASE_URL` in `.env.development`.
