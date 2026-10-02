import type { CollectionEntry } from "astro:content";

export interface NavItem {
	href: string;
	mdHref: string;
	routeId: string;
	title: string;
}

type NavPage = {
	navTitle?: string;
	order: number;
	routeId: string;
	title: string;
};

function routeIdForDocId(id: string): string {
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

/** The site navigation: pages by `order`, then by title. */
export function navItems(pages: readonly NavPage[]): NavItem[] {
	return pages
		.toSorted((left, right) => {
			const orderDelta = left.order - right.order;
			if (orderDelta !== 0) {
				return orderDelta;
			}
			return left.title.localeCompare(right.title);
		})
		.map((page) => ({
			href: publicHrefForRouteId(page.routeId),
			mdHref: `/${page.routeId}.md`,
			routeId: page.routeId,
			title: page.navTitle ?? page.title,
		}));
}
