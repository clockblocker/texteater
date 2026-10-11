import { useMemo, useSyncExternalStore } from "react";

/**
 * Hash routing: `#/<slug>?w=390&dir=rtl&theme=light&motion=reduced`. The
 * path picks the page; the query holds the toolbar's settings and any
 * state a demo keeps in the URL through `useDemoParam`.
 */

type HashLocation = {
	readonly path: string;
	readonly params: URLSearchParams;
};

/** Query names the toolbar owns; demos pick other names. */
export const shellParamNames: readonly string[] = [
	"w",
	"dir",
	"theme",
	"motion",
];

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	window.addEventListener("hashchange", listener);
	return () => {
		listeners.delete(listener);
		window.removeEventListener("hashchange", listener);
	};
}

function readHash(): string {
	return window.location.hash.replace(/^#/, "");
}

function parseHash(hash: string): HashLocation {
	const query = hash.indexOf("?");
	const path = query === -1 ? hash : hash.slice(0, query);
	return {
		path: path === "" ? "/" : path,
		params: new URLSearchParams(query === -1 ? "" : hash.slice(query + 1)),
	};
}

/** `#path?query` for a link. */
export function hashHref(path: string, params: URLSearchParams): string {
	const query = params.toString();
	return `#${path}${query ? `?${query}` : ""}`;
}

export function useHashLocation(): HashLocation {
	const hash = useSyncExternalStore(subscribe, readHash);
	return useMemo(() => parseHash(hash), [hash]);
}

/**
 * Sets or clears query params on the current page. `push` adds a history
 * entry, so the browser's back button undoes the change; otherwise the
 * current entry is replaced.
 */
export function setHashParams(
	updates: Readonly<Record<string, string | null>>,
	{ push = false }: { readonly push?: boolean } = {},
): void {
	const { path, params } = parseHash(readHash());
	for (const [name, value] of Object.entries(updates)) {
		if (value === null) params.delete(name);
		else params.set(name, value);
	}
	const href = hashHref(path, params);
	if (push) {
		window.location.hash = href;
		return;
	}
	window.history.replaceState(window.history.state, "", href);
	for (const listener of listeners) listener();
}

/**
 * One URL query param a demo owns, such as the open stack in
 * `collapsed-stack`. Set it with `{ push: true }` to make browser back walk
 * the change. The toolbar's names (`w`, `dir`, `theme`, `motion`) are
 * reserved.
 */
export function useDemoParam(
	name: string,
): readonly [
	string | null,
	(value: string | null, options?: { readonly push?: boolean }) => void,
] {
	if (shellParamNames.includes(name))
		throw new Error(`useDemoParam: "${name}" is the toolbar's param`);
	const { params } = useHashLocation();
	return [
		params.get(name),
		(value, options) => setHashParams({ [name]: value }, options),
	];
}
