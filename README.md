# JusTimCase

A legal case-management dashboard for a small law firm — clients, cases, appointments, and documents — backed by Firebase (Auth, Firestore, Storage).

## Development

```bash
npm install
npm run dev
```

## Firebase Setup

This app needs a real Firebase project to run against. It has none configured by default — every `VITE_FIREBASE_*` variable is empty until you supply your own. Until you complete the steps below, `npm run dev` will show a blank page — this is expected, since the app can't resolve an auth state against empty config.

1. Create a project at the [Firebase console](https://console.firebase.google.com/).
2. Enable **Authentication** → Sign-in method → **Email/Password**.
3. Create a **Firestore** database (any region, start in production mode — the rules in `firestore.rules` lock it down).
4. Create a **Storage** bucket (the rules in `storage.rules` lock it down).
5. In Project Settings → General → Your apps, add a **Web app** and copy its config values into a `.env` file at the repo root (copy `.env.example` to `.env` first, then fill in the six `VITE_FIREBASE_*` values).
6. Deploy the security rules (requires the [Firebase CLI](https://firebase.google.com/docs/cli), `firebase login`, and `firebase use <your-project-id>` first):
   ```bash
   firebase deploy --only firestore:rules,storage
   ```

## Seeding Data

To populate the app with the original demo data (3 attorneys, 4 clients, 4 cases, 4 appointments, 6 documents):

1. In Project Settings → Service Accounts, generate a new private key and save it as `scripts/serviceAccountKey.json` (git-ignored — never commit this file), or set `GOOGLE_APPLICATION_CREDENTIALS` to its path.
2. Run:
   ```bash
   npm run seed
   ```
3. The script prints the 3 seeded attorney emails and a shared password — use either to sign in at `/login`.

Re-running `npm run seed` refuses to run twice (it writes a `_seed/status` marker). Pass `--force` to re-seed anyway.
