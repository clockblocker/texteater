import type { CollectionEntry } from "astro:content";

export interface NavItem {
	href: string;
	mdHref: string;
	routeId: string;
	title: string;
}

export function routeIdForDocId(id: string): string {
	return id.endsWith("/index") ? id.slice(0, -"/index".length) : id;
}

export function routeIdForPage(
	page: CollectionEntry<"docs"> | CollectionEntry<"entities">,
): string {
	return page.data.routeId ?? routeIdForDocId(page.id);
}

export function publicHrefForRouteId(routeId: string): string {
	return routeId === "index" ? "/" : `/${routeId}/`;
}

export function hrefForPage(
	page: CollectionEntry<"docs"> | CollectionEntry<"entities">,
): string {
	return publicHrefForRouteId(routeIdForPage(page));
}

export function paramsSlugForPage(
	page: CollectionEntry<"docs"> | CollectionEntry<"entities">,
): string {
	const href = hrefForPage(page);
	if (href === "/") {
		return "";
	}

	return href.replace(/^\/+/u, "").replace(/\/+$/u, "");
}

export function mdHrefForRouteId(routeId: string): string {
	return routeId === "index" ? "/index.md" : `/${routeId}.md`;
}

export function mdHrefForPage(
	page: CollectionEntry<"docs"> | CollectionEntry<"entities">,
): string {
	return mdHrefForRouteId(routeIdForPage(page));
}

export function navItemsForDocs(docs: CollectionEntry<"docs">[]): NavItem[] {
	return docs
		.toSorted((left, right) => {
			const orderDelta = left.data.order - right.data.order;
			if (orderDelta !== 0) {
				return orderDelta;
			}
			return left.data.title.localeCompare(right.data.title);
		})
		.map((doc) => ({
			href: hrefForPage(doc),
			mdHref: mdHrefForPage(doc),
			routeId: routeIdForPage(doc),
			title: doc.data.navTitle ?? doc.data.title,
		}));
}
