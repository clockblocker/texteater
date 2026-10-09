let cached: boolean | undefined;

/**
 * Caches and returns matchMedia()'s computed value for "pointer:coarse"
 */
export function isCoarsePointer(): boolean {
	if (cached === undefined) {
		if (typeof matchMedia === "function") {
			cached = !!matchMedia("(pointer:coarse)").matches;
		} else {
			cached = false;
		}
	}

	return cached;
}

/**
 * Forgets the cached value, so the next isCoarsePointer() reads matchMedia()
 * again. Tests share this module, so one that stubs matchMedia() resets the
 * cache before and after it.
 */
export function resetCoarsePointerCache() {
	cached = undefined;
}
