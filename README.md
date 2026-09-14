# Developer portfolio

Next.js App Router implementation of the supplied portfolio and admin design. Uses TypeScript, Tailwind CSS, Framer Motion, PostgreSQL, and Prisma 7. The supplied colors, fonts, vertical navigation, terminal, particle canvas, crosshair cursor, cards, project rows, and admin styling are retained. Fonts are served locally.

## Run locally

Use Node.js 22.12 or later (Node.js 24 LTS recommended).

```powershell
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

If `DATABASE_URL` is already set in `.env`, run `npm run db:migrate` before starting the development server for the first time. `npm install` generates Prisma Client; it does not create database tables.

Then start the application:

```powershell
npm run dev
```

Open `http://localhost:3000`. The portfolio and login screen render without a database URL. Content starts empty. Saving, signing in, and sending messages require the database. There is no demo data, default password, browser storage CMS, or automatic content seed.

If PowerShell blocks `npm.ps1`, use `npm.cmd` in place of `npm`.

## Connect PostgreSQL later

1. Set `DATABASE_URL` in `.env` to your PostgreSQL connection string. For verified TLS connections, use `sslmode=verify-full` to preserve certificate and hostname verification and avoid the `pg` warning about legacy SSL mode aliases.
2. Set `APP_URL` to the exact website origin (`http://localhost:3000` locally, your HTTPS origin in production). Restart the server after environment changes.
3. Apply the included migration and create your admin:

```powershell
npm run db:migrate
npm run admin:create
```

The script prompts for the admin email and a hidden password, followed by password confirmation. Passwords must contain 12–128 characters. It creates only the admin account, without portfolio content.

You can supply an email using `npm run admin:create -- --email <your-email>`. For noninteractive provisioning, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the process environment or local `.env`; remove the plaintext provisioning password afterward. It is not used by the application at runtime.

Visit `/admin`. Unauthenticated visitors are redirected to `/admin/login`. Sign in with the account you created, enter your content, and select **save changes**. Saved content is visible on the next public page load.

To rotate an existing admin's password and revoke all its sessions:

```powershell
npm run admin:create -- --email <your-email> --update-password
```

Use a direct PostgreSQL connection for migrations if your provider requires it. Prisma schema changes during development can be applied with `npm run db:dev -- --name <change-name>`.

### Missing tables on first run

`P2021: The table public.Profile does not exist` means the app reached PostgreSQL, but its schema has not been initialized in that database. Stop the development server, apply the migration, and restart:

```powershell
npm run db:migrate
npm run dev
```

The migration creates the portfolio, authentication, and inbox tables without inserting sample content. Run `npm run admin:create` separately to provision your login. Apply the migration again when switching to a new database; databases that already have the migration will report that nothing is pending.

## Content management

- **Profile:** name, initials, titles, bios, location, availability, about cards, contact copy, social links, statistics, marquee, and footer note.
- **Skills:** create, edit, delete, reorder, set proficiency and Simple Icons slug. Icons use `cdn.simpleicons.org` and fall back to initials.
- **Projects:** create, edit, delete, reorder, set accent/status, stack, and project/source links.
- **Experience:** create, edit, delete, and reorder work history. Use **Show experience section** and save changes to show or hide the public work history section while keeping entries saved. Existing profiles start with it enabled. Apply the experience visibility migration with `npm run db:migrate` before starting the updated app.
- **Messages:** paginated contact inbox, read/unread state, reply via email client, and delete.

New records open with blank fields. Labels and controls are fixed UI text. No sample names, companies, projects, statistics, or personal copy are saved automatically. Marquee content falls back only to your saved title, subtitle, and location. Empty social and project URLs do not render broken links.

The header **reset** button discards unsaved edits and restores the last saved version. It never inserts demo content. Changes to the portfolio are saved in one transaction. Concurrent edits return a conflict instead of silently overwriting another save. Refresh to load the latest version if a conflict occurs; copy any unsaved work first.

The contact form stores messages in PostgreSQL and reports success only after insertion. No email delivery service is needed; messages are read in the admin inbox. It does not send notification emails.

