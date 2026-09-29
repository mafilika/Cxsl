import { icon } from "./icons.js";
import { trustSealSvg } from "./partials.js";
import { categoryById } from "../data/taxonomy.js";
import { escapeHtml } from "./validate.js";
import { toggleFavourite, isFavourited } from "./favourites.js";

function starsSvg(rating, size = 13) {
  let out = "";
  for (let i = 0; i < 5; i++) out += icon("star", size, i < Math.round(rating));
  return `<span class="stars" style="color:var(--csp-gold);">${out}</span>`;
}
function tierBadge(tier) {
  if (tier === "premium") return `<span class="badge badge-premium">Premium Partner</span>`;
  if (tier === "professional") return `<span class="badge badge-professional">Professional</span>`;
  return `<span class="badge badge-basic">Listed</span>`;
}

export function contractorCardHtml(c) {
  const cat = categoryById(c.categoryId);
  const premium = c.tier === "premium";
  const fav = isFavourited(c.id);
  return `
  <a class="contractor-card" href="/contractor/${c.slug}" data-contractor-id="${c.id}">
    <div class="contractor-card__banner ${premium ? "contractor-card__banner--premium" : ""}">
      ${tierBadge(c.tier)}
      <button class="contractor-card__fav" data-fav-toggle="${c.id}" aria-label="Save to favourites" onclick="event.preventDefault()">${icon("heart", 15, fav)}</button>
      <div class="contractor-card__icon">${c.logoUrl ? `<img src="${c.logoUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : icon("building", 20)}</div>
    </div>
    <div class="contractor-card__body">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:0.5rem;">
        <span class="contractor-card__name">${escapeHtml(c.businessName)}</span>
        ${c.verified ? trustSealSvg(20) : ""}
      </div>
      <div class="contractor-card__meta">${escapeHtml(cat.name)}</div>
      <div class="contractor-card__meta">${icon("mapPin", 12)} ${escapeHtml(c.city)}, ${escapeHtml(c.province)}</div>
      <div style="display:flex; align-items:center; gap:0.4rem; margin-top:0.5rem; flex-wrap:wrap;">
        ${starsSvg(c.rating || 0)}
        <strong style="font-size:0.8rem;">${(c.rating || 0).toFixed(1)}</strong>
        <span style="font-size:0.75rem; color:var(--csp-muted);">(${c.reviewCount || 0})</span>
      </div>
      <p class="contractor-card__desc">${escapeHtml(c.description || "")}</p>
      <div class="contractor-card__actions">
        <a class="btn btn-primary btn-sm" style="flex:1;" href="https://wa.me/${(c.whatsapp || "").replace(/\D/g,"")}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${icon("message", 14)} WhatsApp</a>
        <a class="btn btn-ghost btn-sm" href="tel:${c.phone}" onclick="event.stopPropagation()">${icon("phone", 14)}</a>
      </div>
    </div>
  </a>`;
}

export function renderContractorGrid(container, contractors, emptyMessage = "No contractors match those filters yet.") {
  if (!contractors.length) {
    container.innerHTML = `<div class="card" style="grid-column:1/-1; padding:3rem; text-align:center; color:var(--csp-muted);">${emptyMessage}</div>`;
    return;
  }
  container.innerHTML = contractors.map(contractorCardHtml).join("");
  attachCardHandlers(container);
}

export function attachCardHandlers(container) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-fav-toggle]");
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    toggleFavourite(btn.dataset.favToggle).then((nowFav) => { btn.innerHTML = icon("heart", 15, nowFav); });
  });
}
