import type { NavItem } from "../../../src/lib/navigation.ts";

export function renderNavJson(items: readonly NavItem[]): string {
	return `${JSON.stringify(items, null, 2)}\n`;
}

export function renderNavMarkdown(items: readonly NavItem[]): string {
	return `${items
		.map((item) => `- [${item.title}](${item.href}) ([md](${item.mdHref}))`)
		.join("\n")}\n`;
}
