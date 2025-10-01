// Utility functions

export function getGidFromPublished(url) {
  try {
    const u = new URL(url);
    const gid = u.searchParams.get("gid");
    return gid ? String(gid) : null;
  } catch (_) {
    return null;
  }
}

// Fisher–Yates shuffle
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function slugify(str) {
  return String(str)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
