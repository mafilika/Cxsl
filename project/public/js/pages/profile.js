import { renderHeader, renderFooter, trustSealSvg, pointsBadgeHtml, memberSinceLabel, relativeTime } from "../modules/partials.js";
import { icon } from "../modules/icons.js";
import { categoryById } from "../data/taxonomy.js";
import { getContractorBySlug, getContractorPosts, searchContractors } from "../modules/contractors-api.js";
import { escapeHtml, validateForm, isNonEmpty, isValidSaPhone, stripDangerousChars, debounceSubmit } from "../modules/validate.js";
import { toggleFavourite, isFavourited } from "../modules/favourites.js";
import { addDoc, collection, serverTimestamp, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db, auth } from "../firebase-config.js";

renderHeader();
renderFooter();

const slug = location.pathname.startsWith("/contractor/")
  ? decodeURIComponent(location.pathname.replace("/contractor/", ""))
  : new URLSearchParams(location.search).get("slug");

const root = document.getElementById("profile-root");

if (!slug) {
  root.innerHTML = notFoundHtml();
} else {
  getContractorBySlug(slug)
    .then(async (c) => {
      if (!c) { root.innerHTML = notFoundHtml(); return; }
      renderProfile(c);
      updateDocumentMeta(c);
      loadPosts(c.id);
      loadReviews(c.id);
      loadSimilar(c);
    })
    .catch((err) => {
      console.error(err);
      root.innerHTML = `<div class="container" style="padding:4rem 0;">Something went wrong loading this profile.</div>`;
    });
}

function notFoundHtml() {
  return `<div class="container" style="padding:4rem 0; text-align:center;">
    <h1>Contractor Not Found</h1>
    <p style="color:var(--csp-muted); margin-top:0.5rem;">This listing may have been removed or is no longer active.</p>
    <a href="/search.html" class="btn btn-primary" style="margin-top:1.5rem;">Browse Contractors</a>
  </div>`;
}

function updateDocumentMeta(c) {
  const cat = categoryById(c.categoryId).name;
  document.title = `${c.businessName} — ${cat} in ${c.city}, ${c.province} | Central Service Point`;
  document.getElementById("meta-description")?.setAttribute("content",
    `${c.businessName} offers ${cat.toLowerCase()} in ${c.city}, ${c.province}. Rated ${(c.rating || 0).toFixed(1)}/5 from ${c.reviewCount || 0} reviews.`);
}

