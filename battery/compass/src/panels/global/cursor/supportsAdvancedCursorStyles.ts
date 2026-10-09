let cached: boolean | undefined;

/**
 * Caches and returns if advanced cursor CSS styles are supported.
 */
export function supportsAdvancedCursorStyles(): boolean {
	if (cached === undefined) {
		cached = false;

		if (typeof window !== "undefined") {
			if (
				window.navigator.userAgent.includes("Chrome") ||
				window.navigator.userAgent.includes("Firefox")
			) {
				cached = true;
			}
		}
	}

	return cached;
}

/**
 * Forgets the cached value, so the next supportsAdvancedCursorStyles() reads
 * the user agent again. Tests share this module, so one that stubs `window`
 * resets the cache before and after it.
 */
export function resetAdvancedCursorStylesCache() {
	cached = undefined;
}
