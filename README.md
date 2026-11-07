# AITU Lost & Found

### A simple platform for finding lost items at Astana IT University

**AITU Lost & Found** is a web application designed to help students report lost and found items at Astana IT University. The platform provides one place where students can publish announcements, search for belongings and contact the owners of found items.

## Project Overview

Students sometimes lose personal belongings at university or find items that belong to other students. It can be difficult to know where to report these situations or how to contact the owner.

Our platform makes this process easier by providing a centralized Lost & Found system.

## Main Features

- **User Registration and Login** — users can create accounts and sign in.
- **Lost Item Reports** — students can publish information about items they have lost.
- **Found Item Reports** — students can report items they have found.
- **Search and Filtering** — users can search for announcements and filter available listings.
- **Item Photos** — users can upload photos of lost or found items.
- **Contact Information** — registered users can view contact details provided in announcements.
- **Claims** — users can send claims about items they believe belong to them.
- **My Reports** — users can manage their own announcements.
- **Coordinator Management** — the coordinator can review claims and flagged reports and manage announcements.
- **Statistics** — the website provides information about Lost & Found activity.

## Technologies Used

| Technology | Purpose |
|---|---|
| HTML | Website structure |
| CSS | Styling and responsive design |
| JavaScript | Frontend functionality |
| Node.js | Server-side environment |
| Turso libSQL | Remote database for deployment |
| SQLite | Local database |
| Vercel | Website hosting and deployment |
| GitHub | Source code and version control |

## Project Structure

```text
lost-found/
├── api/          # API endpoints
├── database/     # Database-related files
├── lib/          # Database and security modules
├── public/       # Frontend pages, styles and assets
├── scripts/      # Project scripts
├── tests/        # Automated tests
├── server.js     # Local development server
├── package.json  # Project dependencies and commands
├── vercel.json   # Vercel configuration
├── README.md     # Project overview
└── DEPLOYMENT.md # Installation and deployment guide
```

## Installation and Local Setup

Requirements:
- Node.js 22.x
- npm

To run the project locally:

1. Clone or download the repository.
2. Open a terminal in the project folder.
3. Install dependencies:

```bash
npm ci
```

4. Start the local server:

```bash
npm start
```

5. Open the following address in your browser:

```text
http://localhost:8000
```

The local application uses SQLite. For remote deployment, configure the Turso database.

## Deployment

The application is deployed using Vercel.

- Hosting platform: Vercel
- Framework preset: Other
- Node.js version: 22.x
- Build command: `npm run build`
- Output directory: `public`

The deployed version uses Turso libSQL as its remote database.

For complete setup instructions, database configuration, environment variables and deployment steps, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Security

The application includes several security measures:

- Passwords are stored using salted scrypt hashes.
- Session cookies use HttpOnly and SameSite settings.
- Secure cookies are enabled on Vercel.
- Database access is handled through server-side API endpoints.
- Database credentials are stored in server-side environment variables.

## Project Links

- **GitHub Repository:** https://github.com/tlmahanalua-blip/lost-found
- **Live Website:** https://lost-found-two-brown.vercel.app/
- **Commit History:** https://github.com/tlmahanalua-blip/lost-found/commits/main

## Project Version

**Version:** 3.2.0

**Project:** AITU Lost & Found

**Purpose:** Helping AITU students report, search for and recover lost belongings.

---

*Developed as a university project at Astana IT University.*
