import { publicHrefForRouteId } from "./routes";
import type { DocsOutput } from "./types";

export type NavItem = {
	href: string;
	mdHref: string;
	routeId: string;
	title: string;
};

type NavPage = Pick<DocsOutput, "frontmatter" | "routeId">;

export function navItemsForPages(pages: readonly NavPage[]): NavItem[] {
	return pages
		.toSorted((left, right) => {
			const orderDelta = left.frontmatter.order - right.frontmatter.order;
			if (orderDelta !== 0) {
				return orderDelta;
			}
			return left.frontmatter.title.localeCompare(
				right.frontmatter.title,
			);
		})
		.map((page) => ({
			href: publicHrefForRouteId(page.routeId),
			mdHref:
				page.routeId === "index" ? "/index.md" : `/${page.routeId}.md`,
			routeId: page.frontmatter.routeId ?? page.routeId,
			title: page.frontmatter.navTitle ?? page.frontmatter.title,
		}));
}

export function renderNavJson(items: readonly NavItem[]): string {
	return `${JSON.stringify(items, null, 2)}\n`;
}

export function renderNavMarkdown(items: readonly NavItem[]): string {
	return `${items
		.map((item) => `- [${item.title}](${item.href}) ([md](${item.mdHref}))`)
		.join("\n")}\n`;
}
