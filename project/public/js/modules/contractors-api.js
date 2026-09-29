import {
  collection, query, where, orderBy, limit, getDocs, doc, getDoc, startAfter,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "../firebase-config.js";

const TIER_RANK = { premium: 0, professional: 1, basic: 2 };

export async function searchContractors({
  q = "", categoryId = "", province = "", city = "", verifiedOnly = false,
  sort = "relevance", pageSize = 24, cursor = null,
} = {}) {
  const col = collection(db, "contractors");
  const clauses = [where("published", "==", true)];
  if (categoryId) clauses.push(where("categoryId", "==", categoryId));
  if (city) clauses.push(where("city", "==", city));
  else if (province) clauses.push(where("province", "==", province));

  let orderClauses;
  if (sort === "rating") orderClauses = [orderBy("rating", "desc")];
  else if (sort === "points") orderClauses = [orderBy("points", "desc")];
  else orderClauses = [orderBy("tierRank", "asc"), orderBy("points", "desc")];

  let qRef = query(col, ...clauses, ...orderClauses, limit(pageSize));
  if (cursor) qRef = query(col, ...clauses, ...orderClauses, startAfter(cursor), limit(pageSize));

  const snap = await getDocs(qRef);
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (verifiedOnly) results = results.filter((c) => c.verified);
  if (q) {
    const needle = q.toLowerCase();
    results = results.filter((c) =>
      c.businessName?.toLowerCase().includes(needle) ||
      c.categoryId?.toLowerCase().includes(needle) ||
      c.description?.toLowerCase().includes(needle));
  }
  return { results, lastDoc: snap.docs[snap.docs.length - 1] || null, hasMore: snap.docs.length === pageSize };
}

export async function getContractorBySlug(slug) {
  const qRef = query(collection(db, "contractors"), where("slug", "==", slug), where("published", "==", true), limit(1));
  const snap = await getDocs(qRef);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function getContractorById(id) {
  const snap = await getDoc(doc(db, "contractors", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** One row per category on the homepage — top contractors in that category by tier/points. */
export async function getContractorsByCategory(categoryId, count = 8) {
  const qRef = query(
    collection(db, "contractors"),
    where("published", "==", true),
    where("categoryId", "==", categoryId),
    orderBy("tierRank", "asc"),
    orderBy("points", "desc"),
    limit(count)
  );
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** "New Contractors" homepage section — most recently added listings. */
export async function getNewestContractors(count = 8) {
  const qRef = query(collection(db, "contractors"), where("published", "==", true), orderBy("joinedAt", "desc"), limit(count));
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getFeaturedContractors(count = 6) {
  const qRef = query(
    collection(db, "contractors"),
    where("published", "==", true),
    where("tierRank", "==", 0),
    orderBy("points", "desc"),
    limit(count)
  );
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** All contractors, for the admin management list. */
export async function getAllContractorsForAdmin() {
  const snap = await getDocs(query(collection(db, "contractors"), orderBy("joinedAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getContractorPosts(contractorId, count = 20) {
  const qRef = query(collection(db, "contractors", contractorId, "posts"), orderBy("createdAt", "desc"), limit(count));
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function tierRankOf(tier) { return TIER_RANK[tier] ?? 2; }
