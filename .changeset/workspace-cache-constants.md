---
"@promptshield/workspace": patch
---

refactor(cache): extract magic strings to constants and initialize cache.json on construction

- Add `CACHE_FILE`, `STATE_FILE`, and `LOCK_FILE` constants to `constants.ts`
- Replace all inline string literals (`"cache.json"`, `"state.json"`, `"cache.lock"`) with the new constants throughout `cache.ts`
- Initialize `cache.json` in the `CacheManager` constructor when in `single` mode and the file does not yet exist, preventing a missing-file error on first read