function renderProfile(c) {
  const cat = categoryById(c.categoryId);
  const fav = isFavourited(c.id);
  const coverStyle = c.coverUrl ? `background-image:url('${c.coverUrl}');` : "";

  root.innerHTML = `
    <div class="profile-cover" style="${coverStyle}">
      <a href="/search.html" class="profile-back">${icon("chevronLeft", 15)} Back</a>
    </div>

    <div class="profile-identity">
      <div class="profile-logo">${c.logoUrl ? `<img src="${c.logoUrl}" alt="${escapeHtml(c.businessName)} logo">` : icon("building", 42)}</div>
    </div>

    <div class="profile-points-row">${pointsBadgeHtml(c.points || 0)}</div>

    <div class="profile-name-row">
      <h1 style="font-size:1.5rem;">${escapeHtml(c.businessName)}</h1>
      ${c.verified ? trustSealSvg(22) : ""}
    </div>
    <p class="profile-member-since">${memberSinceLabel(c.joinedAt)}</p>

    <div class="profile-cta-row">
      <a class="btn btn-primary" href="tel:${c.phone}">${icon("phone", 15)} Call Now</a>
      <a class="btn btn-gold" href="https://wa.me/${(c.whatsapp || "").replace(/\D/g, "")}" target="_blank" rel="noopener">${icon("message", 15)} WhatsApp</a>
      <button class="btn btn-ghost" id="fav-btn">${icon("heart", 15, fav)} Save</button>
    </div>

    <div class="profile-body">
      <div class="profile-two-col">
        <div>
          <div class="about-block">
            <h3>About Me</h3>
            <p style="font-size:0.88rem; color:var(--csp-text); line-height:1.7; white-space:pre-line;">${escapeHtml(c.description || "")}</p>
            <div class="page-type-row">${icon("building", 14)} Page &middot; ${escapeHtml(cat.name)} Company</div>
          </div>

          <div class="trust-strip">
            ${trustItem("Verified Business", c.verified)}
            ${trustItem("Customer Reviewed", (c.reviewCount || 0) > 0)}
            ${trustItem("Registered Contractor", true)}
            ${trustItem(`${cat.name}`, true)}
          </div>

          ${c.services?.length ? `<div class="about-block">
            <h3>Services Offered</h3>
            <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:0.5rem;">
              ${c.services.map((s) => `<div class="service-chip">${icon("check", 14)} ${escapeHtml(s)}</div>`).join("")}
            </div>
          </div>` : ""}

          ${c.certifications?.length ? `<div class="about-block">
            <h3>Certifications</h3>
            <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
              ${c.certifications.map((cert) => `<span class="cert-chip">${icon("shield", 12)} ${escapeHtml(cert)}</span>`).join("")}
            </div>
          </div>` : ""}

          <div class="about-block" style="padding:0;">
            <h3 style="padding:1.25rem 1.25rem 0;">Project Updates</h3>
            <div id="posts-feed" style="padding:1rem 1.25rem;">
              <div class="skeleton" style="height:80px; margin-bottom:0.75rem;"></div>
            </div>
          </div>

          <div class="about-block">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
              <h3 style="margin:0;">Customer Reviews</h3>
              <div style="display:flex; align-items:center; gap:0.4rem;">${starsHtml(c.rating)}<strong style="font-size:0.85rem;">${(c.rating || 0).toFixed(1)}</strong></div>
            </div>
            <div id="reviews-list"><div class="skeleton" style="height:70px;"></div></div>
          </div>
        </div>

        <aside>
          <div class="quote-panel">
            <h3 style="font-size:0.95rem; margin-bottom:1rem;">Request a Quote</h3>
            <div id="quote-alert"></div>
            <form id="quote-form" style="display:flex; flex-direction:column; gap:0.6rem;">
              <div class="field" data-field="name"><input class="input" name="name" placeholder="Your name" required><span class="field-error"></span></div>
              <div class="field" data-field="phone"><input class="input" name="phone" placeholder="Phone number" required><span class="field-error"></span></div>
              <div class="field" data-field="message"><textarea class="input" name="message" rows="3" placeholder="Tell us about the job..." required></textarea><span class="field-error"></span></div>
              <button type="submit" class="btn btn-primary btn-block" id="quote-submit">Send Enquiry</button>
              <p style="font-size:0.7rem; text-align:center; color:var(--csp-muted);">Free — you can request quotes from multiple contractors.</p>
            </form>
          </div>
          <div id="similar-contractors" style="margin-top:1.25rem;"></div>
        </aside>
      </div>
    </div>
  `;

  document.getElementById("fav-btn").addEventListener("click", async (e) => {
    const nowFav = await toggleFavourite(c.id);
    e.currentTarget.innerHTML = `${icon("heart", 15, nowFav)} Save`;
  });

  wireQuoteForm(c);
}

function trustItem(label, active) {
  return `<span class="trust-strip__item" style="color:${active ? "var(--csp-text)" : "var(--csp-border)"};">${icon("checkCircle", 15)} ${label}</span>`;
}
function starsHtml(rating = 0) {
  let s = "";
  for (let i = 0; i < 5; i++) s += icon("star", 14, i < Math.round(rating));
  return `<span style="color:var(--csp-gold); display:inline-flex;">${s}</span>`;
}

async function loadPosts(contractorId) {
  const el = document.getElementById("posts-feed");
  try {
    const posts = await getContractorPosts(contractorId);
    if (!posts.length) {
      el.innerHTML = `<p style="font-size:0.85rem; color:var(--csp-muted);">No project updates posted yet.</p>`;
      return;
    }
    el.innerHTML = posts.map((p) => `
      <div class="post-card">
        <div class="post-card__head">
          <div class="post-card__avatar">${icon("building", 16)}</div>
          <div>
            <div class="post-card__name">Project Update</div>
            <div class="post-card__time">${relativeTime(p.createdAt)}</div>
          </div>
        </div>
        ${p.caption ? `<div class="post-card__caption">${escapeHtml(p.caption)}</div>` : ""}
        ${p.imageUrl ? `<img class="post-card__image" src="${p.imageUrl}" alt="Project update photo">` : ""}
      </div>`).join("");
  } catch (err) {
    console.error(err);
    el.innerHTML = `<p style="font-size:0.85rem; color:var(--csp-muted);">Couldn't load updates right now.</p>`;
  }
}

