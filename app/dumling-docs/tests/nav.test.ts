import { describe, expect, test } from "bun:test";
import {
	renderNavJson,
	renderNavMarkdown,
} from "../scripts/generate-content/docs/nav";
import { navItems } from "../src/lib/navigation";

describe("planned docs navigation", () => {
	const pages = [
		{
			navTitle: "Second",
			order: 2,
			routeId: "second",
			title: "Zeta",
		},
		{
			order: 1,
			routeId: "index",
			title: "Home",
		},
		{
			order: 2,
			routeId: "first",
			title: "Alpha",
		},
	];

	test("sorts and maps page metadata without reading generated files", () => {
		expect(navItems(pages)).toEqual([
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
				routeId: "second",
				title: "Second",
			},
		]);
	});

	test("preserves the public nav byte formats", () => {
		const items = navItems(pages);

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
