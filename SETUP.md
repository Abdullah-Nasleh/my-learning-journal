# My Learning Journal — private cloud sync

This is an upgraded copy of your existing project. It retains your entry forms, categories, filters, JSON backup, installable PWA, and icons. It adds an email/password login and a Supabase database secured with row-level security.

**Important: Your ZIP contained project code, not entries stored in your MacBook's browser. Do not clear browser storage, uninstall the old app, or delete old journal data. Export a JSON backup from your current online journal FIRST, before publishing these new files.** Save the exported JSON privately, not in GitHub.

## A. Back up existing entries BEFORE uploading the upgrade

1. On the MacBook in the SAME browser you used to write journal entries, open your current GitHub Pages site.
2. Click **Export JSON** and save the file privately (for example, in a local backed-up folder). Confirm it contains your expected entries. Never upload that JSON to GitHub.
3. If you made different entries on the phone, repeat the export there; you can import both later.
4. Keep both backups. This upgrade is not yet tested against your live project until you configure and deploy it.

## B. Supabase database + login

1. Create a Supabase project at https://supabase.com/dashboard . Store your database password privately.
2. In **SQL Editor**, paste the contents of `supabase-schema.sql`, run it, and check for success. It creates `journal_entries` and `journal_categories`, and per-user RLS policies. No anonymous database role has access.
3. In **Authentication → Users**, create/invite your own user email securely using the dashboard's offered flow. Set or recover your password through Supabase; don't place it in any code or share it here. Email confirmation may be required.
4. In **Authentication settings**, **disable public signups** if this journal is for your use only. Keep email/password sign-in enabled.
5. In **Authentication → URL Configuration**, set Site URL to your GitHub Pages address such as `https://abdullah-nasleh.github.io/my-learning-journal/` and include it in redirect allow-list for any email confirmation/recovery flows. If password recovery requires redirect setup, use those same addresses.
6. In **Project Settings → API / API Keys**, copy the project URL and **publishable key** (or legacy anon public key). Edit `config.js`:

   ```javascript
   window.JOURNAL_CONFIG = {
     supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
     supabaseAnonKey: 'YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY'
   };
   ```

   **NEVER use a `service_role`, secret key, or database password here.** The publishable/anon key is safe to appear in browser code *only because RLS and grants protect the data.*

## C. Publish

1. In GitHub Desktop, open the repository `my-learning-journal` (or clone it if necessary).
2. Copy the **contents** of this ZIP's `my-learning-journal-private-sync` folder into the **root** of that repository. Do not create a second nested project folder. Include `config.js` and the entire `icons` folder.
3. Do **not** upload journal JSON exports, passwords, or private keys. `supabase-schema.sql` and `SETUP.md` contain setup instructions only and can remain in your repo.
4. Commit and **Push origin**. GitHub Pages branch should be `main`, folder `/(root)`.
5. Open the Pages website, refresh and sign in. If it shows a setup error, check `config.js` and re-push. GitHub Pages deployment may take a few minutes.

## D. Move existing journal entries safely

**Recommended:** After signing in, click **Import JSON**, select your saved backup from the MacBook, and confirm. Repeat using the phone backup if applicable. The import adds missing entries and skips existing IDs; it does not delete cloud entries. Verify you see all entries before modifying your old local copies.

**Alternative:** Click **Copy old device entries** on the *same browser and URL* where the old application had saved entries. This copies old IndexedDB entries to your account without deleting the local copy. If the upgrade is served from a different origin or different browser, this will find no old entries; use the JSON backups instead.

## E. Test

1. Sign in on your MacBook; create a test entry and confirm it appears.
2. Sign in with the **same email/password** on your phone and verify that entry appears. If the page was already open, refresh it.
3. Edit a test entry on the phone, then refresh your MacBook to confirm it changed.
4. Sign out and verify the entries are no longer displayed. Create another user only if you intentionally need a second account; its data should remain isolated under the RLS policies.

## Important limitations and security notes

- The GitHub Pages URL and login form remain **publicly accessible**. Journal data is protected by Supabase authentication and database RLS, not by making the page URL secret.
- This is an online-first version: **internet is required** to load/save/sync journal entries. It does not implement offline writes or real-time collaborative updates. The PWA shell may install, but journal editing while offline will not sync.
- Refreshing the page or returning to the browser updates entries; automatic instant syncing between already-open devices is not guaranteed.
- Do not upload sensitive files or database secret keys to your public repository.
- Secure your Supabase account with MFA where available, use a strong unique password, and regularly **Export JSON** backups to a secure location. Private account access does not constitute end-to-end encryption; cloud service administrators may be able to access stored data.
- Database schema was reviewed for per-user RLS but cannot be fully security-tested against your live Supabase environment from this chat; verify access controls before entering highly sensitive information.
