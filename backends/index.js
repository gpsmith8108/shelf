// The one place that chooses the search backend. To switch sources, add a module with the
// same exports as gutendex.js (name, search, fallbackUrl) and point this line at it.
export * from "./gutendex.js";
