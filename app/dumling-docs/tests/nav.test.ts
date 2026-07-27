import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { docsInitialOwnershipForGeneratedPaths } from "../scripts/generate-content/docs/initial-ownership";
import {
	navItemsForPages,
	renderNavJson,
	renderNavMarkdown,
} from "../scripts/generate-content/docs/nav";
import { generatedDocsDir } from "../scripts/generate-content/shared/paths";

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

	test("first-run ownership adopts prior docs and navigation outputs", () => {
		expect(
			docsInitialOwnershipForGeneratedPaths([
				join(generatedDocsDir, "index.md"),
				join(generatedDocsDir, "u/feature.md"),
			]),
		).toEqual({
			generatedDocs: ["index.md", "u/feature.md"],
			publicDocs: ["index.md", "nav.json", "nav.md", "u/feature.md"],
		});
	});
});
