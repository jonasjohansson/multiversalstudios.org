import { CONFIG } from "./config.js";

// CSV parser
export function parseCSV(text) {
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

export function headerMap(headers) {
  const map = {};
  headers.forEach((h, i) => {
    map[h.trim()] = i;
  });
  return (names) => {
    const entry = Object.entries(map).find(([k]) => names.some((n) => k.toLowerCase() === n.toLowerCase()));
    return entry ? entry[1] : -1;
  };
}

export function parseImages(cell) {
  if (!cell) return [];
  const raw = String(cell)
    .split(/,|\n|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
  return raw.map((u) => CONFIG.BASE_IMAGE_URL + u);
}

export function gvizToRows(gvizJson) {
  const cols = gvizJson.table.cols.map((c) => (c.label || c.id || "").trim());
  const rows = (gvizJson.table.rows || []).map((r) => r.c.map((c) => (c ? c.v : "")));
  return { headers: cols, rows };
}
