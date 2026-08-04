// Build-time prerender of public dentist profile pages for SEO.
//
// Runs AFTER `vite build`. It fetches the public dentist list from the API and
// writes a real, crawlable HTML page per dentist to dist/dentist/<slug>.html
// (served at /dentist/<slug> thanks to cleanUrls), each with Dentist +
// AggregateRating structured data, then adds those URLs to dist/sitemap.xml.
//
// It NEVER fails the build: if the API is slow or unreachable, it logs a warning
// and exits 0 so deploys are never blocked. Re-deploy to refresh the pages when
// dentists or reviews change.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(SCRIPT_DIR, "../dist");
const SITE = "https://www.mydentalbooking.com";
const API =
  process.env.PRERENDER_API_URL ||
  process.env.VITE_API_URL ||
  "https://dentalappserver.onrender.com/api";

const DAY_FULL = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const slugify = (s) =>
  String(s || "")
    .toLowerCase().normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

// City pages to populate with a live clinic listing. Each looks for the
// <!--DENTIST_LIST--> placeholder in its built HTML. Add more as you launch
// new cities (with a matching /dentists-in-<slug> page + geo box).
const CITY_PAGES = [
  { file: "dentists-in-lahore.html", city: "Lahore", box: { latMin: 31.2, latMax: 31.7, lngMin: 74.0, lngMax: 74.7 } },
];

// Determine a dentist's city: prefer the explicit field, else infer from geo.
function cityOf(d, cities) {
  if (d.city && d.city.trim()) return d.city.trim();
  const c = d.location?.coordinates;
  if (Array.isArray(c) && c.length === 2) {
    const [lng, lat] = c;
    for (const cp of cities) {
      const b = cp.box;
      if (b && lat >= b.latMin && lat <= b.latMax && lng >= b.lngMin && lng <= b.lngMax) return cp.city;
    }
  }
  return "";
}

function clinicCard(d, slug) {
  const name = d.clinicName?.trim() || (d.name ? `Dr. ${d.name}` : "Dentist");
  const meta = [d.area || d.city, d.specialization].filter(Boolean).join(" · ");
  const rating = Number(d.reviewCount) > 0
    ? `★ ${Number(d.rating).toFixed(1)} <span>(${d.reviewCount})</span>`
    : `<span>New on MyDentalBooking</span>`;
  return `<a class="card clinic-card" href="/dentist/${esc(slug)}">
          <div class="cc-name">${esc(name)}</div>
          ${meta ? `<div class="cc-meta">${esc(meta)}</div>` : ""}
          <div class="cc-rating">${rating}</div>
          <span class="cc-link">View profile →</span>
        </a>`;
}

async function injectCityListings(entries) {
  for (const cp of CITY_PAGES) {
    const p = path.join(DIST, cp.file);
    let html;
    try { html = await fs.readFile(p, "utf8"); } catch { continue; }
    if (!html.includes("<!--DENTIST_LIST-->")) continue;
    const items = entries
      .filter((e) => cityOf(e.d, CITY_PAGES).toLowerCase() === cp.city.toLowerCase())
      .sort((a, b) => (Number(b.d.rating) || 0) - (Number(a.d.rating) || 0))
      .slice(0, 24);
    const inner = items.length
      ? items.map((e) => clinicCard(e.d, e.slug)).join("\n")
      : `<p class="muted" style="grid-column:1/-1;text-align:center">More dentists in ${esc(cp.city)} are joining soon — <a href="/find-dentist" style="color:var(--primary);font-weight:700">browse all dentists →</a></p>`;
    await fs.writeFile(p, html.replace("<!--DENTIST_LIST-->", inner));
    console.log(`[prerender] Listed ${items.length} dentist(s) on ${cp.file}.`);
  }
}

async function fetchDentists() {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch(`${API}/dentists`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn(`[prerender] dentist fetch attempt ${attempt} failed: ${e.message}`);
    }
  }
  return null;
}

