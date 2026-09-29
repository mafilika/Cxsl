import { icon } from "./icons.js";
import { CATEGORIES, PROVINCES, slugify } from "../data/taxonomy.js";
import { authState } from "./auth.js";

export function trustSealSvg(size = 22) {
  const ticks = 16, r1 = size * 0.5 - 1, r2 = size * 0.5 - 4.5, c = size / 2;
  let marks = "";
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2;
    const x1 = c + Math.cos(a) * r1, y1 = c + Math.sin(a) * r1;
    const x2 = c + Math.cos(a) * (r1 - 3), y2 = c + Math.sin(a) * (r1 - 3);
    marks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0B5D3B" stroke-width="1.2" stroke-linecap="round"/>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" class="trust-seal">
    ${marks}
    <circle cx="${c}" cy="${c}" r="${r2}" fill="#0B5D3B"/>
    <path d="M ${c - r2 * 0.42} ${c} L ${c - r2 * 0.08} ${c + r2 * 0.32} L ${c + r2 * 0.48} ${c - r2 * 0.34}"
      stroke="#fff" stroke-width="${size * 0.09}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;
}

/** The "17 points" style pill badge from the reference screenshot. */
export function pointsBadgeHtml(points = 0) {
  return `<span class="points-badge">${icon("award", 13)} ${points} point${points === 1 ? "" : "s"}</span>`;
}

/** "Member of Central Service Point since February 17, 2026" */
export function memberSinceLabel(joinedAt) {
  const d = joinedAt?.toDate ? joinedAt.toDate() : joinedAt instanceof Date ? joinedAt : null;
  if (!d) return "Member of Central Service Point";
  const formatted = d.toLocaleDateString("en-ZA", { month: "long", day: "numeric", year: "numeric" });
  return `Member of Central Service Point since ${formatted}`;
}

/** "5d", "2h", "just now" — relative time for the post feed. */
export function relativeTime(dateLike) {
  const d = dateLike?.toDate ? dateLike.toDate() : dateLike instanceof Date ? dateLike : new Date(dateLike);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

const NAV_LINKS = [
  { href: "/search.html", label: "Find Contractors" },
  { href: "/pricing.html", label: "Pricing" },
  { href: "/blog.html", label: "Resources" },
];

export function renderHeader(activePath = "") {
  const header = document.getElementById("site-header");
  if (!header) return;
  header.innerHTML = `
    <div class="container">
      <a href="/" class="brand">
        <span class="brand__mark">${icon("building", 18)}</span>
        <span>
          <span class="brand__name" style="display:block;">Central Service Point</span>
          <span class="brand__tag">Verified Contractors &middot; SA</span>
        </span>
      </a>
      <nav class="main-nav" aria-label="Primary">
        ${NAV_LINKS.map((l) => `<a href="${l.href}" ${activePath === l.href ? 'aria-current="page"' : ""}>${l.label}</a>`).join("")}
      </nav>
      <div class="header-actions">
        <a href="/favourites.html" class="btn btn-ghost btn-sm" aria-label="Favourites">${icon("heart", 16)}</a>
        <span id="header-auth-slot"></span>
        <button class="btn btn-ghost btn-sm mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Toggle menu" aria-expanded="false">${icon("menu", 18)}</button>
      </div>
    </div>
    <nav class="mobile-nav" id="mobile-nav" aria-label="Mobile">
      ${NAV_LINKS.map((l) => `<a href="${l.href}">${l.label}</a>`).join("")}
    </nav>`;

  const toggle = document.getElementById("mobile-menu-toggle");
  const nav = document.getElementById("mobile-nav");
  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.innerHTML = icon(open ? "x" : "menu", 18);
  });

  authState((user, profile) => {
    const slot = document.getElementById("header-auth-slot");
    if (!slot) return;
    if (user) {
      slot.innerHTML = `<a href="${profile?.role === "admin" ? "/admin.html" : "/account.html"}" class="btn btn-ghost btn-sm">${profile?.firstName || (profile?.role === "admin" ? "Admin" : "My Account")}</a>`;
    } else {
      slot.innerHTML = `<a href="/login.html" class="btn btn-ghost btn-sm">Log In</a>`;
    }
  });
}

export function renderFooter() {
  const footer = document.getElementById("site-footer");
  if (!footer) return;
  const sampleLinks = [["solar", "Gauteng"], ["plumbing", "Gauteng"], ["electrical", "Western Cape"], ["security", "Western Cape"], ["aircon", "KwaZulu-Natal"], ["construction", "Gauteng"]];
  footer.innerHTML = `
    <div class="container footer-grid">
      <div>
        <a href="/" class="brand" style="margin-bottom:1rem;">
          <span class="brand__mark" style="background:#C08A28;">${icon("building", 16)}</span>
          <span class="brand__name" style="color:#fff;">Central Service Point</span>
        </a>
        <p style="font-size:0.85rem; opacity:0.7; max-width:280px;">South Africa's directory of verified contractors — browse by trade, compare, and request a quote.</p>
      </div>
      <div>
        <div class="footer-heading">Popular Searches</div>
        <ul style="display:flex; flex-direction:column; gap:0.55rem;">
          ${sampleLinks.map(([cat, prov]) => {
            const c = CATEGORIES.find((x) => x.id === cat);
            return `<li><a href="/contractors/${slugify(prov)}/${cat}" style="font-size:0.85rem;">${c?.name} in ${prov}</a></li>`;
          }).join("")}
        </ul>
      </div>
      <div>
        <div class="footer-heading">Company</div>
        <ul style="display:flex; flex-direction:column; gap:0.55rem;">
          <li><a href="/blog.html" style="font-size:0.85rem;">Resources &amp; Blog</a></li>
          <li><a href="/about.html" style="font-size:0.85rem;">About Us</a></li>
          <li><a href="/contact.html" style="font-size:0.85rem;">Contact</a></li>
        </ul>
      </div>
      <div>
        <div class="footer-heading">Provinces</div>
        <ul style="display:flex; flex-direction:column; gap:0.55rem;">
          ${PROVINCES.slice(0, 5).map((p) => `<li><a href="/search.html?province=${encodeURIComponent(p)}" style="font-size:0.85rem;">${p}</a></li>`).join("")}
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      <span>&copy; ${new Date().getFullYear()} Central Service Point. All rights reserved.</span>
      <span><a href="/privacy.html">Privacy Policy</a> &middot; <a href="/terms.html">Terms of Service</a></span>
    </div>`;
}