function wireQuoteForm(c) {
  const form = document.getElementById("quote-form");
  const alertBox = document.getElementById("quote-alert");
  const submitBtn = document.getElementById("quote-submit");

  const submit = debounceSubmit(submitBtn, async (e) => {
    e.preventDefault();
    const { valid } = validateForm(form, {
      name: (v) => (isNonEmpty(v) ? true : "Required."),
      phone: (v) => (isValidSaPhone(v) ? true : "Enter a valid SA number."),
      message: (v) => (isNonEmpty(v, 5) ? true : "Tell us a bit more about the job."),
    });
    if (!valid) return;

    if (!auth.currentUser) {
      alertBox.innerHTML = `<div class="alert alert-error">Please <a href="/login.html?next=${encodeURIComponent(location.pathname)}" style="text-decoration:underline;">log in</a> or <a href="/register.html" style="text-decoration:underline;">create a free account</a> to send a quote request.</div>`;
      return;
    }
    try {
      await addDoc(collection(db, "quotes"), {
        contractorId: c.id, customerId: auth.currentUser.uid,
        customerName: stripDangerousChars(form.name.value), customerPhone: form.phone.value.trim(),
        customerEmail: auth.currentUser.email, categoryId: c.categoryId,
        message: stripDangerousChars(form.message.value), status: "new", source: "profile", createdAt: serverTimestamp(),
      });
      alertBox.innerHTML = `<div class="alert alert-success">${icon("checkCircle", 16)} Your enquiry was sent to ${escapeHtml(c.businessName)}.</div>`;
      form.hidden = true;
    } catch (err) {
      console.error(err);
      alertBox.innerHTML = `<div class="alert alert-error">Couldn't send your enquiry — please try again.</div>`;
    }
  });
  form.addEventListener("submit", submit);
}

async function loadReviews(contractorId) {
  const el = document.getElementById("reviews-list");
  try {
    const qRef = query(collection(db, "reviews"), where("contractorId", "==", contractorId), where("status", "==", "published"), orderBy("createdAt", "desc"), limit(8));
    const snap = await getDocs(qRef);
    if (snap.empty) { el.innerHTML = `<p style="font-size:0.85rem; color:var(--csp-muted);">No reviews yet.</p>`; return; }
    el.innerHTML = snap.docs.map((d) => {
      const r = d.data();
      const initials = (r.customerName || "Customer").split(" ").map((p) => p[0]).slice(0, 2).join("");
      return `<div class="review-item">
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span class="review-avatar">${escapeHtml(initials)}</span>
          <strong style="font-size:0.85rem;">${escapeHtml(r.customerName || "Verified Customer")}</strong>
        </div>
        <div style="margin-top:0.4rem;">${starsHtml(r.rating)}</div>
        <p style="font-size:0.85rem; color:var(--csp-muted); margin-top:0.4rem;">${escapeHtml(r.text)}</p>
      </div>`;
    }).join("");
  } catch (err) { console.error(err); el.innerHTML = `<p style="font-size:0.85rem; color:var(--csp-muted);">Couldn't load reviews.</p>`; }
}

async function loadSimilar(c) {
  const el = document.getElementById("similar-contractors");
  try {
    const { results } = await searchContractors({ categoryId: c.categoryId, pageSize: 4 });
    const others = results.filter((x) => x.id !== c.id).slice(0, 3);
    if (!others.length) return;
    el.innerHTML = `<h3 style="font-size:0.85rem; margin-bottom:0.75rem;">Similar Contractors</h3>` + others.map((s) => `
      <a href="/contractor/${s.slug}" class="card" style="display:flex; align-items:center; gap:0.6rem; padding:0.7rem; margin-bottom:0.5rem;">
        <div style="width:34px; height:34px; border-radius:9px; background:var(--csp-bg); display:flex; align-items:center; justify-content:center;">${icon("building", 15)}</div>
        <div style="min-width:0;">
          <div style="font-size:0.78rem; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(s.businessName)}</div>
          <div style="font-size:0.7rem; color:var(--csp-muted);">${escapeHtml(s.city)} · ${(s.rating || 0).toFixed(1)}★</div>
        </div>
      </a>`).join("");
  } catch (err) { console.error(err); }
}
