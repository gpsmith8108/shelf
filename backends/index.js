// The one place that chooses the search backend. Backends are tried in order: if one errors or
// takes longer than TIMEOUT_MS, the next one answers instead. To switch sources, add a module
// with the same exports as gutendex.js (name, search, fallbackUrl) and list it here.
import * as gutendex from "./gutendex.js";
import * as archive from "./archive.js";

const BACKENDS = [gutendex, archive];
const TIMEOUT_MS = 8000;

// Once a backend fails, keep using the next one for the rest of the visit.
let active = 0;

export let name = BACKENDS[0].name;

export function fallbackUrl(query) {
  return BACKENDS[active].fallbackUrl(query);
}

export async function search(query, opts = {}) {
  let lastError;
  for (let i = active; i < BACKENDS.length; i++) {
    // Built by hand instead of AbortSignal.any so older iPhones still work.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const forward = () => controller.abort();
    opts.signal?.addEventListener("abort", forward);
    const signal = controller.signal;
    try {
      const result = await BACKENDS[i].search(query, { ...opts, signal });
      active = i;
      name = BACKENDS[i].name;
      return { ...result, source: name };
    } catch (err) {
      if (opts.signal?.aborted) throw err;
      lastError = err;
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", forward);
    }
  }
  throw lastError;
}
