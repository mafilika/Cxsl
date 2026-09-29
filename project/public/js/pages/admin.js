import { renderHeader, renderFooter } from "../modules/partials.js";
import { icon } from "../modules/icons.js";
import { requireRole } from "../modules/auth.js";
import { CATEGORIES, PROVINCES, CITIES_BY_PROVINCE, categoryById, slugify } from "../data/taxonomy.js";
import { escapeHtml, validateForm, isNonEmpty, isValidSaPhone, isValidEmail } from "../modules/validate.js";
import { uploadContractorImage } from "../modules/storage-upload.js";
import { getAllContractorsForAdmin, getContractorPosts, tierRankOf } from "../modules/contractors-api.js";
import {
  collection, addDoc, doc, setDoc, updateDoc, deleteDoc, getDocs, query, where, limit,
  Timestamp, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "../firebase-config.js";

renderHeader();
renderFooter();

const root = document.getElementById("admin-root");
let contractors = [];
let editingId = null; // null = add mode

(async function init() {
  await requireRole(["admin"]);
  await loadList();
  renderShell();
  showList();
})();

async function loadList() {
  contractors = await getAllContractorsForAdmin();
}

function renderShell() {
  root.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
      <div>
        <div class="eyebrow"><span class="eyebrow__bar"></span><span class="eyebrow__label">Admin</span></div>
        <h1 style="font-size:1.6rem;">Manage Contractor Listings</h1>
      </div>
      <button class="btn btn-primary" id="add-new-btn">${icon("plus", 16)} Add Contractor</button>
    </div>
    <div id="admin-alert"></div>
    <div id="admin-view"></div>
  `;
  document.getElementById("add-new-btn").addEventListener("click", () => showForm(null));
}

function alertMsg(type, msg) {
  document.getElementById("admin-alert").innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
}

/* ==================== LIST VIEW ==================== */
function showList() {
  editingId = null;
  const view = document.getElementById("admin-view");
  if (!contractors.length) {
    view.innerHTML = `<div class="card" style="padding:3rem; text-align:center; color:var(--csp-muted);">No contractors yet — click "Add Contractor" to create your first listing.</div>`;
    return;
  }
  view.innerHTML = `<div class="card">${contractors.map(rowHtml).join("")}</div>`;

  view.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => showForm(btn.dataset.edit)));
  view.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => handleDelete(btn.dataset.delete)));
  view.querySelectorAll("[data-toggle-pub]").forEach((btn) => btn.addEventListener("click", () => handleTogglePublish(btn.dataset.togglePub)));
}

function rowHtml(c) {
  const cat = categoryById(c.categoryId);
  const joined = c.joinedAt?.toDate ? c.joinedAt.toDate().toLocaleDateString() : "—";
  return `<div class="admin-list-row">
    <div class="admin-list-row__logo">${c.logoUrl ? `<img src="${c.logoUrl}" alt="">` : icon("building", 20)}</div>
    <div class="admin-list-row__main">
      <div class="admin-list-row__name">${escapeHtml(c.businessName)}</div>
      <div class="admin-list-row__meta">${escapeHtml(cat.name)} · ${escapeHtml(c.city)}, ${escapeHtml(c.province)} · ${c.points || 0} pts · Joined ${joined}</div>
    </div>
    <button class="pub-toggle ${c.published ? "pub-toggle--live" : "pub-toggle--draft"}" data-toggle-pub="${c.id}">${c.published ? "Live" : "Draft"}</button>
    <div class="admin-list-row__actions">
      <button class="btn btn-ghost btn-sm" data-edit="${c.id}">${icon("edit", 14)}</button>
      <button class="btn btn-ghost btn-sm" data-delete="${c.id}" style="color:var(--csp-danger);">${icon("trash", 14)}</button>
    </div>
  </div>`;
}

async function handleTogglePublish(id) {
  const c = contractors.find((x) => x.id === id);
  await updateDoc(doc(db, "contractors", id), { published: !c.published });
  c.published = !c.published;
  showList();
}

async function handleDelete(id) {
  const c = contractors.find((x) => x.id === id);
  if (!confirm(`Delete "${c.businessName}"? This can't be undone.`)) return;
  await deleteDoc(doc(db, "contractors", id));
  contractors = contractors.filter((x) => x.id !== id);
  alertMsg("success", "Listing deleted.");
  showList();
}

/* ==================== ADD/EDIT FORM ==================== */
function showForm(id) {
  editingId = id;
  const c = id ? contractors.find((x) => x.id === id) : null;
  const view = document.getElementById("admin-view");

  const todayStr = new Date().toISOString().slice(0, 10);
  const joinedStr = c?.joinedAt?.toDate ? c.joinedAt.toDate().toISOString().slice(0, 10) : todayStr;

  view.innerHTML = `
    <div style="margin-bottom:1rem;">
      <button class="btn btn-ghost btn-sm" id="back-to-list">${icon("chevronLeft", 15)} Back to list</button>
    </div>
    <div class="card" style="padding:1.75rem;">
      <h2 style="font-size:1.15rem; margin-bottom:1.25rem;">${c ? "Edit" : "Add"} Contractor</h2>
      <form id="contractor-form">
        <div class="admin-form-grid">
          <div class="field span-2" data-field="businessName">
            <label>Business name</label>
            <input class="input" name="businessName" value="${c ? escapeHtml(c.businessName) : ""}" required>
            <span class="field-error"></span>
          </div>
          <div class="field">
            <label>Category</label>
            <select class="input" name="categoryId">${CATEGORIES.map((cat) => `<option value="${cat.id}" ${c?.categoryId === cat.id ? "selected" : ""}>${cat.name}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label>Listing tier (badge)</label>
            <select class="input" name="tier">
              <option value="basic" ${c?.tier === "basic" || !c ? "selected" : ""}>Basic (Listed)</option>
              <option value="professional" ${c?.tier === "professional" ? "selected" : ""}>Professional</option>
              <option value="premium" ${c?.tier === "premium" ? "selected" : ""}>Premium Partner</option>
            </select>
          </div>
          <div class="field">
            <label>Province</label>
            <select class="input" name="province" id="a-province">${PROVINCES.map((p) => `<option value="${p}" ${c?.province === p ? "selected" : ""}>${p}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label>City</label>
            <select class="input" name="city" id="a-city">${(CITIES_BY_PROVINCE[c?.province || PROVINCES[0]] || []).map((city) => `<option value="${city}" ${c?.city === city ? "selected" : ""}>${city}</option>`).join("")}</select>
          </div>
          <div class="field" data-field="phone">
            <label>Phone number</label>
            <input class="input" name="phone" value="${c ? escapeHtml(c.phone) : ""}" required>
            <span class="field-error"></span>
          </div>
          <div class="field" data-field="whatsapp">
            <label>WhatsApp number</label>
            <input class="input" name="whatsapp" value="${c ? escapeHtml(c.whatsapp) : ""}" required>
            <span class="field-error"></span>
          </div>
          <div class="field" data-field="email">
            <label>Contact email</label>
            <input class="input" type="email" name="email" value="${c ? escapeHtml(c.email || "") : ""}">
            <span class="field-error"></span>
          </div>
          <div class="field">
            <label>Years operating</label>
            <input class="input" type="number" min="0" name="yearsOperating" value="${c?.yearsOperating ?? ""}">
          </div>
          <div class="field span-2" data-field="description">
            <label>About / business description</label>
            <textarea class="input" name="description" rows="4" required>${c ? escapeHtml(c.description) : ""}</textarea>
            <span class="field-error"></span>
          </div>
          <div class="field span-2">
            <label>Services (one per line)</label>
            <textarea class="input" name="services" rows="3">${c ? escapeHtml((c.services || []).join("\n")) : ""}</textarea>
          </div>
          <div class="field span-2">
            <label>Certifications (one per line, optional)</label>
            <textarea class="input" name="certifications" rows="2">${c ? escapeHtml((c.certifications || []).join("\n")) : ""}</textarea>
          </div>

          <div class="field">
            <label>Points</label>
            <div class="points-stepper">
              <button type="button" id="pts-minus">−</button>
              <input class="input" type="number" name="points" id="pts-input" value="${c?.points ?? 0}" min="0">
              <button type="button" id="pts-plus">+</button>
            </div>
          </div>
          <div class="field">
            <label>Member since</label>
            <input class="input" type="date" name="joinedAt" value="${joinedStr}">
          </div>

          <div class="field" style="flex-direction:row; align-items:center; gap:0.5rem;">
            <input type="checkbox" name="verified" id="a-verified" ${c?.verified ? "checked" : ""}>
            <label for="a-verified" style="margin:0;">Verified badge</label>
          </div>
          <div class="field" style="flex-direction:row; align-items:center; gap:0.5rem;">
            <input type="checkbox" name="published" id="a-published" ${c?.published !== false ? "checked" : ""}>
            <label for="a-published" style="margin:0;">Published (visible in search)</label>
          </div>

          <div class="field">
            <label>Logo</label>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <div class="admin-list-row__logo" id="logo-preview">${c?.logoUrl ? `<img src="${c.logoUrl}" alt="">` : icon("building", 18)}</div>
              <input type="file" id="logo-input" accept="image/png,image/jpeg,image/webp" class="visually-hidden">
              <button type="button" class="btn btn-ghost btn-sm" id="logo-trigger">Upload</button>
            </div>
          </div>
          <div class="field">
            <label>Cover banner image (optional)</label>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <input type="file" id="cover-input" accept="image/png,image/jpeg,image/webp" class="visually-hidden">
              <button type="button" class="btn btn-ghost btn-sm" id="cover-trigger">${c?.coverUrl ? "Change Cover" : "Upload Cover"}</button>
              <span id="cover-status" style="font-size:0.78rem; color:var(--csp-muted);">${c?.coverUrl ? "Cover set" : "No cover yet"}</span>
            </div>
          </div>
        </div>

        <div style="margin-top:1.5rem; display:flex; gap:0.75rem;">
          <button type="submit" class="btn btn-primary" id="save-btn">${c ? "Save Changes" : "Create Listing"}</button>
          <button type="button" class="btn btn-ghost" id="cancel-btn">Cancel</button>
        </div>
      </form>
    </div>

    ${c ? `<div class="card" style="padding:1.75rem; margin-top:1.5rem;" id="posts-section"></div>` : ""}
  `;

  document.getElementById("back-to-list").addEventListener("click", showList);
  document.getElementById("cancel-btn").addEventListener("click", showList);

  document.getElementById("a-province").addEventListener("change", (e) => {
    const citySel = document.getElementById("a-city");
    citySel.innerHTML = (CITIES_BY_PROVINCE[e.target.value] || []).map((city) => `<option value="${city}">${city}</option>`).join("");
  });

  let logoUrl = c?.logoUrl || "";
  let coverUrl = c?.coverUrl || "";
  document.getElementById("logo-trigger").addEventListener("click", () => document.getElementById("logo-input").click());
  document.getElementById("logo-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      logoUrl = await uploadContractorImage(file, id || "temp-" + Date.now(), "logo");
      document.getElementById("logo-preview").innerHTML = `<img src="${logoUrl}" alt="">`;
    } catch (err) { alertMsg("error", err.message); }
  });
  document.getElementById("cover-trigger").addEventListener("click", () => document.getElementById("cover-input").click());
  document.getElementById("cover-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      coverUrl = await uploadContractorImage(file, id || "temp-" + Date.now(), "cover");
      document.getElementById("cover-status").textContent = "Cover set";
    } catch (err) { alertMsg("error", err.message); }
  });

  document.getElementById("pts-minus").addEventListener("click", () => {
    const input = document.getElementById("pts-input");
    input.value = Math.max(0, Number(input.value) - 1);
  });
  document.getElementById("pts-plus").addEventListener("click", () => {
    const input = document.getElementById("pts-input");
    input.value = Number(input.value) + 1;
  });

  const form = document.getElementById("contractor-form");
  form.addEventListener("submit", (e) => handleSubmit(e, c, () => logoUrl, () => coverUrl));

  if (c) renderPostsSection(c.id);
}

