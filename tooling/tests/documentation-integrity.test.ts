import { expect, test } from "bun:test";
import { mkdir } from "node:fs/promises";

import {
	adrStructureIssues,
	auditAdrs,
	auditAllowedPaths,
	auditBaseline,
	auditCoordinationFiles,
	auditEmptyScaffolding,
	auditGoalsAndVisions,
	auditMarkdownLinks,
	auditProtectedChanges,
	auditScopedCount,
	contextMapStructureIssues,
	contextStructureIssues,
	formatDocumentationIssue,
	isDeveloperDocumentationPath,
	isEmptyScaffoldingContent,
	isProtectedDeveloperDocument,
	loadDocumentationBaseline,
	markdownLinks,
} from "../documentation-integrity";
import { temporaryRepository, writeSource } from "./helpers";

test("reproduces the #307 baseline from the pinned pre-migration commit", async () => {
	const baseline = await loadDocumentationBaseline();
	const result = Bun.spawnSync([
		"git",
		"ls-tree",
		"-r",
		"--name-only",
		baseline.commit,
	]);
	const files = result.stdout
		.toString()
		.trim()
		.split("\n")
		.filter(isDeveloperDocumentationPath)
		.toSorted();

	expect(result.exitCode).toBe(0);
	expect(baseline.policyIssue).toBe(307);
	expect(baseline.count).toBe(210);
	expect(baseline.files).toEqual(files);
	expect(auditBaseline(baseline)).toEqual([]);
});

test("uses role-specific #307 census exclusions", () => {
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
		isDeveloperDocumentationPath("app/dumling-docs/public/de/entity.md"),
	).toBeFalse();
	expect(
		isDeveloperDocumentationPath(
			"battery/dumgen/docs/prototypes/example/runs/2026-01-01/diagnostic-report.md",
		),
	).toBeFalse();
});

test("enforces canonical developer-documentation paths", () => {
	expect(
		auditAllowedPaths([
			"README.md",
			"app/tf-demo/README.md",
			"battery/dumgen/CONTEXT.md",
			"docs/adr/0001-use-a-contract.md",
			"battery/dumgen/docs/reference/prompt-contract.md",
			"docs/runbooks/release.md",
			"app/tf-demo/.agents/skills/convex-reviewer/SKILL.md",
		]),
	).toEqual([]);
	expect(auditAllowedPaths(["docs/research/notes.md"])).toEqual([
		{
			detail: "developer documentation must use an agent-instruction, Context, ADR, reference, runbook, protected Vision, or root maintainer-README path",
			file: "docs/research/notes.md",
			kind: "allowed-path",
			severity: "error",
		},
	]);
});

test("allows only the exact retained evidence companions outside canonical paths", () => {
	expect(
		auditAllowedPaths([
			"battery/dumgen/docs/prototypes/german-relation-human-gate/README.md",
			"battery/dumgen/docs/prototypes/german-relation-prompt-iteration-lab/README.md",
			"battery/dumgen/docs/prototypes/knowledge-analysis-combined/README.md",
			"battery/dumgen/docs/prototypes/reading-resolution-meaning-isolation/README.md",
			"battery/dumgen/docs/research/issue-58-de-he-clickable-boundaries.md",
		]),
	).toEqual([]);
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

test("reports GOAL, misplaced Vision, and misplaced protected reference files", () => {
	expect(
		auditGoalsAndVisions([
			"GOAL.md",
			"battery/dumgen/docs/persistent/VISION.md",
			"battery/dumgen/docs/human-owned/policy.md",
		]),
	).toMatchObject([
		{ file: "GOAL.md", kind: "goal-removed" },
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

test("checks that the final scoped count is lower without defining drastic", () => {
	const baseline = {
		commit: "abc",
		count: 2,
		files: ["README.md", "docs/reference/policy.md"],
		policyIssue: 307,
	};
	expect(
		auditScopedCount({
			baseline,
			created: [],
			current: ["README.md"],
			removed: ["docs/reference/policy.md"],
			retained: ["README.md"],
		}),
	).toEqual([]);
	expect(
		auditScopedCount({
			baseline,
			created: ["docs/reference/new.md"],
			current: ["README.md", "docs/reference/new.md"],
			removed: ["docs/reference/policy.md"],
			retained: ["README.md"],
		}),
	).toMatchObject([{ kind: "scoped-count" }]);
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

test("enforces the installed Context shape without judging definitions", () => {
	const valid = `# Ordering Context

Ordering names the concepts used to accept and fulfill an order.

## Language

**Order**:
A customer's request for goods.
_Avoid_: Transaction
`;
	expect(contextStructureIssues("battery/order/CONTEXT.md", valid)).toEqual(
		[],
	);
	expect(
		contextStructureIssues(
			"battery/order/CONTEXT.md",
			"# Ordering Context\n\n## Architecture\n\nImplementation detail.\n",
		),
	).toMatchObject([
		{ file: "battery/order/CONTEXT.md", kind: "context-structure" },
	]);
});

test("enforces the installed Context Map headings", () => {
	expect(
		contextMapStructureIssues(
			"# Context Map\n\n## Contexts\n\n- Ordering\n",
		),
	).toEqual([]);
	expect(
		contextMapStructureIssues(
			"# Context Map\n\n## Contexts\n\n## Relationships\n",
		),
	).toMatchObject([{ kind: "context-map-structure" }]);
});

test("enforces the minimal installed ADR structure and status vocabulary", () => {
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
});

test("allows ADR number gaps left by deleted decisions", async () => {
	const root = await temporaryRepository();
	await writeSource(
		root,
		"docs/adr/0002-skip-the-first-decision.md",
		"# Skip the first decision\n\nThis entry has no 0001 predecessor.\n",
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
	const root = await temporaryRepository();
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

test("keeps protected-link findings advisory for human review", async () => {
	const root = await temporaryRepository();
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