function profileHtml(d, slug) {
  const displayName = d.clinicName?.trim() || (d.name ? `Dr. ${d.name}` : "Dentist");
  const dentistName = d.name ? `Dr. ${d.name}` : displayName;
  const cityBit = d.city ? ` in ${d.city}` : "";
  const specialty = d.specialization?.trim();
  const services = Array.isArray(d.services) && d.services.length
    ? d.services
    : specialty ? [specialty] : [];
  const url = `${SITE}/dentist/${slug}`;
  const title = `${displayName} — Dentist${cityBit} | MyDentalBooking`;
  const descParts = [
    `${displayName} is a dentist${cityBit ? ` in ${d.city}` : " in Pakistan"}`,
    specialty ? `specialising in ${specialty}` : null,
    services.length ? `offering ${services.slice(0, 4).join(", ")}` : null,
    "Book an appointment online.",
  ].filter(Boolean);
  const description = descParts.join(". ").replace(/\.\./g, ".");

  // ---- JSON-LD (Dentist) ----
  const ld = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: displayName,
    url,
    ...(d.image ? { image: d.image } : {}),
    ...(d.about ? { description: d.about } : {}),
    ...(services.length ? { availableService: services.map((s) => ({ "@type": "MedicalProcedure", name: s })) } : {}),
    ...(specialty ? { medicalSpecialty: specialty } : {}),
  };
  const addr = {};
  if (d.address) addr.streetAddress = d.address;
  if (d.area) addr.streetAddress = [d.area, addr.streetAddress].filter(Boolean).join(", ");
  if (d.city) addr.addressLocality = d.city;
  addr.addressCountry = "PK";
  if (Object.keys(addr).length > 1) ld.address = { "@type": "PostalAddress", ...addr };
  const coords = d.location?.coordinates;
  if (Array.isArray(coords) && coords.length === 2) {
    ld.geo = { "@type": "GeoCoordinates", longitude: coords[0], latitude: coords[1] };
  }
  if (Number(d.reviewCount) > 0 && Number(d.rating) > 0) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(d.rating).toFixed(1),
      reviewCount: Number(d.reviewCount),
      bestRating: 5,
      worstRating: 1,
    };
  }
  const hours = Array.isArray(d.availability) ? d.availability.filter((a) => a.day && a.start && a.end) : [];
  if (hours.length) {
    ld.openingHoursSpecification = hours.map((a) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_FULL[a.day] || a.day,
      opens: a.start,
      closes: a.end,
    }));
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      ...(d.city ? [{ "@type": "ListItem", position: 2, name: `Dentists in ${d.city}`, item: `${SITE}/dentists-in-${slugify(d.city)}` }] : []),
      { "@type": "ListItem", position: d.city ? 3 : 2, name: displayName, item: url },
    ],
  };

  const ratingStr = Number(d.reviewCount) > 0
    ? `★ ${Number(d.rating).toFixed(1)} (${d.reviewCount} review${d.reviewCount > 1 ? "s" : ""})`
    : "New on MyDentalBooking";

  const hoursRows = hours
    .map((a) => `<tr><td>${esc(DAY_FULL[a.day] || a.day)}</td><td>${esc(a.start)} – ${esc(a.end)}</td></tr>`)
    .join("");

  const servicesList = services.length
    ? `<ul class="svc">${services.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`
    : "";

  const cityCrumb = d.city
    ? `› <a href="/dentists-in-${slugify(d.city)}">Dentists in ${esc(d.city)}</a> `
    : "";
  const cityLink = d.city
    ? `<a href="/dentists-in-${slugify(d.city)}">More dentists in ${esc(d.city)}</a>`
    : `<a href="/find-dentist">Find a dentist</a>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${esc(url)}" />
  <meta name="theme-color" content="#1877f2" />
  <meta name="robots" content="index, follow" />
  <meta property="og:type" content="profile" />
  <meta property="og:site_name" content="MyDentalBooking" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(url)}" />
  <meta property="og:image" content="${esc(d.image || `${SITE}/pwa-512x512.png`)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{--primary:#1877f2;--primary-dark:#166fe5;--navy:#0f1e36;--ink:#334155;--muted:#64748b;--line:#e2e8f0;--bg:#f0f2f5;--surface:#fff;--tint:#e7f3ff;--green:#31a24c;--amber:#f5a623}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--surface);line-height:1.6;-webkit-font-smoothing:antialiased}
    a{color:inherit;text-decoration:none}
    .wrap{max-width:860px;margin:0 auto;padding:0 20px}
    h1,h2,h3{color:var(--navy);line-height:1.2;letter-spacing:-0.02em}
    p{margin-bottom:12px}
    .btn{display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:14px;padding:11px 18px;border-radius:10px;border:1px solid transparent;white-space:nowrap}
    .btn-primary{background:var(--primary);color:#fff}
    .btn-wa{background:var(--green);color:#fff}
    .muted{color:var(--muted)}
    header.nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
    .nav-inner{display:flex;align-items:center;justify-content:space-between;height:60px}
    .brand{display:flex;align-items:center;gap:10px;font-weight:800;color:var(--navy);font-size:17px}
    .brand img{width:30px;height:30px;border-radius:8px}
    .breadcrumb{font-size:13px;color:var(--muted);margin:18px 0}
    .breadcrumb a:hover{color:var(--primary)}
    .profile-head{display:flex;gap:20px;align-items:center;flex-wrap:wrap;padding:8px 0 20px;border-bottom:1px solid var(--line)}
    .avatar{width:88px;height:88px;border-radius:16px;background:var(--tint);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:800;flex:none;overflow:hidden}
    .avatar img{width:100%;height:100%;object-fit:cover}
    .p-name h1{font-size:clamp(22px,4vw,30px)}
    .p-meta{color:var(--muted);font-size:15px;margin-top:4px}
    .rating{display:inline-flex;align-items:center;gap:6px;color:var(--amber);font-weight:700;margin-top:8px}
    .rating .muted{color:var(--muted);font-weight:500}
    section{padding:26px 0;border-bottom:1px solid var(--line)}
    section h2{font-size:19px;margin-bottom:10px}
    .svc{list-style:none;display:flex;flex-wrap:wrap;gap:8px}
    .svc li{background:var(--tint);color:var(--primary);border:1px solid #dbe6ff;border-radius:20px;padding:6px 14px;font-size:14px;font-weight:600}
    table.hours{border-collapse:collapse;font-size:15px}
    table.hours td{padding:6px 22px 6px 0}
    table.hours td:first-child{color:var(--navy);font-weight:600}
    .cta{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0 6px}
    footer{background:var(--navy);color:#9db4d6;padding:28px 0;margin-top:8px;font-size:14px}
    footer a{color:#cfe0ff}
    footer a:hover{color:#fff}
    @media(max-width:520px){.avatar{width:64px;height:64px;font-size:26px}}
  </style>
</head>
<body>
  <header class="nav">
    <div class="wrap nav-inner">
      <a href="/" class="brand"><img src="/favicon.svg" alt="MyDentalBooking" /> MyDentalBooking</a>
      <a class="btn btn-primary" href="/find-dentist">Find a dentist</a>
    </div>
  </header>

  <div class="wrap">
    <div class="breadcrumb"><a href="/">Home</a> › ${cityCrumb}› ${esc(displayName)}</div>

    <div class="profile-head">
      <div class="avatar">${d.image ? `<img src="${esc(d.image)}" alt="${esc(displayName)}" />` : esc((displayName[0] || "D").toUpperCase())}</div>
      <div class="p-name">
        <h1>${esc(displayName)}</h1>
        <div class="p-meta">${esc([dentistName !== displayName ? dentistName : null, specialty, d.area || d.city].filter(Boolean).join(" · ")) || "Dentist"}</div>
        <div class="rating">${esc(ratingStr)}</div>
      </div>
    </div>

    <div class="cta">
      <a class="btn btn-primary" href="/dentists/${esc(d._id)}">Book an appointment</a>
      <a class="btn btn-wa" href="https://wa.me/923190041011" target="_blank" rel="noopener">WhatsApp us</a>
    </div>

    ${d.about ? `<section><h2>About</h2><p>${esc(d.about)}</p></section>` : ""}
    ${servicesList ? `<section><h2>Services</h2>${servicesList}</section>` : ""}
    ${hoursRows ? `<section><h2>Opening hours</h2><table class="hours">${hoursRows}</table></section>` : ""}
    ${d.yearsOfExperience ? `<section><h2>Experience</h2><p>${esc(d.yearsOfExperience)} years of experience.</p></section>` : ""}

    <section style="border-bottom:none">
      <h2>Book ${esc(displayName)} online</h2>
      <p>See available appointment times and book online with MyDentalBooking. ${cityLink} or <a href="/find-dentist">browse all dentists</a>.</p>
      <div class="cta"><a class="btn btn-primary" href="/dentists/${esc(d._id)}">Book an appointment</a></div>
    </section>
  </div>

  <footer>
    <div class="wrap">
      <a href="/" class="brand" style="color:#fff">MyDentalBooking</a> — find and book trusted dentists across Pakistan.<br/>
      <span class="muted" style="color:#6f88ad">© 2026 MyDentalBooking. All rights reserved.</span>
    </div>
  </footer>
</body>
</html>
`;
}

