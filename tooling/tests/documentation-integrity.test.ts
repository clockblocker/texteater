import { expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";

import {
	adrAmendmentCitationIssues,
	adrLogbookIssues,
	adrStructureIssues,
	auditAdrAmendmentCitations,
	auditAdrs,
	auditAllowedPaths,
	auditCoordinationFiles,
	auditEmptyScaffolding,
	auditMarkdownLinks,
	auditProtectedChanges,
	auditProtectedPlacement,
	developerDocumentationFiles,
	formatDocumentationIssue,
	glossaryMapStructureIssues,
	glossaryStructureIssues,
	isAdrCitationScanPath,
	isDeveloperDocumentationPath,
	isEmptyScaffoldingContent,
	isProtectedDeveloperDocument,
	markdownLinks,
} from "../documentation-integrity";
import { temporaryRepository, writeSource } from "./helpers";

async function gitRepository(): Promise<string> {
	const root = await temporaryRepository();
	expect(Bun.spawnSync(["git", "init", "-q"], { cwd: root }).exitCode).toBe(
		0,
	);
	return root;
}

function git(root: string, ...args: string[]): void {
	expect(
		Bun.spawnSync(
			[
				"git",
				"-c",
				"user.name=fixture",
				"-c",
				"user.email=fixture@example.com",
				...args,
			],
			{ cwd: root },
		).exitCode,
	).toBe(0);
}

test("excludes package READMEs and produced artifacts from developer documentation", () => {
	expect(isDeveloperDocumentationPath("README.md")).toBeTrue();
	expect(isDeveloperDocumentationPath("app/tf-demo/README.md")).toBeTrue();
	expect(
		isDeveloperDocumentationPath(
			"battery/dumgen/docs/research/evidence.md",
		),
	).toBeTrue();
	expect(
		isDeveloperDocumentationPath("battery/dumgen/README.md"),
	).toBeFalse();
	expect(
		isDeveloperDocumentationPath(
			"battery/dumgen/generate-readme/README.template.md",
		),
	).toBeFalse();
	expect(
		isDeveloperDocumentationPath(
			"battery/dumgen/docs/prototypes/example/runs/2026-01-01/diagnostic-report.md",
		),
	).toBeFalse();
	expect(
		isDeveloperDocumentationPath(
			"battery/dumgen/evidence/segment-in-units-lab/runs/example/sweep.md",
		),
	).toBeFalse();
});

test("checks only the documents git would track", async () => {
	const root = await gitRepository();
	await writeSource(root, ".gitignore", "test-results/\n.runs/\n");
	await writeSource(root, "docs/reference/committed.md", "# Committed\n");
	await writeSource(root, "docs/reference/deleted.md", "# Deleted\n");
	git(root, "add", ".");
	git(root, "commit", "-q", "-m", "fixture");
	await rm(`${root}/docs/reference/deleted.md`);
	await writeSource(root, "docs/reference/uncommitted.md", "# New\n");
	await writeSource(
		root,
		"app/demo/test-results/run/error-context.md",
		"# Playwright output\n",
	);
	await writeSource(root, ".runs/dumgen/note.md", "# Run output\n");

	expect(await developerDocumentationFiles(root)).toEqual([
		"docs/reference/committed.md",
		"docs/reference/uncommitted.md",
	]);
});

test("enforces canonical developer-documentation paths", () => {
	expect(
		auditAllowedPaths([
			"README.md",
			"app/tf-demo/README.md",
			"battery/dumgen/GLOSSARY.md",
			"docs/adr/0001-use-a-contract.md",
			"battery/dumgen/docs/reference/prompt-contract.md",
			"docs/runbooks/release.md",
			"app/tf-demo/.agents/skills/convex-reviewer/SKILL.md",
		]),
	).toEqual([]);
	expect(auditAllowedPaths(["docs/research/notes.md"])).toEqual([
		{
			detail: "developer documentation must use an agent-instruction, glossary, ADR, reference, runbook, protected Vision, or root maintainer-README path",
			file: "docs/research/notes.md",
			kind: "allowed-path",
			severity: "error",
		},
	]);
});

test("rejects research and prototype notes outside canonical paths", () => {
	expect(
		auditAllowedPaths([
			"battery/dumgen/docs/research/another-investigation.md",
			"battery/dumgen/docs/prototypes/another-experiment/README.md",
		]),
	).toMatchObject([
		{
			file: "battery/dumgen/docs/research/another-investigation.md",
			kind: "allowed-path",
		},
		{
			file: "battery/dumgen/docs/prototypes/another-experiment/README.md",
			kind: "allowed-path",
		},
	]);
});

test("reports misplaced Vision and protected reference files", () => {
	expect(
		auditProtectedPlacement([
			"VISION.md",
			"app/tf-demo/VISION.md",
			"battery/dumgen/docs/persistent/VISION.md",
			"battery/dumgen/docs/human-owned/policy.md",
		]),
	).toMatchObject([
		{
			file: "battery/dumgen/docs/persistent/VISION.md",
			kind: "vision-placement",
		},
		{
			file: "battery/dumgen/docs/human-owned/policy.md",
			kind: "protected-reference-placement",
		},
	]);
});

test("rejects coordination files but exempts functional agent instructions", () => {
	expect(
		auditCoordinationFiles([
			"docs/reference/migration-plan.md",
			"battery/dumgen/docs/reference/prompt-logbook.md",
		]),
	).toMatchObject([
		{ file: "docs/reference/migration-plan.md", kind: "coordination-file" },
		{
			file: "battery/dumgen/docs/reference/prompt-logbook.md",
			kind: "coordination-file",
		},
	]);
	expect(
		auditCoordinationFiles([
			".agents/skills/code-review/SKILL.md",
			"app/tf-demo/.agents/skills/convex-reviewer/SKILL.md",
			"docs/reference/code-review-rubric.md",
		]),
	).toEqual([]);
});

test("enforces the installed glossary shape without judging definitions", () => {
	const valid = `# Ordering Context

Ordering names the concepts used to accept and fulfill an order.

## Language

**Order**:
A customer's request for goods.
_Avoid_: Transaction
`;
	expect(glossaryStructureIssues("battery/order/GLOSSARY.md", valid)).toEqual(
		[],
	);
	expect(
		glossaryStructureIssues(
			"battery/order/GLOSSARY.md",
			"# Ordering Context\n\n## Architecture\n\nImplementation detail.\n",
		),
	).toMatchObject([
		{ file: "battery/order/GLOSSARY.md", kind: "glossary-structure" },
	]);
});

test("enforces the installed Glossary Map headings", () => {
	expect(
		glossaryMapStructureIssues(
			"# Glossary Map\n\n## Contexts\n\n- Ordering\n",
		),
	).toEqual([]);
	expect(
		glossaryMapStructureIssues(
			"# Glossary Map\n\n## Contexts\n\n## Relationships\n",
		),
	).toMatchObject([{ kind: "glossary-map-structure" }]);
});

test("enforces the minimal ADR structure and the accepted-only status", () => {
	expect(
		adrStructureIssues(
			"docs/adr/0001-use-events.md",
			"---\nstatus: accepted\n---\n\n# Use events\n\nContexts communicate with events because they must remain independently deployable.\n",
		),
	).toEqual([]);
	expect(
		adrStructureIssues(
			"docs/adr/0001-use-events.md",
			"---\nstatus: done\nowner: team\n---\n\n# Use events\n\nReason.\n\n## Implementation\n\nDetails.\n",
		),
	).toMatchObject([
		{ kind: "adr-structure", line: 1 },
		{ kind: "adr-structure" },
	]);
	for (const frontmatter of [
		"",
		"---\nstatus: proposed\n---\n\n",
		"---\nstatus: deprecated\n---\n\n",
		"---\nstatus: superseded by ADR-0002\n---\n\n",
	]) {
		expect(
			adrStructureIssues(
				"docs/adr/0001-use-events.md",
				`${frontmatter}# Use events\n\nReason.\n`,
			),
		).toMatchObject([
			{ kind: "adr-structure", line: 1, severity: "error" },
		]);
	}
});

test("rejects every form of ADR amendment logbook with its line", () => {
	const forms = [
		"Amended on 2026-10-01: the test was grammar alone.",
		"Amended 2026-10-02 (#701): segmentation moved.",
		"Also amended on 2026-10-03: the gate was dropped.",
		"Amended again on 2026-10-04: the gate came back.",
		"The UD `foreign` feature is retired (amended 2026-10-01).",
		"Amended by [ADR 0045](./0045-foreign.md): Foreign Lemmas differ.",
		"Since the 2026-10-02 amendment, `so` is one Reading.",
	];
	const text = `---\nstatus: accepted\n---\n\n# Use events\n\n${forms.join("\n\n")}\n`;
	expect(adrLogbookIssues("docs/adr/0001-use-events.md", text)).toMatchObject(
		forms.map((_, index) => ({
			file: "docs/adr/0001-use-events.md",
			kind: "adr-logbook",
			line: 7 + 2 * index,
			severity: "error",
		})),
	);
});

test("allows present-tense Amends, fenced examples and non-ADR documents", async () => {
	expect(
		adrLogbookIssues(
			"docs/adr/0042-scope.md",
			"---\nstatus: accepted\n---\n\n# Scope\n\nReason.\n\n## Consequences\n\n- Amends ADR 0041: a per-Lemma fact.\n- ADR 0004 amends the boundary.\n\n```md\nAmended on 2026-10-01: an example.\n```\n",
		),
	).toEqual([]);
	const root = await temporaryRepository();
	await writeSource(
		root,
		"docs/reference/history.md",
		"# History\n\nThe contract was amended on 2026-10-01.\n",
	);
	await writeSource(
		root,
		"docs/adr/0001-use-events.md",
		"---\nstatus: accepted\n---\n\n# Use events\n\nReason.\n\nAmended on 2026-10-01: an old note.\n",
	);
	expect(
		await auditAdrs(root, [
			"docs/reference/history.md",
			"docs/adr/0001-use-events.md",
		]),
	).toMatchObject([
		{ file: "docs/adr/0001-use-events.md", kind: "adr-logbook", line: 9 },
	]);
});

test("rejects every amendment-style ADR citation in code with its line", () => {
	const forms = [
		"// (ADR 0040, amended 2026-10-02)",
		"// (ADR 0040, amended on #618)",
		"// (Dumgen ADR 0004, amended for #767)",
		"// ADR 0036 amended on #653",
		"// (ADR 0037, amended)",
		" * (Dumgen ADR 0007, amended",
		" * Segments are flat (amended 2026-09-30).",
		'"rationale": "Closed (#725, ADR-0036 amended)."',
		"// Since the 2026-10-02 amendment, so is one Reading.",
		"// ADR 0040's amendment drops the gate.",
	];
	expect(
		adrAmendmentCitationIssues("battery/dumgen/src/x.ts", forms.join("\n")),
	).toEqual(
		forms.map((_, index) => ({
			detail: "Cite the ADR alone, as (ADR 0040) or (ADR 0040, #618); the ADR states its current decision",
			file: "battery/dumgen/src/x.ts",
			kind: "adr-amendment-citation",
			line: index + 1,
			severity: "error",
		})),
	);
});

test("allows a bare ADR citation and the present-tense Amends", () => {
	expect(
		adrAmendmentCitationIssues(
			"battery/dumgen/src/x.ts",
			[
				"// Amends ADR 0041: a per-Lemma fact.",
				"// (ADR 0040, #618)",
				"// (ADR 0040)",
				"const amendedText = rewrite(text);",
			].join("\n"),
		),
	).toEqual([]);
});

test("scans code, tests and records under app, battery and tooling, skipping the rule itself, package READMEs and binaries", async () => {
	expect(
		isAdrCitationScanPath("battery/dumcorpus/records/de/x.json"),
	).toBeTrue();
	expect(isAdrCitationScanPath("app/tf-demo/convex/schema.ts")).toBeTrue();
	expect(isAdrCitationScanPath("tooling/knip.ts")).toBeTrue();
	expect(
		isAdrCitationScanPath("battery/dumgen/docs/adr/0004-x.md"),
	).toBeFalse();
	expect(isAdrCitationScanPath("docs/notes.ts")).toBeFalse();
	expect(isAdrCitationScanPath("battery/dumgen/README.md")).toBeFalse();
	expect(
		isAdrCitationScanPath("tooling/documentation-integrity.ts"),
	).toBeFalse();
	expect(
		isAdrCitationScanPath("tooling/tests/documentation-integrity.test.ts"),
	).toBeFalse();

	const root = await temporaryRepository();
	const citation = "// (ADR 0040, amended 2026-10-02)\n";
	await writeSource(
		root,
		"battery/demo/src/index.ts",
		`export {};\n${citation}`,
	);
	await writeSource(root, "battery/demo/README.md", citation);
	await writeSource(root, "tooling/documentation-integrity.ts", citation);
	await writeSource(root, "battery/demo/data.bin", `\0${citation}`);
	expect(
		await auditAdrAmendmentCitations(root, [
			"battery/demo/src/index.ts",
			"battery/demo/README.md",
			"tooling/documentation-integrity.ts",
			"battery/demo/data.bin",
		]),
	).toMatchObject([
		{
			file: "battery/demo/src/index.ts",
			kind: "adr-amendment-citation",
			line: 2,
		},
	]);
});

test("scans developer documents outside the ADRs, skipping fenced examples", async () => {
	expect(
		isAdrCitationScanPath("battery/dumgen/docs/reference/intake.md"),
	).toBeTrue();
	expect(isAdrCitationScanPath("docs/runbooks/release.md")).toBeTrue();
	expect(isAdrCitationScanPath("battery/dumgen/GLOSSARY.md")).toBeTrue();
	expect(isAdrCitationScanPath("docs/adr/0040-x.md")).toBeFalse();

	const root = await temporaryRepository();
	await writeSource(
		root,
		"battery/demo/docs/reference/intake.md",
		"# Intake\n\nRows are keyed by index (Dumgen ADR 0004, amended\n2026-10-02).\n\n```md\n(ADR 0040, amended 2026-10-02)\n```\n",
	);
	await writeSource(
		root,
		"docs/adr/0040-x.md",
		"---\nstatus: accepted\n---\n\n# X\n\nSee (ADR 0039, amended 2026-10-02).\n",
	);
	expect(
		await auditAdrAmendmentCitations(root, [
			"battery/demo/docs/reference/intake.md",
			"docs/adr/0040-x.md",
		]),
	).toMatchObject([
		{
			file: "battery/demo/docs/reference/intake.md",
			kind: "adr-amendment-citation",
			line: 3,
		},
	]);
});

test("allows ADR number gaps left by deleted decisions", async () => {
	const root = await temporaryRepository();
	await writeSource(
		root,
		"docs/adr/0002-skip-the-first-decision.md",
		"---\nstatus: accepted\n---\n\n# Skip the first decision\n\nThis entry has no 0001 predecessor.\n",
	);
	expect(
		await auditAdrs(root, ["docs/adr/0002-skip-the-first-decision.md"]),
	).toEqual([]);
});

test("detects empty and placeholder scaffolding", () => {
	expect(isEmptyScaffoldingContent("# Empty\n")).toBeTrue();
	expect(isEmptyScaffoldingContent("# Later\n\nTBD\n")).toBeTrue();
	expect(
		isEmptyScaffoldingContent("# Contract\n\nCallers pass an ID.\n"),
	).toBeFalse();
});

test("detects an empty documentation category directory", async () => {
	const root = await temporaryRepository();
	await mkdir(`${root}/docs/reference`, { recursive: true });
	expect(await auditEmptyScaffolding(root, [])).toMatchObject([
		{ file: "docs/reference", kind: "empty-scaffolding" },
	]);
});

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

test("reports exact local link and anchor failures", async () => {
	const root = await gitRepository();
	await writeSource(
		root,
		"docs/reference/source.md",
		"[good](./target.md#known-heading)\n[missing](./missing.md)\n[anchor](./target.md#absent)\n",
	);
	await writeSource(root, "docs/reference/target.md", "# Known heading\n");

	expect(
		await auditMarkdownLinks(root, ["docs/reference/source.md"]),
	).toEqual([
		{
			detail: "target does not exist: ./missing.md",
			file: "docs/reference/source.md",
			kind: "broken-link",
			line: 2,
			severity: "error",
		},
		{
			detail: "anchor does not exist: #absent",
			file: "docs/reference/source.md",
			kind: "broken-anchor",
			line: 3,
			severity: "error",
		},
	]);
});

test("reports links to gitignored targets that only this checkout has", async () => {
	const root = await gitRepository();
	await writeSource(root, ".gitignore", "test-results/\n");
	await writeSource(
		root,
		"docs/reference/source.md",
		"[ignored](../../app/demo/test-results/report.md)\n[folder](../../app/demo)\n[root](../..)\n",
	);
	await writeSource(root, "app/demo/test-results/report.md", "# Report\n");
	await writeSource(root, "app/demo/index.ts", "export {};\n");

	expect(
		await auditMarkdownLinks(root, ["docs/reference/source.md"]),
	).toEqual([
		{
			detail: "target is ignored by git: ../../app/demo/test-results/report.md",
			file: "docs/reference/source.md",
			kind: "broken-link",
			line: 1,
			severity: "error",
		},
	]);
});

test("keeps protected-link findings advisory for human review", async () => {
	const root = await gitRepository();
	await writeSource(
		root,
		"app/demo/VISION.md",
		"[Old intent](../../GOAL.md)\n",
	);
	expect(await auditMarkdownLinks(root, ["app/demo/VISION.md"])).toEqual([
		{
			detail: "target does not exist: ../../GOAL.md",
			file: "app/demo/VISION.md",
			kind: "broken-link",
			line: 1,
			severity: "advisory",
		},
	]);
});

test("surfaces protected changes without claiming approval", () => {
	expect(isProtectedDeveloperDocument("battery/dumrel/VISION.md")).toBeTrue();
	expect(
		isProtectedDeveloperDocument(
			"battery/dumgen/docs/reference/human-owned/prompting.md",
		),
	).toBeTrue();
	expect(
		auditProtectedChanges([
			"README.md",
			"battery/dumrel/VISION.md",
			"battery/dumrel/VISION.md",
		]),
	).toEqual([
		{
			detail: "protected document changed; reviewer must verify explicit approval",
			file: "battery/dumrel/VISION.md",
			kind: "protected-file-change",
			severity: "advisory",
		},
	]);
});

test("formats every finding with its exact file and rule", () => {
	expect(
		formatDocumentationIssue({
			detail: "target does not exist: ./missing.md",
			file: "docs/reference/source.md",
			kind: "broken-link",
			line: 7,
			severity: "error",
		}),
	).toBe(
		"docs/reference/source.md:7: [broken-link] target does not exist: ./missing.md",
	);
});
