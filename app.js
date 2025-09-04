/* Spreadsheet → HTML renderer (no API key)
 * - Uses GViz JSON via Sheet ID; falls back to Published CSV
 * - Renders articles matching your static HTML structure
 * - Shuffles projects each load
 */

const CONFIG = {
  SHEET_ID: "1O7WAC3WZjJxD5CL4unO-wCOPEx7UZAQ8yxCV5rt-ZBc",
  PUBLISHED_URL:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQj-4CvYCdTHdlx7Yyv6LYIq8DzNw72TebMC-r4O5lvQCMxQTzvbY7tv1p_eVlnMnACFwofkghEqItL/pubhtml",
  SHEET_GID: null,
  BASE_IMAGE_URL: "images/",
  TARGET_SELECTOR: "#projects",
};

function getGidFromPublished(url) {
  try {
    const u = new URL(url);
    const gid = u.searchParams.get("gid");
    return gid ? String(gid) : null;
  } catch (_) {
    return null;
  }
}

// Fisher–Yates shuffle
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// CSV parser
function parseCSV(text) {
  const rows = [];
  let i = 0,
    cur = "",
    row = [],
    inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        row.push(cur);
        cur = "";
      } else if (ch === "\n" || ch === "\r") {
        if (cur.length || row.length) {
          row.push(cur);
          rows.push(row);
          row = [];
          cur = "";
        }
        if (ch === "\r" && text[i + 1] === "\n") i++;
      } else {
        cur += ch;
      }
    }
    i++;
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function headerMap(headers) {
  const map = {};
  headers.forEach((h, i) => {
    map[h.trim()] = i;
  });
  return (names) => {
    const entry = Object.entries(map).find(([k]) => names.some((n) => k.toLowerCase() === n.toLowerCase()));
    return entry ? entry[1] : -1;
  };
}

function slugify(str) {
  return String(str)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function parseImages(cell) {
  if (!cell) return [];
  const raw = String(cell)
    .split(/,|\n|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
  return raw.map((u) => CONFIG.BASE_IMAGE_URL + u);
}

function renderProjectFromValues(getIdx, row) {
  const tIdx = getIdx(["Title"]);
  const yIdx = getIdx(["Year"]);
  const mIdx = getIdx(["Material", "Materials"]);
  const dIdx = getIdx(["Description"]);
  const oIdx = getIdx(["Other"]);
  const iIdx = getIdx(["Images", "Image URLs", "Image"]);
  const idIdx = getIdx(["ID", "Slug"]);

  const title = row[tIdx] || "";
  const year = row[yIdx] || "";
  const mats = row[mIdx] || "";
  const desc = row[dIdx] || "";
  const other = row[oIdx] || "";
  const id = row[idIdx] ? String(row[idIdx]) : slugify(title);
  const images = parseImages(row[iIdx]);

  const article = document.createElement("article");
  article.id = id;
  const h2 = document.createElement("h2");
  h2.textContent = title || "(Untitled)";
  article.appendChild(h2);

  if (year || mats || other) {
    const pMeta = document.createElement("p");
    const em = document.createElement("em");
    const parts = [];
    if (year) parts.push(`Year: ${year}`);
    if (mats) parts.push(`Materials: ${mats}`);
    if (other) parts.push(other);
    em.innerHTML = parts.join(". ") + (parts.length ? "." : "");
    pMeta.appendChild(em);
    article.appendChild(pMeta);
  }

  if (desc) {
    const p = document.createElement("p");
    p.textContent = desc;
    article.appendChild(p);
  }

  images.forEach((src) => {
    const fig = document.createElement("figure");
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = src;
    img.alt = title;
    fig.appendChild(img);
    article.appendChild(fig);
  });

  return article;
}

function filterDrafts(getIdx, rows) {
  const dIdx = getIdx(["Draft"]);
  if (dIdx < 0) return rows;
  return rows.filter((r) => {
    const v = String(r[dIdx] || "").toLowerCase();
    return !(v === "true" || v === "yes" || v === "1");
  });
}

function buildGvizUrl(sheetId, gid) {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  return gid ? `${base}&gid=${gid}` : base;
}

function buildCsvUrlFromPublished(pubUrl, gid) {
  const base = pubUrl.replace("/pubhtml", "/pub");
  const g = gid || getGidFromPublished(pubUrl) || "0";
  return `${base}?gid=${g}&single=true&output=csv`;
}

async function fetchGvizOrCsv() {
  const gid = CONFIG.SHEET_GID || getGidFromPublished(CONFIG.PUBLISHED_URL);
  if (CONFIG.SHEET_ID) {
    const url = buildGvizUrl(CONFIG.SHEET_ID, gid);
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const text = await res.text();
      if (/^\)]}\'/.test(text)) {
        return { kind: "gviz", payload: JSON.parse(text.replace(/^\)]}\'\n?/, "")) };
      }
    }
  }
  if (CONFIG.PUBLISHED_URL) {
    const url = buildCsvUrlFromPublished(CONFIG.PUBLISHED_URL, gid);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("CSV fetch failed");
    const text = await res.text();
    return { kind: "csv", payload: text };
  }
  throw new Error("No valid data source configured");
}

function gvizToRows(gvizJson) {
  const cols = gvizJson.table.cols.map((c) => (c.label || c.id || "").trim());
  const rows = (gvizJson.table.rows || []).map((r) => r.c.map((c) => (c ? c.v : "")));
  return { headers: cols, rows };
}

async function loadSheetInto(targetSelector = CONFIG.TARGET_SELECTOR) {
  const projectsRoot = document.querySelector(targetSelector);
  if (!projectsRoot) return;
  try {
    const result = await fetchGvizOrCsv();
    let headers = [],
      rows = [];
    if (result.kind === "gviz") {
      const table = gvizToRows(result.payload);
      headers = table.headers;
      rows = table.rows;
    } else {
      const parsed = parseCSV(result.payload);
      headers = parsed.shift() || [];
      rows = parsed;
    }
    const getIdx = headerMap(headers);

    rows = filterDrafts(getIdx, rows);
    shuffle(rows);

    projectsRoot.innerHTML = "";
    const frag = document.createDocumentFragment();
    rows.forEach((r) => frag.appendChild(renderProjectFromValues(getIdx, r)));
    projectsRoot.appendChild(frag);
    projectsRoot.classList.remove("loading");
  } catch (err) {
    console.error(err);
    if (projectsRoot) {
      projectsRoot.classList.remove("loading");
      projectsRoot.innerHTML = '<p class="error">Could not load projects from the spreadsheet.</p>';
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => loadSheetInto());
} else {
  loadSheetInto();
}
