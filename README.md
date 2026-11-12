# My Learning Journal — Static PWA

A standalone, English-language personal learning journal built with HTML, CSS, and vanilla JavaScript. No Python, no login, no server database, no third-party scripts.

## Features
- Create, edit, delete and search learning entries
- Categories, dates, tags, statistics and sorting
- Automatic on-device persistence using IndexedDB
- Export all entries to JSON; import a JSON backup to replace local entries
- Responsive mobile UI, PWA install prompt on supported browsers, offline app shell

## Run and publish

**Recommended:** Upload the **contents** of this folder to a static HTTPS host such as GitHub Pages, Netlify, Cloudflare Pages or any HTTPS static hosting provider. No build step or backend is required. The published URL is accessible anywhere. The data remains private to the browser/device and is **not synchronized** between devices.

For local testing, serve this folder on localhost using any static web server (for example VS Code Live Server). Do not open `index.html` directly using `file://`, because PWA/service workers and storage behavior require an HTTP(S) origin. Python is not needed.

On Android, open the HTTPS site in Chrome and use **Install app** or the browser's install menu. On iPhone, open it in Safari, use **Share → Add to Home Screen** (or **Open as Web App**, depending on iOS version). Browser-specific install support varies.

## Backups

Click **Export JSON** and save the downloaded file somewhere safe. Click **Import JSON** to restore; importing **replaces all current entries** on that device after confirmation. Back up before importing.

JSON format:
```json
{
  "app": "My Learning Journal",
  "schemaVersion": 1,
  "exportedAt": "2026-11-12T00:00:00.000Z",
  "entries": []
}
```

## Privacy and limitations

- All data is stored in IndexedDB within the browser or installed PWA. Clearing browser/site data, private browsing, or uninstalling the app may erase it. Export backups regularly.
- No account or cloud sync. A phone and a laptop have independent journals unless you transfer a JSON backup.
- The static files are public when published; your personal entries are not uploaded to the host by this app.
- The app can load offline after a successful initial visit and service worker installation. JSON backups still require user action.
- To migrate from the previous Flask/SQLite version, first export the previous data and convert it to this application's JSON schema. The new app does not automatically read SQLite or the old CSV format.

## Custom categories
In the entry editor, open Category and choose **＋ Add new category…**. Type a name to add it to your choices. Custom categories are stored on this device and included in JSON exports; importing a backup restores them. Existing version 1 JSON backups remain supported.
