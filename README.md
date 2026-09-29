# Central Service Point: Firebase deploy pack

## 1. Create the Firebase project
1. console.firebase.google.com > Add project.
2. Build > Firestore Database > Create (production mode, region europe-west1 or the closest to you).
3. Build > Authentication > Get started > enable Email/Password > Users > Add user (your admin login). Copy that user's UID.
4. Project settings > Your apps > Web app (</>). Copy the config into `public/firebase-config.js`.
5. Open `firestore.rules` and replace PASTE_ADMIN_UID with the UID from step 3.

## 2. Deploy
```
npm i -g firebase-tools
firebase login
firebase use --add          # pick your project
firebase deploy --only firestore:rules,hosting
```
The site is live at https://<project-id>.web.app. Open `/#/admin`, sign in, and click "Load sample contractors" to seed the database (delete the samples after).

## 3. Email delivery (needs the Blaze pay-as-you-go plan)
1. In the Gmail account, turn on 2-Step Verification and create an App Password.
2. `firebase functions:secrets:set GMAIL_APP_PASSWORD` and paste it.
3. `cd functions && npm install && cd ..`
4. `firebase deploy --only functions`

Quotation requests and new listing requests then email centralservicepoint@gmail.com automatically.

## 4. Before launch
- Firebase console > App Check: enable reCAPTCHA v3 for Firestore to limit spam.
- Add your own domain under Hosting > Add custom domain.
- Replace the privacy and terms placeholder text.
- Contact form still opens the visitor's mail app; move it to a Firestore collection and function if you want it automatic.

## Managing data in the Firebase console
Admin dashboard (`/#/admin`) now has **+ Add contractor** and **Edit** for every field, including logo, cover and gallery image URLs. To use the console instead, edit documents directly:

- `contractors/{id}`: id, slug, name, cat, services[], phone, wa, email, web, address, city, prov, areas[], hours, years, logo, cover, gallery[], certs[], facebook, instagram, desc, status (Draft/Pending/Approved/Suspended), approved, published, featured, created (number, ms). A profile is public only when approved AND published are true.
- `quotationRequests/{id}`: created by the site. Edit `status` (New, Reviewing, Contractor Contacted, Customer Contacted, In Progress, Completed, Closed) and `notes`.
- `messages/{id}`: contact form enquiries.
- Images: upload to Storage in the console (or use any image link) and paste the URL into logo, cover or gallery.

After changing rules or functions, redeploy: `firebase deploy --only firestore:rules,functions`.
