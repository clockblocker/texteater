import { describe, expect, test } from "bun:test";
import {
	navItemsForPages,
	renderNavJson,
	renderNavMarkdown,
} from "../scripts/generate-content/docs/nav";

describe("planned docs navigation", () => {
	const pages = [
		{
			frontmatter: {
				navTitle: "Second",
				order: 2,
				routeId: "published/second",
				title: "Zeta",
			},
			routeId: "second",
		},
		{
			frontmatter: {
				order: 1,
				title: "Home",
			},
			routeId: "index",
		},
		{
			frontmatter: {
				order: 2,
				title: "Alpha",
			},
			routeId: "first",
		},
	];

	test("sorts and maps page metadata without reading generated files", () => {
		expect(navItemsForPages(pages)).toEqual([
			{
				href: "/",
				mdHref: "/index.md",
				routeId: "index",
				title: "Home",
			},
			{
				href: "/first/",
				mdHref: "/first.md",
				routeId: "first",
				title: "Alpha",
			},
			{
				href: "/second/",
				mdHref: "/second.md",
				routeId: "published/second",
				title: "Second",
			},
		]);
	});

	test("preserves the public nav byte formats", () => {
		const items = navItemsForPages(pages);

		expect(renderNavJson(items)).toEndWith("\n");
		expect(renderNavMarkdown(items)).toBe(
			[
				"- [Home](/) ([md](/index.md))",
				"- [Alpha](/first/) ([md](/first.md))",
				"- [Second](/second/) ([md](/second.md))",
				"",
			].join("\n"),
		);
	});
});
