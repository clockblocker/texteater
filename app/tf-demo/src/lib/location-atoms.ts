import * as Atom from "effect/reactivity/Atom";

/** The history entry the page is on. */
export type LocationEntry = {
	readonly pathname: string;
	/** The entry's `history.state`, as whoever wrote it left it. */
	readonly state: unknown;
	/** Back or Forward brought it, rather than a write through this atom. */
	readonly popped: boolean;
};

/**
 * A move through history: a new entry, unless `replace` rewrites the
 * current one, or a step of `go` entries, as Back and Forward take.
 */
export type LocationChange =
	| {
			readonly pathname: string;
			readonly state?: unknown;
			readonly replace?: boolean;
	  }
	| { readonly go: number };

/**
 * tf-demo's one reader and writer of `window.history`: the Playground's
 * pathname and the workspace's Address both go through it, and it owns the
 * one `popstate` listener. The listener lives as long as the atom has
 * readers, and the entry is read afresh when a reader comes back, so the
 * atom needs no keepAlive. A `go` lands later, through `popstate`.
 */
export const locationAtom = Atom.writable(
	(get): LocationEntry => {
		const onPopState = () => get.setSelf(currentEntry(true));
		window.addEventListener("popstate", onPopState);
		get.addFinalizer(() =>
			window.removeEventListener("popstate", onPopState),
		);
		return currentEntry(false);
	},
	(ctx, change: LocationChange) => {
		if ("go" in change) {
			window.history.go(change.go);
			return;
		}
		const state = change.state ?? null;
		if (change.replace)
			window.history.replaceState(state, "", change.pathname);
		else window.history.pushState(state, "", change.pathname);
		/* read afresh, so a write before any reader still sets the listener */
		ctx.refreshSelf();
	},
);

function currentEntry(popped: boolean): LocationEntry {
	return {
		pathname: window.location.pathname,
		state: window.history.state as unknown,
		popped,
	};
}