async function handleSubmit(e, existing, getLogoUrl, getCoverUrl) {
  e.preventDefault();
  const form = e.target;
  const { valid } = validateForm(form, {
    businessName: (v) => (isNonEmpty(v, 2) ? true : "Required."),
    phone: (v) => (isValidSaPhone(v) ? true : "Enter a valid SA number."),
    whatsapp: (v) => (isValidSaPhone(v) ? true : "Enter a valid SA number."),
    email: (v) => (!v || isValidEmail(v) ? true : "Enter a valid email or leave blank."),
    description: (v) => (isNonEmpty(v, 10) ? true : "Please add a description."),
  });
  if (!valid) return;

  const saveBtn = document.getElementById("save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  try {
    const tier = form.tier.value;
    const businessName = form.businessName.value.trim();
    const baseSlug = slugify(businessName);
    const finalSlug = existing?.slug || (await ensureUniqueSlug(baseSlug));

    const payload = {
      businessName,
      slug: finalSlug,
      categoryId: form.categoryId.value,
      tier,
      tierRank: tierRankOf(tier),
      province: form.province.value,
      city: form.city.value,
      areasServed: existing?.areasServed || [form.city.value],
      phone: form.phone.value.trim(),
      whatsapp: form.whatsapp.value.trim(),
      email: form.email.value.trim(),
      yearsOperating: Number(form.yearsOperating.value) || 0,
      description: form.description.value.trim(),
      services: form.services.value.split("\n").map((s) => s.trim()).filter(Boolean),
      certifications: form.certifications.value.split("\n").map((s) => s.trim()).filter(Boolean),
      points: Number(form.points.value) || 0,
      verified: form.verified.checked,
      published: form.published.checked,
      joinedAt: Timestamp.fromDate(new Date(form.joinedAt.value)),
      logoUrl: getLogoUrl(),
      coverUrl: getCoverUrl(),
      rating: existing?.rating || 0,
      reviewCount: existing?.reviewCount || 0,
      updatedAt: serverTimestamp(),
    };

    if (existing) {
      await updateDoc(doc(db, "contractors", existing.id), payload);
      Object.assign(existing, payload);
      alertMsg("success", "Listing updated.");
    } else {
      payload.createdAt = serverTimestamp();
      const ref = await addDoc(collection(db, "contractors"), payload);
      contractors.unshift({ id: ref.id, ...payload });
      alertMsg("success", "Listing created and published.");
    }
    await loadList();
    showList();
  } catch (err) {
    console.error(err);
    alertMsg("error", "Couldn't save — please check the form and try again.");
    saveBtn.disabled = false;
    saveBtn.textContent = existing ? "Save Changes" : "Create Listing";
  }
}

