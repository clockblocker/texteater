import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";

import { findRepositoryRoot } from "./lib/workspaces";

export type DocumentationIssue = {
	detail: string;
	file: string;
	kind:
		| "broken-anchor"
		| "broken-link"
		| "generated-stage-drift"
		| "index-coverage"
		| "lifecycle-metadata"
		| "mirror-drift";
	line?: number;
	severity: "advisory" | "error";
};

export type DocumentationIndex = {
	index: string;
	roots: readonly string[];
};

const excludedDirectoryNames = new Set([
	".astro",
	".git",
	".next",
	".turbo",
	"coverage",
	"dist",
	"node_modules",
	"repos-for-refrence",
]);

const documentationIndexes = [
	{
		index: "battery/dumgen/docs/persistent/README.md",
		roots: ["battery/dumgen/docs/persistent"],
	},
	{
		index: "battery/dumgen/docs/research/README.md",
		roots: ["battery/dumgen/docs/research"],
	},
	{
		index: "battery/dumgen/docs/prototypes/README.md",
		roots: ["battery/dumgen/docs/prototypes"],
	},
	{
		index: "battery/dumdict/docs/v1-architecture/README.md",
		roots: ["battery/dumdict/docs/v1-architecture"],
	},
	{
		index: "app/tf-demo/docs/README.md",
		roots: ["app/tf-demo/docs"],
	},
] as const satisfies readonly DocumentationIndex[];

const lifecycleDocuments = [
	"app/dumling-docs/plans/doc-cite-ud-route-overhaul.md",
	"app/tf-demo/docs/design/wip-vision.md",
	"app/tf-demo/docs/research/card-demo-implementation-rubric.md",
	"app/tf-demo/docs/research/dnd-kit-vs-pragmatic-card-sheet.md",
	"app/tf-demo/docs/research/sheet-workspace-dnd-candidates.md",
	"app/tf-demo/docs/research/sheet-workspace-implementation-evidence.md",
	"battery/dumgen/docs/research/attestation-migration.md",
	"battery/dumgen/docs/research/german-high-level-target-attestation-footprint.md",
	"battery/dumgen/docs/research/issue-91-german-grammatical-resolution-migration-matrix.md",
	"battery/dumgen/docs/research/issue-93-suspended-compound-reconstruction.md",
] as const;

type MarkdownLink = {
	line: number;
	target: string;
};

async function pathExists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

async function markdownFilesUnder(root: string): Promise<string[]> {
	if (!(await pathExists(root))) return [];
	const files: string[] = [];

	async function walk(path: string): Promise<void> {
		for (const entry of await readdir(path, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				if (!excludedDirectoryNames.has(entry.name)) {
					await walk(join(path, entry.name));
				}
				continue;
			}
			if (entry.isFile() && entry.name.endsWith(".md")) {
				files.push(join(path, entry.name));
			}
		}
	}

	await walk(root);
	return files.toSorted();
}

export function markdownLinks(text: string): MarkdownLink[] {
	const links: MarkdownLink[] = [];
	let fence: "`" | "~" | undefined;
	const inlineLink =
		/!?\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+["'][^)]*["'])?\s*\)/gu;
	const referenceDefinition = /^\s{0,3}\[[^\]]+\]:\s*(<[^>]+>|\S+)/u;

	for (const [index, originalLine] of text.split("\n").entries()) {
		const fenceMatch = originalLine.match(/^\s*(`{3,}|~{3,})/u);
		if (fenceMatch !== null) {
			const marker = fenceMatch[1]?.[0];
			if (marker === "`" || marker === "~") {
				fence =
					fence === undefined
						? marker
						: fence === marker
							? undefined
							: fence;
			}
			continue;
		}
		if (fence !== undefined) continue;

		const line = originalLine.replaceAll(/`[^`]*`/gu, "");
		for (const match of line.matchAll(inlineLink)) {
			const target = match[1];
			if (target !== undefined) links.push({ line: index + 1, target });
		}
		const definition = line.match(referenceDefinition)?.[1];
		if (definition !== undefined) {
			links.push({ line: index + 1, target: definition });
		}
	}

	return links;
}

function cleanLinkTarget(target: string): string {
	const unwrapped =
		target.startsWith("<") && target.endsWith(">")
			? target.slice(1, -1)
			: target;
	try {
		return decodeURIComponent(unwrapped);
	} catch {
		return unwrapped;
	}
}

function isExternalOrSiteLink(target: string): boolean {
	return (
		target.startsWith("/") ||
		target.startsWith("//") ||
		/^[a-z][a-z\d+.-]*:/iu.test(target)
	);
}

function githubHeadingSlug(heading: string): string {
	const plainHeading = heading
		.toLowerCase()
		.replaceAll(/!?\[([^\]]+)\]\([^)]*\)/gu, "$1")
		.replaceAll(/<[^>]+>/gu, "")
		.replaceAll(/[`*~]/gu, "");
	return plainHeading
		.replaceAll(/[\p{P}\p{S}]/gu, (character) =>
			character === "-" || character === "_" ? character : "",
		)
		.trim()
		.replaceAll(/\s+/gu, "-");
}

