import { CONFIG } from "./config.js";
import { getGidFromPublished } from "./utils.js";
import { parseCSV, gvizToRows } from "./parsers.js";

function buildGvizUrl(sheetId, gid) {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  return gid ? `${base}&gid=${gid}` : base;
}

function buildCsvUrlFromPublished(pubUrl, gid) {
  const base = pubUrl.replace("/pubhtml", "/pub");
  const g = gid || getGidFromPublished(pubUrl) || "0";
  return `${base}?gid=${g}&single=true&output=csv`;
}

export async function fetchGvizOrCsv() {
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
