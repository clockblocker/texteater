import * as Atom from "effect/reactivity/Atom";
import { locationAtom } from "@/lib/location-atoms";
import type { NavigateOptions } from "./playground-router";

/** A move to `pathname`, as a new history entry unless `replace` is set. */
export type PathnameChange = NavigateOptions & { readonly pathname: string };

/**
 * `location.pathname`, read through `locationAtom`, which owns the
 * `popstate` listener. Setting it pushes or replaces the history entry and
 * notifies readers; Back and Forward update it through `popstate`.
 */
export const pathnameAtom = Atom.writable(
	(get): string => get(locationAtom).pathname,
	(ctx, { pathname, replace = false }: PathnameChange) => {
		if (window.location.pathname === pathname) return;
		ctx.set(locationAtom, { pathname, replace });
	},
);
