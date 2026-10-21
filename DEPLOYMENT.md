# Deploy your AITU Lost & Found website

This archive contains the complete source of the website you received, plus its tests and these deployment instructions. All four files in `dist` match the deployed source exactly. The original source commit is `1f43cf2d9b4d7f173f6fe4607baac8a4d1ff2386`.

## 1. Extract the ZIP

Choose **Extract all** in Windows. Open the extracted `aitu-lost-found` folder. Keep the file and folder names unchanged.

Files included:

| File | Purpose |
| --- | --- |
| `dist/index.html` | All page markup, forms, dialogs and navigation |
| `dist/styles.css` | Complete styling and responsive phone layouts |
| `dist/app.js` | All screen interactions, photo upload, inline SVG illustrations, claims and coordinator demo |
| `dist/model.js` | Sample listings, search/filter rules, validation and browser-local storage |
| `tests/scenarios.mjs` | 18 automated scenario checks |
| `README.md` | Project context, scope, survey evidence and demonstration steps |
| `.openai/hosting.json` | Original Sites project configuration; not needed by other hosts |
| `package.json` | Optional Node.js module and test settings added for this portable export |
| `start-local.bat` | Optional Windows local-server launcher |
| `DEPLOYMENT.md` | This guide |
| `SHA256SUMS.txt` | File integrity checksums |

There are no missing image downloads, fonts, npm dependencies, API keys or hidden application services. Illustrations are SVG code inside `app.js`; the small site icon is embedded in `index.html`.

## 2. Run it on your own computer

The website uses JavaScript modules, so serve it over HTTP. Double-clicking `index.html` may block JavaScript imports.

If Python is installed:

1. Open a terminal in the extracted `aitu-lost-found` folder.
2. Run:

```sh
python -m http.server 8000 --bind 127.0.0.1 --directory dist
```

3. Open **http://localhost:8000** in your browser.
4. Keep the terminal open while using the site. Press **Ctrl+C** to stop it.

On Windows you can also double-click `start-local.bat`. If your Python command is `python3`, replace `python` with `python3`. If you do not have Python, a local static HTTP server supplied by your editor also works: serve the `dist` folder.

## 3. Deploy it to a static web host

Use a host that serves ordinary HTML, CSS and JavaScript files.

- **Framework:** none / static website.
- **Build command:** none. If an optional command field is shown, leave it empty.
- **Publish/output directory:** `dist`, relative to this project folder.
- **Install command:** none; this website has no package dependencies.
- **Start/server command in production:** none; let the host serve the files.

For a manual upload, upload **all four files inside `dist` together**, preserving their names. `index.html` must end up at the website root, beside `styles.css`, `app.js` and `model.js`.

For deployment from a Git repository, commit this extracted project and configure the publish directory as `dist`. The `.openai/hosting.json` file is only for the original Sites project and is ignored by ordinary static hosts; it is not a reusable new Sites project identity.

The host must serve `.js` files with a JavaScript MIME type. HTTPS is recommended. No SPA fallback, database provisioning, environment variables or server-side code is required.

### Private access

The existing Site's private access is enforced by Sites hosting. It is **not** a login feature in this code. To keep your own deployment private, enable authentication, password protection or restricted access on your chosen host. Exporting this ZIP does not change the existing Site's access.

## 4. Check your deployment

1. Search for **keys** and filter location to **Main entrance**. Open the matching card.
2. Choose **This might be mine**. Submit a test identifying detail and test email. You should see **Demo claim saved**.
3. Open **Report a found item**. Fill the fields and privacy checkbox; optionally choose a JPG, PNG or WebP photo up to 2 MB. Add the item.
4. Find it in **My reports**, then refresh the page. It should still be there if browser storage is enabled.
5. Open **Coordinator demo**. Review the demo claim, mark an item returned, then choose **Returned to owner** in the status filter.
6. Check the two main screens on your phone or with your browser's responsive mode at 360 px wide.

If the page looks unstyled, check that `styles.css` was uploaded beside `index.html`. If buttons do not work, check that both `.js` files were uploaded, are served with the correct MIME type, and that you opened an HTTP/HTTPS URL rather than a local file.

## 5. Optional automated tests

With a current Node.js installation, run from this project folder:

```sh
node tests/scenarios.mjs
```

Or run `npm test`. No `npm install` is necessary. Expected result: **18 scenario checks passed.** Node.js is used only for tests, not for hosting the website.

## What this prototype stores

Reports, uploaded photos, claims and flags use browser `localStorage`. They stay in the browser and origin where they were created. A new hosting address starts with the included sample listings; it does not import data saved at the original Site. Clearing browser data removes local reports.

There is no shared database, university login/registration, real email delivery or verified staff account. The coordinator screen is deliberately a local demonstration. These are prototype limits, not missing source files. Real shared use requires adding a backend and authentication.