On phones, navigation keeps the original vertical sidebar style in a compact 52px rail, with larger touch targets, a highlighted active section, and a vertical scroll indicator. Content fits alongside the rail without horizontal overflow. Scrolling uses the browser's native smooth behavior and respects reduced-motion preferences. Touch devices skip particle rendering, fixed decorative overlays, and automatic reveal animations. The marquee keeps its continuous horizontal scrolling on mobile and desktop, with a static version for reduced-motion preferences. Desktop decoration loads only on eligible devices; scroll progress updates do not trigger React renders. The viewport allows zooming in and returning to the initial scale, while preventing zooming out below the device-width layout.

## Authentication

Custom server-side authentication uses salted scrypt password hashes, random opaque session tokens, and only SHA-256 token hashes in the database. **Keep me signed in for 30 days** is checked by default on the login form. Unchecking it creates a 12-hour session. Both options use persistent cookies, so reopening the browser keeps the admin signed in until the selected expiry. The expiry is fixed from sign-in; activity does not extend it. Existing sessions retain their original expiry until the next sign-in. Logout and password rotation revoke sessions immediately. Cookies are HttpOnly and SameSite=Strict, with Secure enabled in production. Every admin API checks the database session; mutations validate the request origin and input.

Rate limits use atomic PostgreSQL counters shared between application instances and server restarts:

| Action | Limit | Window |
| --- | --- | --- |
| Login requests | 30 per client address, 8 per email | 15 minutes |
| Contact submissions | 10 per client address, 3 per email | 1 hour |
| Admin content and inbox reads | 120 per admin, across sessions | 1 minute |
| Admin saves and message changes/deletions | 30 per admin, across sessions | 1 minute |

Malformed login/contact requests count toward the address quota. Rejected requests return HTTP 429 with a `Retry-After` header and `retryAfterSeconds` in the response. Login and contact forms show a countdown and retain input during the wait. Admin screens show the server's retry message. Logout remains available even when an admin hits a quota. Limits are defined in `src/lib/rate-limit.ts`; session durations are defined in `src/lib/session-policy.ts`. Authentication and rate limits reuse the existing database tables.

Keep `TRUST_PROXY=false` unless your hosting proxy replaces `X-Forwarded-For` with a trusted client address. With proxy trust disabled, address rate limits use a shared bucket, plus individual email limits.

## Production

Configure `DATABASE_URL` and `APP_URL` in the deployment environment. Use HTTPS for the admin session cookie. Apply migrations before starting the application.

```powershell
npm run db:migrate
npm run build
npm start
```

Builds generate Prisma Client and can run without a database URL. Do not commit `.env` or credentials. Node.js hosting is required; this application uses server routes and cannot be exported as static HTML.

## Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit tests cover password verification, token hashing, content validation, safe links, request size limits, origin checks, and rate-limit responses. The default browser checks run an empty site on port 3100 without connecting to a database, covering the design shell, terminal, protected routes, form cooldowns, the remember choice, contact failure handling, and mobile layout. Set `E2E_BROWSER_CHANNEL=chrome` to use an installed Chrome browser instead of Playwright's bundled Chromium.

To run database-backed browser checks, use a **dedicated empty test database**. Set `E2E_DATABASE_URL`, `E2E_ADMIN_EMAIL`, and `E2E_ADMIN_PASSWORD`, migrate that database, and provision that account before running `npm run test:e2e`. These checks create temporary test content and restore the original content afterward; never point them at your production database. Security checks also create a temporary admin and verify session persistence/expiry, logout revocation, concurrent rate limits, quota recovery, and admin endpoint coverage. They reset the shared login/contact rate-limit buckets in the test database.

## Main files

The favicon uses the supplied teal monogram image, preserved in `public/brand/portfolio-icon.png`. Run `node scripts/generate-icons.mjs` to regenerate `src/app/favicon.ico` (16/32/48/64px), `src/app/icon.png` (512px), and `src/app/apple-icon.png` (180px). The full artwork is resized without cropping. Next.js automatically includes these icons on public and admin pages.

- `src/app`: public/admin pages and HTTP APIs.
- `src/components/portfolio`: components adapted from the supplied design.
- `src/components/admin`: login, content editor, and inbox.
- `src/lib`: Prisma access, content validation, authentication, rate limits, and request checks.
- `prisma/schema.prisma` and `prisma/migrations`: PostgreSQL schema and initial migration.
- `scripts/create-admin.ts`: create accounts or rotate passwords without registration or default credentials.
