// Internet Archive's copy of the Project Gutenberg collection, via its public advanced-search API.
// Same exports and Book shape as gutendex.js.

const API = "https://archive.org/advancedsearch.php";
const ROWS = 32;
const LANGS = { en: "eng", fr: "fre", de: "ger", es: "spa", it: "ita", pt: "por", nl: "dut", fi: "fin" };

const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);

function displayName(raw) {
  const name = raw.replace(/,?\s*\d{3,4}\s*-\s*\d{0,4}\s*$/, "").trim();
  const [last, first] = name.split(", ");
  return first ? `${first} ${last}` : name;
}

function escape(text) {
  return text.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, " ").trim();
}

function toBook(d) {
  const page = `https://archive.org/details/${d.identifier}`;
  return {
    id: d.identifier,
    title: list(d.title)[0] || d.identifier,
    authors: list(d.creator).map(displayName),
    years: "",
    languages: list(d.language).map((l) => l.slice(0, 3)),
    cover: `https://archive.org/services/img/${d.identifier}`,
    readUrl: page,
    downloads: [],
    pageUrl: page,
  };
}

export const name = "Project Gutenberg (Internet Archive)";

export async function search(query, { page = 1, language = "", signal } = {}) {
  const parts = ["collection:gutenberg", "mediatype:texts"];
  const words = escape(query);
  if (words) parts.push(`(title:(${words}) OR creator:(${words}))`);
  if (language) parts.push(`language:(${LANGS[language] || language})`);
  const url = new URL(API);
  url.searchParams.set("q", parts.join(" AND "));
  for (const f of ["identifier", "title", "creator", "language"]) url.searchParams.append("fl[]", f);
  url.searchParams.set("sort[]", "downloads desc");
  url.searchParams.set("rows", ROWS);
  url.searchParams.set("page", page);
  url.searchParams.set("output", "json");
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Internet Archive answered ${res.status}`);
  const { response } = await res.json();
  return {
    total: response.numFound,
    hasMore: response.start + response.docs.length < response.numFound,
    books: response.docs.map(toBook),
  };
}

export function fallbackUrl(query) {
  return `https://www.gutenberg.org/ebooks/search/?query=${encodeURIComponent(query)}`;
}
