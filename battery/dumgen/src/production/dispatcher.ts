/**
 * The single production selection seam. A Closed branch is terminal: its
 * result is returned verbatim, including a CatalogMiss, and Open is never
 * consulted as a fallback.
 */
export function dispatchProduction<Result>(options: {
	readonly closed: boolean;
	readonly runClosed: () => Promise<Result>;
	readonly runOpen: () => Promise<Result>;
}): Promise<Result> {
	return options.closed ? options.runClosed() : options.runOpen();
}
