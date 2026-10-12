import * as backend from "./backends/index.js?v=4";

const $ = (id) => document.getElementById(id);
const form = $("form"), q = $("q"), lang = $("lang");
const noticeEl = $("notice"), statusEl = $("status"), results = $("results"), more = $("more");

$("source").textContent = backend.name;

let current = { query: "", language: "", page: 1 };
let controller = null;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  node.append(...children.filter(Boolean));
  return node;
}

function link(href, text, cls) {
  return el("a", { href, target: "_blank", rel: "noopener", ...(cls ? { class: cls } : {}) }, text);
}

function renderBook(b) {
  const cover = el("div", { class: "cover" });
  if (b.cover) {
    const img = el("img", { src: b.cover, alt: "", loading: "lazy" });
    img.onerror = () => { img.remove(); cover.textContent = b.title.slice(0, 40); };
    cover.append(img);
  } else {
    cover.textContent = b.title.slice(0, 40);
  }

  const by = b.authors.length ? b.authors.join(", ") : "Unknown author";
  const meta = [by + (b.years ? ` (${b.years})` : ""), b.languages.join(", ").toUpperCase()].join(" · ");

  const actions = el("div", { class: "actions" });
  if (b.readUrl) actions.append(link(b.readUrl, "Read online", "primary"));
  for (const d of b.downloads) actions.append(link(d.url, d.label));
  actions.append(link(b.pageUrl, "Details"));

  return el("li", { class: "book" },
    cover,
    el("div", { class: "info" },
      el("h2", { class: "title" }, link(b.pageUrl, b.title)),
      el("p", { class: "meta" }, meta),
      actions,
    ),
  );
}

function setStatus(text, fallbackQuery) {
  statusEl.textContent = text;
  if (fallbackQuery !== undefined) {
    statusEl.append(" ", link(backend.fallbackUrl(fallbackQuery), "Search on the source site instead"));
  }
}

// Shown in place of results when a search comes back empty or the search service is down.
function notice(heading, body, links) {
  const box = el("div", { class: "notice", role: "status" },
    el("p", { class: "notice-title" }, heading),
    el("p", {}, body),
  );
  if (links.length) box.append(el("div", { class: "actions" }, ...links.map(([href, text]) => link(href, text))));
  noticeEl.replaceChildren(box);
  noticeEl.hidden = false;
}

function notFound(query, language) {
  const q = encodeURIComponent(query);
  notice(
    `Can’t find “${query}”`,
    (language ? "Nothing matched in the language you picked. " : "") +
      "It may not be in the free collection. Most books published after 1930 are still under copyright, so they aren’t here. Check the spelling, or try just the author’s last name.",
    [
      [backend.fallbackUrl(query), "Search Gutenberg directly"],
      [`https://openlibrary.org/search?q=${q}`, "Look it up on Open Library"],
    ],
  );
}

async function run({ append = false } = {}) {
  controller?.abort();
  controller = new AbortController();
  const { query, language, page } = current;
  if (!append) {
    noticeEl.hidden = true;
    results.replaceChildren();
    more.hidden = true;
  }
  setStatus(query ? `Searching for “${query}”…` : "Loading the most downloaded books…");
  try {
    const res = await backend.search(query, { page, language, signal: controller.signal });
    $("source").textContent = res.source;
    results.append(...res.books.map(renderBook));
    const shown = results.children.length;
    if (!shown) {
      setStatus("");
      notFound(query, language);
    }
    else if (query) setStatus(`${res.total.toLocaleString()} book${res.total === 1 ? "" : "s"} for “${query}”`);
    else setStatus("Most downloaded books. Search by title or author above.");
    more.hidden = !res.hasMore || !shown;
  } catch (err) {
    if (controller.signal.aborted) return;
    setStatus("");
    notice(
      "Search isn’t responding",
      "The book search services didn’t answer, so this doesn’t mean the book is missing. Check your connection and try again.",
      query ? [[backend.fallbackUrl(query), "Search Gutenberg directly"]] : [],
    );
  }
}

function syncUrl() {
  const params = new URLSearchParams();
  if (current.query) params.set("q", current.query);
  if (current.language) params.set("lang", current.language);
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function startSearch() {
  current = { query: q.value.trim(), language: lang.value, page: 1 };
  syncUrl();
  run();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  q.blur(); // closes the iPhone keyboard so the results are visible
  startSearch();
});
lang.addEventListener("change", startSearch);
more.addEventListener("click", () => {
  current.page += 1;
  run({ append: true });
});

const params = new URLSearchParams(location.search);
q.value = params.get("q") || "";
lang.value = params.get("lang") || "";
startSearch();
