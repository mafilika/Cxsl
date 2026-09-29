# Central Service Point — Simplified Rebuild

## What changed from the previous version

- **No contractor self-registration, no billing, no 60-day trial flow.** All
  of that code still exists from the earlier build if you want to bring it
  back later — this version just doesn't use it.
- **You (the admin) manually create every contractor listing** from
  `/admin.html` — business details, photos, points, and a "member since"
  date, all in one form.
- **Contractor profile pages** are redesigned around the Facebook-group-style
  reference screenshot: cover banner, circular overlapping logo, a points
  badge, "Member of Central Service Point since [date]", an About Me section,
  and a "Project Updates" post feed (photo + caption, admin-managed from the
  contractor's edit screen in `/admin.html`).
- **Homepage** now shows a horizontally-scrollable row of contractors for
  every category that actually has listings, a "New Contractors" row sorted
  by join date, and a blog preview section.
- **Points/badges**: every contractor has a `points` number field, shown as
  a pill badge on their profile and card. For now it's admin-adjustable
  (a stepper in the add/edit form) — there's no automatic scoring yet. If you
  want points to accrue automatically later (e.g. +5 per review, +10 per
  completed project post), that's a small Cloud Function trigger to add.

## Bootstrapping your first admin account

Since there's no self-registration for admins (on purpose — nobody should be
able to sign up and grant themselves admin), the very first admin account
has to be created by hand, once:

1. Register a normal account at `/register.html` (it'll be created as a
   "customer" role).
2. In the Firebase Console → Firestore → `users` collection, find your user
   document and manually change `role` from `"customer"` to `"admin"`.
3. That Firestore change alone isn't enough to unlock admin pages (rules
   check the *auth token's* custom claim, not the Firestore field) — call
   the `setUserRole` function once via the Firebase emulator or a temporary
   script, OR simplest for a one-person setup: in the Firebase Console →
   Authentication → find your user → there's no UI for custom claims there,
   so run this once from your machine with the Admin SDK:
   ```js
   // one-off-set-admin.js — run with: node one-off-set-admin.js
   const admin = require("firebase-admin");
   admin.initializeApp({ credential: admin.credential.applicationDefault() });
   admin.auth().setCustomUserClaims("YOUR_UID_HERE", { role: "admin" })
     .then(() => console.log("Done")).catch(console.error);
   ```
   Get `YOUR_UID_HERE` from Firebase Console → Authentication → your user's
   row. Run `gcloud auth application-default login` first if you haven't
   used Application Default Credentials on this machine before.
4. Log out and back in (custom claims only apply on a fresh token) — you
   should now be able to open `/admin.html`.

Every admin account after that first one can be promoted normally by an
existing admin calling `setUserRole` from within the app (a small settings
screen for this isn't built yet, but the function is ready).

## Deferred for later (code exists from the earlier build, just unused now)

- Contractor self-registration + onboarding wizard
- 60-day free trial + PayFast recurring billing
- Contractor's own dashboard (leads inbox, their own profile editing)
- SEO landing pages at `/contractors/:province/:category`

Say the word when you want any of these reactivated.
