import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { demos } from ".";

describe("demo registry", () => {
	test("slugs are unique and URL-safe", () => {
		const slugs = demos.map((demo) => demo.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const slug of slugs) expect(slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
	});

	test("every demo has a folder with an index.tsx, and every folder a demo", () => {
		const folders = readdirSync(import.meta.dir, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort();
		expect(folders).toEqual(demos.map((demo) => demo.slug).sort());
		for (const folder of folders)
			expect(existsSync(join(import.meta.dir, folder, "index.tsx"))).toBe(
				true,
			);
	});

	test("every demo names its inspiration", () => {
		for (const demo of demos)
			expect(demo.inspiration.length).toBeGreaterThan(0);
	});
});