function markdownAnchors(text: string): Set<string> {
	const anchors = new Set<string>();
	const counts = new Map<string, number>();
	let fence: "`" | "~" | undefined;

	for (const line of text.split("\n")) {
		const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/u);
		if (fenceMatch !== null) {
			const marker = fenceMatch[1]?.[0];
			if (marker === "`" || marker === "~") {
				fence =
					fence === undefined
						? marker
						: fence === marker
							? undefined
							: fence;
			}
			continue;
		}
		if (fence !== undefined) continue;

		const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/u)?.[1];
		if (heading !== undefined) {
			const base = githubHeadingSlug(heading);
			const count = counts.get(base) ?? 0;
			anchors.add(count === 0 ? base : `${base}-${count}`);
			counts.set(base, count + 1);
		}
		for (const match of line.matchAll(
			/<(?:a|span)\s+(?:id|name)=["']([^"']+)["']/giu,
		)) {
			if (match[1] !== undefined) anchors.add(match[1]);
		}
	}

	return anchors;
}

function splitTarget(target: string): { fragment?: string; path: string } {
	const hashIndex = target.indexOf("#");
	const pathAndQuery = hashIndex === -1 ? target : target.slice(0, hashIndex);
	const queryIndex = pathAndQuery.indexOf("?");
	return {
		fragment: hashIndex === -1 ? undefined : target.slice(hashIndex + 1),
		path:
			queryIndex === -1
				? pathAndQuery
				: pathAndQuery.slice(0, queryIndex),
	};
}

function linkBaseForSource(sourcePath: string): string {
	return sourcePath.endsWith("/generate-readme/README.template.md")
		? resolve(dirname(sourcePath), "..")
		: dirname(sourcePath);
}

export async function auditMarkdownLinks(
	repositoryRoot: string,
	files?: readonly string[],
): Promise<DocumentationIssue[]> {
	const issues: DocumentationIssue[] = [];
	const anchorCache = new Map<string, Set<string>>();
	const filesToAudit = files ?? (await markdownFilesUnder(repositoryRoot));

	for (const sourcePath of filesToAudit) {
		const text = await readFile(sourcePath, "utf8");
		for (const link of markdownLinks(text)) {
			const target = cleanLinkTarget(link.target);
			if (isExternalOrSiteLink(target)) continue;
			const parts = splitTarget(target);
			const targetPath =
				parts.path.length === 0
					? sourcePath
					: resolve(linkBaseForSource(sourcePath), parts.path);
			if (!(await pathExists(targetPath))) {
				issues.push({
					detail: `target does not exist: ${link.target}`,
					file: relative(repositoryRoot, sourcePath),
					kind: "broken-link",
					line: link.line,
					severity: "advisory",
				});
				continue;
			}
			if (
				parts.fragment === undefined ||
				parts.fragment.length === 0 ||
				/^L\d+(?:-L?\d+)?$/u.test(parts.fragment) ||
				extname(targetPath).toLowerCase() !== ".md"
			) {
				continue;
			}

			let anchors = anchorCache.get(targetPath);
			if (anchors === undefined) {
				anchors = markdownAnchors(await readFile(targetPath, "utf8"));
				anchorCache.set(targetPath, anchors);
			}
			const fragment = cleanLinkTarget(parts.fragment).replace(
				/^user-content-/u,
				"",
			);
			if (!anchors.has(fragment)) {
				issues.push({
					detail: `anchor does not exist: #${parts.fragment}`,
					file: relative(repositoryRoot, sourcePath),
					kind: "broken-anchor",
					line: link.line,
					severity: "advisory",
				});
			}
		}
	}

	return issues;
}

async function resolvedMarkdownTargets(
	indexPath: string,
): Promise<Set<string>> {
	const targets = new Set<string>();
	for (const link of markdownLinks(await readFile(indexPath, "utf8"))) {
		const target = cleanLinkTarget(link.target);
		if (isExternalOrSiteLink(target)) continue;
		const path = splitTarget(target).path;
		if (path.length > 0) targets.add(resolve(dirname(indexPath), path));
	}
	return targets;
}

export async function auditIndexCoverage(
	repositoryRoot: string,
	indexes: readonly DocumentationIndex[],
): Promise<DocumentationIssue[]> {
	const issues: DocumentationIssue[] = [];

	for (const index of indexes) {
		const indexPath = join(repositoryRoot, index.index);
		const targets = await resolvedMarkdownTargets(indexPath);
		for (const root of index.roots) {
			for (const documentPath of await markdownFilesUnder(
				join(repositoryRoot, root),
			)) {
				if (documentPath === indexPath || targets.has(documentPath))
					continue;
				issues.push({
					detail: `document is not linked from ${index.index}`,
					file: relative(repositoryRoot, documentPath),
					kind: "index-coverage",
					severity: "error",
				});
			}
		}
	}

	return issues;
}