async function ensureUniqueSlug(base) {
  let candidate = base, n = 0;
  while (n < 20) {
    const snap = await getDocs(query(collection(db, "contractors"), where("slug", "==", candidate), limit(1)));
    if (snap.empty) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Date.now().toString().slice(-5)}`;
}

/* ==================== PROJECT UPDATE POSTS ==================== */
async function renderPostsSection(contractorId) {
  const section = document.getElementById("posts-section");
  section.innerHTML = `<h3 style="font-size:1rem; margin-bottom:1rem;">Project Update Posts</h3><div id="posts-list">Loading…</div>
    <div style="margin-top:1rem; display:flex; gap:0.5rem; align-items:center;">
      <input type="file" id="post-image-input" accept="image/png,image/jpeg,image/webp" class="visually-hidden">
      <button type="button" class="btn btn-ghost btn-sm" id="post-image-trigger">Choose Photo</button>
      <input class="input" id="post-caption" placeholder="Caption, e.g. 'RDP 4-room renovation — project started!'" style="flex:1;">
      <button type="button" class="btn btn-primary btn-sm" id="post-submit">Post</button>
    </div>`;

  let pendingImageUrl = "";
  document.getElementById("post-image-trigger").addEventListener("click", () => document.getElementById("post-image-input").click());
  document.getElementById("post-image-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const trigger = document.getElementById("post-image-trigger");
    trigger.textContent = "Uploading…";
    try {
      pendingImageUrl = await uploadContractorImage(file, contractorId, "posts");
      trigger.textContent = "Photo attached ✓";
    } catch (err) { alertMsg("error", err.message); trigger.textContent = "Choose Photo"; }
  });

  document.getElementById("post-submit").addEventListener("click", async () => {
    const caption = document.getElementById("post-caption").value.trim();
    if (!caption && !pendingImageUrl) return;
    await addDoc(collection(db, "contractors", contractorId, "posts"), {
      caption, imageUrl: pendingImageUrl, createdAt: serverTimestamp(),
    });
    document.getElementById("post-caption").value = "";
    pendingImageUrl = "";
    document.getElementById("post-image-trigger").textContent = "Choose Photo";
    loadPosts(contractorId);
  });

  loadPosts(contractorId);
}

async function loadPosts(contractorId) {
  const posts = await getContractorPosts(contractorId);
  const list = document.getElementById("posts-list");
  if (!posts.length) {
    list.innerHTML = `<p style="font-size:0.85rem; color:var(--csp-muted);">No posts yet.</p>`;
    return;
  }
  list.innerHTML = posts.map((p) => `
    <div class="post-row">
      ${p.imageUrl ? `<img src="${p.imageUrl}" alt="">` : ""}
      <div style="flex:1;">
        <p style="font-size:0.85rem;">${escapeHtml(p.caption)}</p>
        <button class="btn btn-ghost btn-sm" data-delete-post="${p.id}" style="margin-top:0.5rem; color:var(--csp-danger);">Delete</button>
      </div>
    </div>`).join("");

  list.querySelectorAll("[data-delete-post]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await deleteDoc(doc(db, "contractors", contractorId, "posts", btn.dataset.deletePost));
      loadPosts(contractorId);
    });
  });
}
