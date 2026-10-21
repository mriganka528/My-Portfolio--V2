# Developer portfolio

A personal portfolio site with a private admin panel for editing the content and reading contact messages.

Built with Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion, PostgreSQL, and Prisma.

## Features

- Public portfolio with profile, skills, projects, experience, and a contact form.
- Private admin panel with login, content editor, message inbox, and account settings.
- Email verification: a one-time code is required to sign in, reset the password, or change account settings.
- Sign-in alerts: every successful login sends an email with the device, IP address, and time.
- Responsive layout that keeps the vertical navigation on mobile.

## Requirements

- Node.js 22.12 or later (Node.js 24 LTS recommended)
- A PostgreSQL database
- An SMTP account for sending verification codes

## Quick start

```bash
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

Set `DATABASE_URL` and `APP_URL` in `.env`, then:

```bash
npm run db:migrate          # create the tables
npm run admin:create        # create the admin account
npm run dev
```

Open `http://localhost:3000`. The public page renders without a database; editing, signing in, and messages need one.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `APP_URL` | yes | Exact site origin, used for cookie and origin checks |
| `TRUST_PROXY` | no | `true` only when a trusted proxy sets `X-Forwarded-For` |
| `SMTP_HOST` | for email | Mail server host |
| `SMTP_PORT` | for email | Mail server port (usually `587` or `465`) |
| `SMTP_SECURE` | for email | `true` for implicit TLS, typically port `465` |
| `SMTP_USER` | for email | Mail account used to sign in to the server |
| `SMTP_PASS` | for email | Password or app password for that account |
| `EMAIL_FROM` | no | From address, defaults to `SMTP_USER` |
| `EMAIL_REPLY_TO` | no | Optional reply-to address |

`.env` holds credentials and is never committed. Keep it local, use a separate mail account, and rotate anything that was pasted into chat or a commit.

## Admin account

```bash
npm run admin:create                                  # prompts for email and password
npm run admin:create -- --email you@example.com       # non-interactive email
npm run admin:create -- --email you@example.com --update-password
```

Passwords must be 12–128 characters. The script creates the account only; it never seeds content.

## Email verification

Sign-in is two steps: the password, then a six-digit code emailed to the admin address. The same code flow protects password resets and changes made in **Settings**.

Any provider that speaks SMTP works. If your provider offers app passwords, use one instead of the account password.

Until mail is configured, development shows the code on screen and in the server log. Production requires working mail delivery.

## Admin panel

`/admin` redirects to the login screen when signed out.

- **Profile** — name, titles, bios, about cards, social links, statistics, marquee, footer.
- **Skills** — add, edit, delete, reorder, set proficiency and icon.
- **Projects** — add, edit, delete, reorder, set accent, status, stack, and links.
- **Experience** — add, edit, delete, and reorder work history; show or hide the section.
- **Messages** — contact inbox with read state, reply, and delete.
- **Settings** — change the admin email and reset the admin password. Both ask for the current password and a one-time code, and revoke the other active sessions.

Everything saves to the database. There is no demo content, no default password, and no browser-side storage.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:dev -- --name <change>` | Create a new migration |
| `npm run admin:create` | Create or update the admin account |
| `npm run lint` / `npm run typecheck` / `npm test` | Code checks |
| `npm run test:e2e` | Browser checks |

## Tests

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser checks run against an empty site and do not need a database. Checks that do need one expect a **separate empty test database**, set through `E2E_DATABASE_URL`, `E2E_ADMIN_EMAIL`, and `E2E_ADMIN_PASSWORD`. Never point them at the live database.

## Deploying

1. Set `DATABASE_URL`, `APP_URL`, and the mail variables in the hosting environment.
2. Run `npm run db:migrate` against the production database.
3. Serve the app over HTTPS. A Node.js host is required; this app cannot be exported as static HTML.

```bash
npm run build
npm start
```

## Security notes

- Passwords and verification codes are stored as salted hashes, never in plain text.
- Sessions use random opaque tokens; only token hashes are stored.
- Cookies are `HttpOnly` and `SameSite=Strict`, and `Secure` in production.
- Mutating endpoints check the request origin and reject cross-site requests.
- Sign-in, verification, and contact endpoints are rate limited.
- Unknown email addresses always get the same answer, so the panel cannot be used to discover accounts.

## Project layout

```
src/app             public pages, admin pages, and API routes
src/components      portfolio UI, admin UI, and shared components
src/lib             database access, validation, auth, email, rate limits
prisma              schema and migrations
scripts             admin provisioning and icon generation
```
