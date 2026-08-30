import { expect, test } from "bun:test";
import { join } from "node:path";

import {
	auditIndexCoverage,
	auditMarkdownLinks,
	markdownLinks,
} from "../documentation-integrity";
import { temporaryRepository, writeSource } from "./helpers";

test("extracts inline and reference links while ignoring fenced examples", () => {
	expect(
		markdownLinks(`
[inline](./inline.md)
[reference]: ./reference.md

\`\`\`md
[ignored](./ignored.md)
\`\`\`
`),
	).toEqual([
		{ line: 2, target: "./inline.md" },
		{ line: 3, target: "./reference.md" },
	]);
});

test("reports missing local targets and Markdown anchors as advisories", async () => {
	const root = await temporaryRepository();
	await writeSource(
		root,
		"docs/source.md",
		"[good](./target.md#known-heading)\n[missing](./missing.md)\n[anchor](./target.md#absent)\n",
	);
	await writeSource(root, "docs/target.md", "# Known heading\n");

	expect(
		await auditMarkdownLinks(root, [join(root, "docs/source.md")]),
	).toEqual([
		{
			detail: "target does not exist: ./missing.md",
			file: "docs/source.md",
			kind: "broken-link",
			line: 2,
			severity: "advisory",
		},
		{
			detail: "anchor does not exist: #absent",
			file: "docs/source.md",
			kind: "broken-anchor",
			line: 3,
			severity: "advisory",
		},
	]);
});

test("requires every document in an indexed branch to have an inbound link", async () => {
	const root = await temporaryRepository();
	await writeSource(root, "docs/README.md", "[Indexed](./indexed.md)\n");
	await writeSource(root, "docs/indexed.md", "# Indexed\n");
	await writeSource(root, "docs/orphan.md", "# Orphan\n");

	expect(
		await auditIndexCoverage(root, [
			{ index: "docs/README.md", roots: ["docs"] },
		]),
	).toEqual([
		{
			detail: "document is not linked from docs/README.md",
			file: "docs/orphan.md",
			kind: "index-coverage",
			severity: "error",
		},
	]);
});
