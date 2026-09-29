import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  sendEmailVerification, sendPasswordResetEmail, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth, db } from "../firebase-config.js";

export async function registerCustomer({ email, password, firstName, lastName, phone }) {
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "users", cred.user.uid), {
    role: "customer", email, firstName, lastName, phone: phone || "",
    createdAt: serverTimestamp(), emailVerified: false,
  });
  await sendEmailVerification(cred.user);
  return cred.user;
}

export async function loginUser(email, password) {
  return (await signInWithEmailAndPassword(auth, email, password)).user;
}
export async function logoutUser() { await signOut(auth); }
export async function resetPassword(email) { await sendPasswordResetEmail(auth, email); }

export function authState(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return callback(null, null);
    const snap = await getDoc(doc(db, "users", user.uid));
    callback(user, snap.exists() ? snap.data() : null);
  });
}

/** Gate a page to specific roles (e.g. ["admin"] for admin.html). */
export function requireRole(allowedRoles, { redirectTo = "/login.html" } = {}) {
  return new Promise((resolve) => {
    const unsub = authState((user, profile) => {
      unsub();
      if (!user || !profile || !allowedRoles.includes(profile.role)) {
        window.location.href = `${redirectTo}?next=${encodeURIComponent(location.pathname)}`;
        return;
      }
      resolve({ user, profile });
    });
  });
}

export { auth };
