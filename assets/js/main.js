import { CONFIG } from "./config.js";
import { shuffle } from "./utils.js";
import { parseCSV, headerMap, gvizToRows } from "./parsers.js";
import { renderProjectFromValues, filterDrafts } from "./renderer.js";
import { fetchGvizOrCsv } from "./fetcher.js";

export async function loadSheetInto(targetSelector = CONFIG.TARGET_SELECTOR) {
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

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => loadSheetInto());
} else {
  loadSheetInto();
}
