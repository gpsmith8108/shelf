# Shelf

A minimal search page for free public-domain books from Project Gutenberg, made for iPhone and desktop.

It is a static site (no build step). Search goes through `backends/index.js`, which re-exports one backend module. To change the book source, add a module with the same exports as `backends/gutendex.js` (`name`, `search`, `fallbackUrl`) and point `backends/index.js` at it.

Run locally with any static server, for example `npx serve .`.