async function auditLifecycleMetadata(
	repositoryRoot: string,
): Promise<DocumentationIssue[]> {
	const issues: DocumentationIssue[] = [];
	for (const document of lifecycleDocuments) {
		const firstScreen = (
			await readFile(join(repositoryRoot, document), "utf8")
		)
			.split("\n")
			.slice(0, 14)
			.join("\n");
		if (!/\b(?:Lifecycle|Status):/u.test(firstScreen)) {
			issues.push({
				detail: "explicit lifecycle metadata is missing from the first screen",
				file: document,
				kind: "lifecycle-metadata",
				severity: "error",
			});
		}
	}
	return issues;
}

async function auditTfDemoAgentMirror(
	repositoryRoot: string,
): Promise<DocumentationIssue[]> {
	const agents = "app/tf-demo/AGENTS.md";
	const claude = "app/tf-demo/CLAUDE.md";
	if (
		(await readFile(join(repositoryRoot, agents), "utf8")) ===
		(await readFile(join(repositoryRoot, claude), "utf8"))
	) {
		return [];
	}
	return [
		{
			detail: `${agents} and ${claude} must remain byte-identical`,
			file: agents,
			kind: "mirror-drift",
			severity: "error",
		},
	];
}

async function markdownByRelativePath(
	root: string,
): Promise<Map<string, string>> {
	return new Map(
		(await markdownFilesUnder(root)).map((path) => [
			relative(root, path),
			path,
		]),
	);
}

async function auditDumlingDocsStages(
	repositoryRoot: string,
): Promise<DocumentationIssue[]> {
	const publicRoot = join(repositoryRoot, "app/dumling-docs/public");
	const distRoot = join(repositoryRoot, "app/dumling-docs/dist");
	if (!(await pathExists(distRoot))) {
		return [
			{
				detail: "dist is absent; run the Dumling Docs build to compare publication Markdown",
				file: "app/dumling-docs/dist",
				kind: "generated-stage-drift",
				severity: "advisory",
			},
		];
	}

	const publicFiles = await markdownByRelativePath(publicRoot);
	const distFiles = await markdownByRelativePath(distRoot);
	const issues: DocumentationIssue[] = [];
	for (const path of new Set([...publicFiles.keys(), ...distFiles.keys()])) {
		const publicPath = publicFiles.get(path);
		const distPath = distFiles.get(path);
		if (
			publicPath === undefined ||
			distPath === undefined ||
			(await readFile(publicPath, "utf8")) !==
				(await readFile(distPath, "utf8"))
		) {
			issues.push({
				detail: "public and dist Markdown differ; rebuild Dumling Docs",
				file: `app/dumling-docs/${path}`,
				kind: "generated-stage-drift",
				severity: "error",
			});
		}
	}
	return issues;
}

export async function auditDocumentationIntegrity(
	repositoryRoot: string,
): Promise<DocumentationIssue[]> {
	return [
		...(await auditTfDemoAgentMirror(repositoryRoot)),
		...(await auditIndexCoverage(repositoryRoot, documentationIndexes)),
		...(await auditLifecycleMetadata(repositoryRoot)),
		...(await auditDumlingDocsStages(repositoryRoot)),
		...(await auditMarkdownLinks(repositoryRoot)),
	];
}

function formatIssue(issue: DocumentationIssue): string {
	return `${issue.file}${issue.line === undefined ? "" : `:${issue.line}`}: ${issue.detail}`;
}

if (import.meta.main) {
	const repositoryRoot = await findRepositoryRoot(process.cwd());
	const issues = await auditDocumentationIntegrity(repositoryRoot);
	const errors = issues.filter(({ severity }) => severity === "error");
	const advisories = issues.filter(({ severity }) => severity === "advisory");

	if (advisories.length > 0) {
		console.warn(
			`Documentation link report (${advisories.length} advisory issue${advisories.length === 1 ? "" : "s"}; not a CI gate pending historical-link policy):`,
		);
		for (const issue of advisories.slice(0, 40)) {
			console.warn(`- ${formatIssue(issue)}`);
		}
		if (advisories.length > 40) {
			console.warn(`- ... ${advisories.length - 40} more`);
		}
	}

	if (errors.length === 0) {
		console.log("Documentation integrity gates passed.");
	} else {
		console.error("Documentation integrity gates failed:");
		for (const issue of errors) console.error(`- ${formatIssue(issue)}`);
		process.exitCode = 1;
	}
}
