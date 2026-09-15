import { useSyncExternalStore } from "react";

/**
 * The one URL prefix the Playground owns. Everything else in tf-demo lives at
 * `/` (see `main.tsx`), so this is the only place `history` is written.
 */
export const PLAYGROUND_BASE = "/playground";

export function isPlaygroundPath(pathname: string): boolean {
	return (
		pathname === PLAYGROUND_BASE ||
		pathname.startsWith(`${PLAYGROUND_BASE}/`)
	);
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	window.addEventListener("popstate", listener);
	return () => {
		listeners.delete(listener);
		window.removeEventListener("popstate", listener);
	};
}

function readPathname(): string {
	return window.location.pathname;
}

/** Current `location.pathname`, updated on `navigate` and on Back/Forward. */
export function usePathname(): string {
	return useSyncExternalStore(subscribe, readPathname, () => "/");
}

export type NavigateOptions = {
	/** Rewrite the current history entry instead of adding one. */
	readonly replace?: boolean;
};

export function navigate(
	pathname: string,
	{ replace = false }: NavigateOptions = {},
): void {
	if (window.location.pathname === pathname) return;
	if (replace) {
		window.history.replaceState(null, "", pathname);
	} else {
		window.history.pushState(null, "", pathname);
	}
	for (const listener of listeners) listener();
}

/** Segments after `/playground`, decoded. `/playground` itself yields `[]`. */
export function playgroundSegments(pathname: string): readonly string[] {
	if (!isPlaygroundPath(pathname)) return [];
	return pathname
		.slice(PLAYGROUND_BASE.length)
		.split("/")
		.filter((segment) => segment.length > 0)
		.map(decodeURIComponent);
}

export function playgroundPath(segments: readonly string[]): string {
	return [PLAYGROUND_BASE, ...segments.map(encodeURIComponent)].join("/");
}

export function navigatePlayground(
	segments: readonly string[],
	options?: NavigateOptions,
): void {
	navigate(playgroundPath(segments), options);
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
