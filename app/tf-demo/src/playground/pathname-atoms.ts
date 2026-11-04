import * as Atom from "effect/reactivity/Atom";
import type { NavigateOptions } from "./playground-router";

/** A move to `pathname`, as a new history entry unless `replace` is set. */
export type PathnameChange = NavigateOptions & { readonly pathname: string };

/**
 * `location.pathname`. Setting it pushes or replaces the history entry and
 * notifies readers; Back and Forward update it through `popstate`. The
 * listener lives as long as the atom has readers, and the pathname is read
 * afresh when a reader comes back, so the atom needs no keepAlive.
 */
export const pathnameAtom = Atom.writable(
	(get): string => {
		const onPopState = () => get.setSelf(window.location.pathname);
		window.addEventListener("popstate", onPopState);
		get.addFinalizer(() =>
			window.removeEventListener("popstate", onPopState),
		);
		return window.location.pathname;
	},
	(ctx, { pathname, replace = false }: PathnameChange) => {
		if (window.location.pathname === pathname) return;
		if (replace) window.history.replaceState(null, "", pathname);
		else window.history.pushState(null, "", pathname);
		ctx.setSelf(pathname);
	},
);
