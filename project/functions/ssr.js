const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const db = () => admin.firestore();
const APP_URL = "https://centralservicepoint.store";
const profileTemplate = fs.readFileSync(path.join(__dirname, "templates/contractor-profile.html"), "utf8");

function escapeAttr(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * GET .../renderContractorProfile/:slug — works whether reached via a
 * Firebase Hosting rewrite (req.path = "/contractor/slug", full path) or a
 * Netlify proxy redirect (req.path = "/slug", just the wildcard match).
 * Taking the LAST path segment works in both cases.
 */
exports.renderContractorProfile = functions.https.onRequest(async (req, res) => {
  const segments = req.path.split("/").filter(Boolean);
  const slug = segments[segments.length - 1];

  try {
    const snap = await db().collection("contractors").where("slug", "==", slug).where("published", "==", true).limit(1).get();

    if (snap.empty) {
      res.set("Cache-Control", "public, max-age=60");
      return res.status(404).send(profileTemplate);
    }

    const c = snap.docs[0].data();
    const title = `${c.businessName} — ${c.categoryId} in ${c.city}, ${c.province} | Central Service Point`;
    const description = `${c.businessName} offers ${c.categoryId} services in ${c.city}, ${c.province}. Rated ${(c.rating || 0).toFixed(1)}/5 from ${c.reviewCount || 0} reviews.`;
    const url = `${APP_URL}/contractor/${slug}`;

    const localBusinessSchema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: c.businessName,
      description: c.description,
      image: c.logoUrl || undefined,
      telephone: c.phone,
      address: { "@type": "PostalAddress", addressLocality: c.city, addressRegion: c.province, addressCountry: "ZA" },
      aggregateRating: c.reviewCount ? { "@type": "AggregateRating", ratingValue: c.rating, reviewCount: c.reviewCount } : undefined,
      url,
    };

    let html = profileTemplate
      .replace(/(<title id="doc-title">).*?(<\/title>)/, `$1${escapeAttr(title)}$2`)
      .replace(/(id="meta-description" name="description" content=").*?(")/, `$1${escapeAttr(description)}$2`)
      .replace(/(id="canonical-link" rel="canonical" href=").*?(")/, `$1${url}$2`)
      .replace(/(id="og-title" property="og:title" content=").*?(")/, `$1${escapeAttr(title)}$2`)
      .replace(/(id="og-description" property="og:description" content=").*?(")/, `$1${escapeAttr(description)}$2`)
      .replace(/(<script id="jsonld-localbusiness" type="application\/ld\+json">).*?(<\/script>)/s, `$1${JSON.stringify(localBusinessSchema)}$2`);

    res.set("Cache-Control", "public, max-age=300, s-maxage=600");
    return res.status(200).send(html);
  } catch (err) {
    functions.logger.error("renderContractorProfile error", err);
    return res.status(200).send(profileTemplate);
  }
});
