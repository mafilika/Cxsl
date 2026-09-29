import { renderHeader, renderFooter, trustSealSvg } from "../modules/partials.js";
import { icon } from "../modules/icons.js";
import { CATEGORIES, PROVINCES } from "../data/taxonomy.js";
import { getContractorsByCategory, getNewestContractors } from "../modules/contractors-api.js";
import { renderContractorGrid, contractorCardHtml, attachCardHandlers } from "../modules/ui-cards.js";
import { lazyLoadImages } from "../modules/lazy-images.js";

renderHeader("/");
renderFooter();
document.getElementById("hero-trust-seal").innerHTML = trustSealSvg(16);
document.getElementById("icon-search").innerHTML = icon("search", 17);
document.getElementById("icon-arrow").innerHTML = icon("chevronRight", 16);

const provinceSel = document.getElementById("hero-province");
PROVINCES.forEach((p) => provinceSel.insertAdjacentHTML("beforeend", `<option value="${p}">${p}</option>`));

document.getElementById("hero-search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const params = new URLSearchParams();
  const q = document.getElementById("hero-query").value.trim();
  if (q) params.set("q", q);
  if (provinceSel.value) params.set("province", provinceSel.value);
  window.location.href = `/search.html?${params.toString()}`;
});

/* Category rows — only render a row once its contractors have loaded, and
   skip categories with zero listings so the homepage never shows empty rows. */
const rowsContainer = document.getElementById("category-rows");
(async () => {
  for (const cat of CATEGORIES) {
    try {
      const list = await getContractorsByCategory(cat.id, 8);
      if (!list.length) continue;
      const rowEl = document.createElement("div");
      rowEl.className = "category-row";
      rowEl.innerHTML = `
        <div class="category-row__head">
          <h3>${cat.name}</h3>
          <a href="/search.html?category=${cat.id}">View all ${icon("chevronRight", 13)}</a>
        </div>
        <div class="hscroll" data-row="${cat.id}"></div>`;
      rowsContainer.appendChild(rowEl);
      const row = rowEl.querySelector(`[data-row="${cat.id}"]`);
      row.innerHTML = list.map(contractorCardHtml).join("");
      attachCardHandlers(row);
      lazyLoadImages(row);
    } catch (err) {
      console.error(`Failed to load ${cat.id} row`, err);
    }
  }
  if (!rowsContainer.children.length) {
    rowsContainer.innerHTML = `<div class="card" style="padding:2.5rem; text-align:center; color:var(--csp-muted);">
      No contractors listed yet — check back soon, or <a href="/admin.html" style="color:var(--csp-primary); font-weight:600;">add the first one</a>.
    </div>`;
  }
})();

/* New contractors row */
getNewestContractors(8)
  .then((list) => {
    const el = document.getElementById("new-contractors");
    if (!list.length) {
      el.innerHTML = `<div class="card" style="padding:2rem; color:var(--csp-muted);">No contractors listed yet.</div>`;
      return;
    }
    el.innerHTML = list.map(contractorCardHtml).join("");
    attachCardHandlers(el);
    lazyLoadImages(el);
  })
  .catch((err) => {
    console.error(err);
    document.getElementById("new-contractors").innerHTML = `<div class="alert alert-error">Couldn't load new contractors.</div>`;
  });

/* Blog preview — static seed list; swap for a Firestore `blogs` query once
   posts are actually being published from the admin panel. */
const BLOG_POSTS = [
  { title: "How to Choose a Reliable Contractor in South Africa", category: "Guides", excerpt: "Ten practical checks before you sign anything." },
  { title: "Best Solar Companies in Gauteng: What to Look For", category: "Solar", excerpt: "Panel warranties and installer accreditation explained." },
  { title: "12 Questions to Ask Before Hiring a Builder", category: "Construction", excerpt: "The questions that separate a pro from a risk." },
];
document.getElementById("blog-preview").innerHTML = BLOG_POSTS.map((p) => `
  <a href="/blog.html" class="blog-card">
    <div class="blog-card__thumb">${icon("image", 24)}</div>
    <div class="blog-card__body">
      <span class="blog-card__cat">${p.category}</span>
      <div class="blog-card__title">${p.title}</div>
      <p class="blog-card__excerpt">${p.excerpt}</p>
    </div>
  </a>`).join("");
