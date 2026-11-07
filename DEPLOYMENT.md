# AITU Lost & Found — Vercel Deployment Guide

This guide explains how to run, configure and deploy the AITU Lost & Found application.

This version includes user registration, login, database integration, contact information and photo storage. Unlike a static HTML/CSS/JavaScript website, it requires server-side files and a database connection.

## 1. Test the Application Locally

Install Node.js 22 (version 22.13 or newer). Extract the project archive.

Open PowerShell in the project folder containing `package.json` and run:

```bash
npm ci
npm start
```

Open the application in your browser:

http://localhost:8000

The server automatically creates a local SQLite database at `data/lost-found.db`.

Create an account and publish an item report with contact information and a photo. Data remains stored in SQLite after restarting the server.

**Important:** Do not run this version using `python -m http.server`. Python will serve the files but will not run the registration API.

To stop the server, press `Ctrl + C`. To start it again, run `npm start`.

## 2. Create a Database for Vercel

A regular local `.db` file cannot be used as permanent shared storage inside Vercel Functions.

Therefore, the application uses:
- A local SQLite database on your laptop.
- A remote SQLite-compatible database called **Turso libSQL** for Vercel deployment.

### Database setup

1. Open [Turso](https://turso.tech).
2. Create a **libSQL** database compatible with `@libsql/client`. If you are asked to choose between Turso and libSQL database engines, select **libSQL** for this project.
3. Copy the database URL. It should look like `libsql://...`.
4. Create a database authentication token. This must be a database access token, not a general account management token.
5. Save the URL and token securely.

Never put the token in source code, HTML, chat messages or a public GitHub repository.

Documentation: [Turso SDK Reference](https://docs.turso.tech/sdk/ts/reference).

Creating an account, database and selecting a pricing plan must be done manually by the project owner. This code does not automatically create paid resources.

## 3. Upload the Complete Project

The GitHub repository connected to your Vercel project must contain **all** files from the extracted project folder, including:

```text
api/
lib/
public/
scripts/
tests/
database/
package.json
package-lock.json
vercel.json
server.js
```

Do not upload only the `public/` folder or use the old `dist/` folder as the project root.

Do not upload:
- `node_modules/`
- Real `.env` files
- Local `data/` folders containing user information
- SQLite database files containing private data

A safe `.env.example` template can be included in the repository.

## 4. Vercel Configuration

Check the following settings in your Vercel project:

| Setting | Value |
|---|---|
| Root Directory | Folder containing `package.json` and `vercel.json` |
| Framework Preset | Other |
| Node.js Version | 22.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `public` |

The `vercel.json` file already contains the build and output directory configuration.

Remove old manual overrides that point to `dist`.

The serverless function is located in `api/index.js` and handles requests through `/api/index`.

## 5. Environment Variables

Add the following **server-side environment variables** in Vercel:

| Name | Value |
|---|---|
| `TURSO_DATABASE_URL` | URL of your libSQL database |
| `TURSO_AUTH_TOKEN` | Database authentication token |
| `APP_ORIGIN` | Optional: main website address, for example `https://your-project.vercel.app` |
| `ADMIN_EMAILS` | Optional: email address of your already registered coordinator account |

Select the Production environment and Preview if you need a test deployment.

Do not use `NEXT_PUBLIC_` or `VITE_` prefixes for the database token.

**Do not set `DATABASE_URL=file:...` on Vercel.**

When updating an existing version 2 database, first create a backup using the database provider.

Version 3 moves the tables to the following schema:

- `users`
- `categories`
- `items`

A local file-based database copy is not created on Vercel.

After saving the environment variables, run **Redeploy**.

Database tables are created automatically when the first API request is received. Manual SQL execution is not required. The build process does not require database access.

The local `npm start` command connects the 102 coursework records only to the database configured for that environment.

To transfer the coursework records to the remote database from the private project folder:

1. Configure `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in your `.env` file.
2. Run:

```bash
npm.cmd run db:coursework
```

The coursework file `database/assignment3-original.db` is excluded from Git. It does not need to be published separately.

### Coordinator configuration

1. Register your account first.
2. Make sure the account uses your intended email address.
3. Add that email address to `ADMIN_EMAILS`.
4. Redeploy the application.

Multiple email addresses must be separated by commas.

Email ownership is not verified in this educational version. Do not assign coordinator permissions to an email address for an account you have not created yourself.

## 6. Testing After Deployment

After deployment, open the website and perform the following checks:

1. Open the website and wait for the **CONNECTED** status.
2. Click **Create account** and enter your name, email and a password of at least 10 characters.
3. Open **Report an item** and select either **Lost** or **Found**. Enter the item name, category, date, time, location and description.
4. Upload a photo. Enter the contact person's name and email. Phone and Telegram details are optional.
5. Confirm consent to display contact information to registered users. Make sure descriptions and photos do not contain private identification data.
6. Publish the announcement. Open **My Reports** and check the contacts and photo.
7. Open the website in another browser. The announcement should be visible to everyone, while contact information is available after login. Another registered user should be able to submit a claim.
8. In **Manage Reports**, the owner should be able to see claims for their items. Only the owner or coordinator can mark an item as returned.

New data is shared between users rather than being stored only in the browser.

Photos are stored in the database. Passwords are stored as salted scrypt hashes. Session cookies use `HttpOnly`, `SameSite=Lax` and `Secure` settings on Vercel.

## Troubleshooting

- **OFFLINE / Database is not configured:** Check both `TURSO_*` environment variables, make sure the database uses libSQL and run Redeploy.
- **The page opens, but login buttons do not work:** Check that `api/`, `lib/` and `package.json` have been uploaded, not only static files.
- **The old website is still displayed:** Check Root Directory and Output Directory (`public`, not `dist`).
- **npm is not recognized:** Install Node.js, close PowerShell and open it again.
- **Laptop data is not visible on Vercel:** Local SQLite and the remote database are separate databases. Data is not transferred automatically.
- **Password reset:** This feature is not implemented in the current version. Keep your test account password safe.

Do not publish personal information in the educational project without consent. Contact details are visible to any logged-in user. Accounts do not verify university affiliation.

## English Quick Setup

1. Deploy the **entire project**, including `api/` and `lib/`, to your existing GitHub repository connected to Vercel.
2. Use Framework Preset Other, Node.js 22.x, install command `npm ci`, build command `npm run build` and output directory `public`.
3. Create a **Turso libSQL** database. Set the server-only `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` variables in Vercel, then redeploy.
4. Database tables are initialized automatically on the first API request. Register an account and publish an item report.
5. For local use, run `npm ci`, then `npm start`, and open http://localhost:8000. A local SQLite database will be created.

No live deployment or remote database was created as part of preparing this ZIP. Automated local API/database tests passed; browser visual QA was interrupted.

## Official References

- [Vercel — Is SQLite supported in Vercel?](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel)
- [Turso SDK Reference](https://docs.turso.tech/sdk/ts/reference)

---

**Project:** AITU Lost & Found

**Version:** 3.2.0

**Deployment Platform:** Vercel
