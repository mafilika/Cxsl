const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Mirrors users/{uid}.role into the auth token's custom claim, which is
 * what firestore.rules and storage.rules actually check. A user editing
 * their own Firestore doc can't grant themselves "admin" this way — only
 * this server-side trigger can set the claim, and only once (see below).
 */
exports.onUserProfileWrite = functions.firestore
  .document("users/{uid}")
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after) return null;

    const { uid } = context.params;
    const user = await admin.auth().getUser(uid);
    if (user.customClaims?.role) return null; // role can only be set once through this path

    // "admin" is NOT in this list on purpose — the very first admin account
    // must be promoted manually (see README/DEPLOYMENT notes: a one-off
    // `firebase auth:import` or calling setUserRole via the emulator/console).
    // This stops anyone from registering and marking themselves admin.
    const allowedSelfRoles = ["customer"];
    if (!allowedSelfRoles.includes(after.role)) return null;

    await admin.auth().setCustomUserClaims(uid, { role: after.role });
    return null;
  });

/** Admin-only callable to promote another account (e.g. a second admin, or
 * a support staff member) — must be called by an existing admin. */
exports.setUserRole = functions.https.onCall(async (data, context) => {
  if (context.auth?.token?.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admins only.");
  }
  const { targetUid, role } = data;
  if (!["customer", "admin"].includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid role.");
  }
  await admin.auth().setCustomUserClaims(targetUid, { role });
  await admin.firestore().doc(`users/${targetUid}`).update({ role });
  return { ok: true };
});
