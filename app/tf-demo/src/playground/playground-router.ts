/**
 * The one URL prefix the Playground owns. Everything else in tf-demo lives at
 * `/` (see `main.tsx`), so `pathnameAtom` is the only place `history` is
 * written. This module stays free of React and Effect because `main.tsx`
 * loads it before the app chunk.
 */
export const PLAYGROUND_BASE = "/playground";

export function isPlaygroundPath(pathname: string): boolean {
	return (
		pathname === PLAYGROUND_BASE ||
		pathname.startsWith(`${PLAYGROUND_BASE}/`)
	);
}

export type NavigateOptions = {
	/** Rewrite the current history entry instead of adding one. */
	readonly replace?: boolean;
};

/** Segments after `/playground`, decoded. `/playground` itself yields `[]`. */
export function playgroundSegments(pathname: string): readonly string[] {
	if (!isPlaygroundPath(pathname)) return [];
	return pathname
		.slice(PLAYGROUND_BASE.length)
		.split("/")
		.filter((segment) => segment.length > 0)
		.map(decodeURIComponent);
}

/** The `/playground/...` pathname of `segments`, encoded. */
export function playgroundPath(segments: readonly string[]): string {
	return [PLAYGROUND_BASE, ...segments.map(encodeURIComponent)].join("/");
}

/**
 * What an entry sees of the URL: the segments after its own key, and a way to
 * change them. Entries never touch `/playground/<key>` themselves.
 */
export type EntryRoute = {
	readonly segments: readonly string[];
	readonly setSegments: (
		next: readonly string[],
		options?: NavigateOptions,
	) => void;
};
