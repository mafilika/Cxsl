import { doc, setDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db, auth } from "../firebase-config.js";

let cache = new Set();
let hydrated = false;
const GUEST_KEY = "csp:guest-favourites";

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  if (auth.currentUser) {
    const snap = await getDocs(collection(db, "favourites", auth.currentUser.uid, "items"));
    cache = new Set(snap.docs.map((d) => d.id));
  } else {
    try { cache = new Set(JSON.parse(localStorage.getItem(GUEST_KEY) || "[]")); } catch { cache = new Set(); }
  }
}

export function isFavourited(id) { return cache.has(id); }

export async function toggleFavourite(id) {
  await hydrate();
  const nowFav = !cache.has(id);
  if (nowFav) cache.add(id); else cache.delete(id);
  if (auth.currentUser) {
    const ref = doc(db, "favourites", auth.currentUser.uid, "items", id);
    if (nowFav) await setDoc(ref, { savedAt: Date.now() }); else await deleteDoc(ref);
  } else {
    localStorage.setItem(GUEST_KEY, JSON.stringify([...cache]));
  }
  return nowFav;
}
