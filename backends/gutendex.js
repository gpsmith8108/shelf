// Project Gutenberg search via the public Gutendex API (https://gutendex.com).
// Every backend exports the same shape so the page never needs to know which one it is talking to:
//   search(query, { page, signal }) -> { total, hasMore, books: [Book] }
//   Book = { id, title, authors, years, languages, cover, readUrl, downloads: [{ label, url }], pageUrl }

const API = "https://gutendex.com/books/";

const FORMATS = [
  ["application/epub+zip", "EPUB"],
  ["application/x-mobipocket-ebook", "Kindle"],
  ["application/pdf", "PDF"],
  ["text/plain; charset=utf-8", "Text"],
  ["text/plain; charset=us-ascii", "Text"],
];

function pick(formats, mime) {
  const key = Object.keys(formats).find((k) => k === mime || k.startsWith(mime));
  return key ? formats[key] : null;
}

function lifeSpan(a) {
  if (!a.birth_year && !a.death_year) return "";
  return `${a.birth_year ?? "?"}–${a.death_year ?? "?"}`;
}

// Gutenberg stores names as "Austen, Jane"; show them the way people say them.
function displayName(name) {
  const [last, first] = name.split(", ");
  return first ? `${first.replace(/\s*\(.*\)$/, "")} ${last}` : name;
}

function toBook(b) {
  const seen = new Set();
  const downloads = [];
  for (const [mime, label] of FORMATS) {
    const url = pick(b.formats, mime);
    if (url && !seen.has(label)) {
      seen.add(label);
      downloads.push({ label, url });
    }
  }
  return {
    id: b.id,
    title: b.title,
    authors: b.authors.map((a) => displayName(a.name)),
    years: b.authors.map(lifeSpan).filter(Boolean)[0] || "",
    languages: b.languages,
    cover: pick(b.formats, "image/jpeg"),
    readUrl: pick(b.formats, "text/html"),
    downloads,
    pageUrl: `https://www.gutenberg.org/ebooks/${b.id}`,
  };
}

export const name = "Project Gutenberg";

export async function search(query, { page = 1, language = "", signal } = {}) {
  const url = new URL(API);
  if (query) url.searchParams.set("search", query);
  if (language) url.searchParams.set("languages", language);
  if (page > 1) url.searchParams.set("page", page);
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Gutendex answered ${res.status}`);
  const data = await res.json();
  return { total: data.count, hasMore: Boolean(data.next), books: data.results.map(toBook) };
}

// A plain link to the same search on gutenberg.org, used when the API is down.
export function fallbackUrl(query) {
  return `https://www.gutenberg.org/ebooks/search/?query=${encodeURIComponent(query)}`;
}
