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

Visit `/admin`. Unauthenticated visitors are redirected to `/admin/login`. Sign in with the account you created, enter the six-digit code sent to the admin email, then edit your content and select **save changes**. Saved content is visible on the next public page load.

### Admin email verification

Sign-in is protected by a second factor. After the password is verified, a six-digit, single-use code is sent to the registered admin email. The same emailed-code flow protects password resets, changes to the admin email, and password changes in **Settings**.



For Gmail, enable 2-Step Verification and create an App Password; do not use the normal account password. Google only accepts a 16 character App Password over SMTP, and the address that owns the App Password is the one that must be used for `SMTP_USER`. `EMAIL_FROM` is optional and defaults to `SMTP_USER`. When SMTP is not configured, or when the mail server rejects the message, the development server shows the code on the verification screen and in its console. Production never bypasses verification and reports the delivery failure instead. Every successful sign-in also sends a security alert email containing the device, trusted IP address when available, and sign-in time in IST.

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
- **Messages:** paginated contact inbox, read/unread state, reply via email client, delete, and email notifications for new contact submissions.
- **Settings:** change the admin sign-in email and reset the admin password. Both actions require the current password and a one-time code. Email changes send the code to the new address; password changes send it to the registered address. Other active sessions are revoked after either change.

New records open with blank fields. Labels and controls are fixed UI text. No sample names, companies, projects, statistics, or personal copy are saved automatically. Marquee content falls back only to your saved title, subtitle, and location. Empty social and project URLs do not render broken links.

The header **reset** button discards unsaved edits and restores the last saved version. It never inserts demo content. Changes to the portfolio are saved in one transaction. Concurrent edits return a conflict instead of silently overwriting another save. Refresh to load the latest version if a conflict occurs; copy any unsaved work first.

The contact form stores messages in PostgreSQL and reports success only after insertion. When email delivery is configured, each new message is also emailed to every registered admin address after the response is sent. The sender's address is set as **Reply-To**, so you can reply directly from your mail client. A mail failure is logged and does not lose the message from the admin inbox.

On phones, navigation keeps the original vertical sidebar style in a compact 52px rail, with larger touch targets, a highlighted active section, and a vertical scroll indicator. Content fits alongside the rail without horizontal overflow. Scrolling uses the browser's native smooth behavior and respects reduced-motion preferences. Touch devices skip particle rendering, fixed decorative overlays, and automatic reveal animations. The marquee keeps its continuous horizontal scrolling on mobile and desktop, with a static version for reduced-motion preferences. Desktop decoration loads only on eligible devices; scroll progress updates do not trigger React renders. The viewport allows zooming in and returning to the initial scale, while preventing zooming out below the device-width layout.

## Authentication

Custom server-side authentication uses salted scrypt password hashes, random opaque session tokens, and only SHA-256 token hashes in the database. Every sign-in requires a second factor: a six-digit, single-use code emailed to the admin address. Codes are stored as scrypt hashes, expire after 10 minutes, allow five incorrect attempts, and are bound to a short-lived HttpOnly challenge cookie. Password resets and **Settings** changes use the same emailed-code mechanism.

**Keep me signed in for 30 days** is checked by default on the login form. Unchecking it creates a 12-hour session. Both options use persistent cookies, so reopening the browser keeps the admin signed in until the selected expiry. The expiry is fixed from sign-in; activity does not extend it. Existing sessions retain their original expiry until the next sign-in. Logout, password changes, and email changes revoke sessions immediately (the current session is kept after a Settings change). Cookies are HttpOnly and SameSite=Strict, with Secure enabled in production. Every admin API checks the database session; mutations validate the request origin and input.

The forgot-password flow asks for the registered email, sends an OTP, verifies it, and then offers the new-password form. A completed reset signs the admin in and redirects to `/admin`. Unknown email addresses receive the same response and are never told whether an account exists.