async function updateSitemap(urls) {
  const file = path.join(DIST, "sitemap.xml");
  let xml;
  try {
    xml = await fs.readFile(file, "utf8");
  } catch {
    xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n`;
  }
  const entries = urls
    .map((u) => `  <url>\n    <loc>${u}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`)
    .join("\n");
  xml = xml.replace("</urlset>", `${entries}\n</urlset>`);
  await fs.writeFile(file, xml);
}

async function main() {
  const dentists = await fetchDentists();
  if (!dentists) {
    console.warn("[prerender] Skipping dentist profile pages — API unavailable. Build continues.");
    return;
  }
  if (!dentists.length) {
    console.log("[prerender] No dentists returned; nothing to prerender.");
    return;
  }
  const outDir = path.join(DIST, "dentist");
  await fs.mkdir(outDir, { recursive: true });

  const used = new Set();
  const entries = [];
  for (const d of dentists) {
    if (!d || !d._id) continue;
    let slug = (d.slug && slugify(d.slug)) || `${slugify(d.clinicName || d.name || "dentist")}-${String(d._id).slice(-6)}`;
    if (used.has(slug)) slug = `${slug}-${String(d._id).slice(-4)}`;
    used.add(slug);
    await fs.writeFile(path.join(outDir, `${slug}.html`), profileHtml(d, slug));
    entries.push({ d, slug });
  }
  await updateSitemap(entries.map((e) => `${SITE}/dentist/${e.slug}`));
  await injectCityListings(entries);
  console.log(`[prerender] Generated ${entries.length} dentist profile page(s).`);
}

main().catch((e) => {
  console.warn(`[prerender] Non-fatal error, skipping profile pages: ${e.message}`);
  process.exit(0);
});
