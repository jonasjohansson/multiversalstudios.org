import { slugify } from "./utils.js";
import { parseImages } from "./parsers.js";

export function renderProjectFromValues(getIdx, row) {
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

export function filterDrafts(getIdx, rows) {
  const dIdx = getIdx(["Draft"]);
  if (dIdx < 0) return rows;
  return rows.filter((r) => {
    const v = String(r[dIdx] || "").toLowerCase();
    return !(v === "true" || v === "yes" || v === "1");
  });
}