Every successful sign-in sends a security alert email with the device, IP address when `TRUST_PROXY=true` provides one, and the time in IST. The alert is sent after the response, so a slow mail server does not delay sign-in.

Rate limits use atomic PostgreSQL counters shared between application instances and server restarts:

| Action | Limit | Window |
| --- | --- | --- |
| Login requests | 30 per client address, 8 per email | 15 minutes |
| Sign-in OTP verification | 20 per client address | 15 minutes |
| Sign-in OTP resend | 5 per admin | 15 minutes |
| Forgot-password requests | 10 per client address, 4 per email | 15 minutes |
| Forgot-password OTP and reset | 20 per client address | 15 minutes |
| Settings requests and OTP verification | 15 per admin | 15 minutes |
| Contact submissions | 10 per client address, 3 per email | 1 hour |
| Admin content and inbox reads | 120 per admin, across sessions | 1 minute |
| Admin saves and message changes/deletions | 30 per admin, across sessions | 1 minute |

Malformed login/contact requests count toward the address quota. Rejected requests return HTTP 429 with a `Retry-After` header and `retryAfterSeconds` in the response. Login and contact forms show a countdown and retain input during the wait. Admin screens show the server's retry message. Logout remains available even when an admin hits a quota. Limits are defined in `src/lib/rate-limit.ts`; session durations are defined in `src/lib/session-policy.ts`; OTP expiry and attempt limits are defined in `src/lib/otp.ts`.

Keep `TRUST_PROXY=false` unless your hosting proxy replaces `X-Forwarded-For` with a trusted client address. With proxy trust disabled, address rate limits use a shared bucket, plus individual email limits.

## Production

Configure `DATABASE_URL`, `APP_URL`, and SMTP settings in the deployment environment. Admin sign-in cannot complete without email delivery in production, and contact notifications use the same SMTP or Resend configuration. Use HTTPS for the admin session cookie. Apply migrations before starting the application; the OTP migration adds the `AdminOtp` table.

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

Unit tests cover password verification, token hashing, content validation, safe links, request size limits, origin checks, and rate-limit responses. The default browser checks run an empty site on port 3100 without connecting to a database, covering the design shell, terminal, protected routes, form cooldowns, the remember choice, contact failure handling, and mobile layout. Set `E2E_BROWSER_CHANNEL=chrome` to use an installed Chrome browser instead of Playwright's bundled Chromium. Database-backed checks complete the emailed-OTP step using the development code returned when SMTP is disabled.

To run database-backed browser checks, use a **dedicated empty test database**. Set `E2E_DATABASE_URL`, `E2E_ADMIN_EMAIL`, and `E2E_ADMIN_PASSWORD`, migrate that database, and provision that account before running `npm run test:e2e`. These checks create temporary test content and restore the original content afterward; never point them at your production database. Security checks also create a temporary admin and verify session persistence/expiry, logout revocation, concurrent rate limits, quota recovery, and admin endpoint coverage. They reset the shared login/contact rate-limit buckets in the test database.

## Main files

The favicon uses the supplied teal monogram image, preserved in `public/brand/portfolio-icon.png`. Run `node scripts/generate-icons.mjs` to regenerate `src/app/favicon.ico` (16/32/48/64px), `src/app/icon.png` (512px), and `src/app/apple-icon.png` (180px). The full artwork is resized without cropping. Next.js automatically includes these icons on public and admin pages.

- `src/app`: public/admin pages and HTTP APIs.
- `src/components/portfolio`: components adapted from the supplied design.
- `src/components/admin`: login and OTP flows, content editor, inbox, and security settings.
- `src/lib`: Prisma access, content validation, authentication, OTP, email delivery, rate limits, and request checks.
- `prisma/schema.prisma` and `prisma/migrations`: PostgreSQL schema and migrations, including emailed OTP challenges.
- `scripts/create-admin.ts`: create accounts or rotate passwords without registration or default credentials.
