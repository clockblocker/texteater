import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

import { findRepositoryRoot } from "./lib/workspaces";

export type DocumentationRule =
	| "adr-structure"
	| "allowed-path"
	| "baseline-drift"
	| "broken-anchor"
	| "broken-link"
	| "context-map-structure"
	| "context-structure"
	| "coordination-file"
	| "empty-scaffolding"
	| "goal-removed"
	| "protected-file-change"
	| "protected-reference-placement"
	| "scoped-count"
	| "vision-placement";

export type DocumentationIssue = {
	detail: string;
	file: string;
	kind: DocumentationRule;
	line?: number;
	severity: "advisory" | "error";
};

export type DocumentationBaseline = {
	commit: string;
	count: number;
	files: string[];
	policyIssue: number;
};

export type DocumentationCensus = {
	baseline: DocumentationBaseline;
	created: string[];
	current: string[];
	removed: string[];
	retained: string[];
};

type MarkdownLink = {
	line: number;
	target: string;
};

const baselinePath = join(
	import.meta.dir,
	"developer-documentation-baseline.json",
);

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

const coordinationTokens = new Set([
	"backlog",
	"backlogs",
	"logbook",
	"logbooks",
	"plan",
	"plans",
	"queue",
	"queues",
	"unresolved",
	"wip",
]);

const retainedEvidenceCompanionPaths = new Set([
	"battery/dumgen/docs/german-semantic-relation-acceptance-primary-sources.md",
	"battery/dumgen/docs/german-semantic-relation-corpus-report.md",
	"battery/dumgen/docs/german-semantic-relation-primary-sources.md",
	"battery/dumgen/docs/prototypes/german-relation-human-gate/README.md",
	"battery/dumgen/docs/prototypes/german-relation-prompt-iteration-lab/README.md",
	"battery/dumgen/docs/prototypes/knowledge-analysis-combined/README.md",
	"battery/dumgen/docs/prototypes/reading-resolution-meaning-isolation/README.md",
	"battery/dumgen/docs/research/issue-58-de-he-clickable-boundaries.md",
]);

function normalizeRepositoryPath(path: string): string {
	return path.replaceAll("\\", "/").replace(/^\.\//u, "");
}

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

function isPackageConsumerDocument(path: string): boolean {
	return (
		/^battery\/[^/]+\/README\.md$/u.test(path) ||
		/^(?:app|battery)\/[^/]+\/generate-readme\//u.test(path)
	);
}

function isProducedArtifact(path: string): boolean {
	return (
		path.startsWith("docs/benchmarks/") ||
		path.startsWith("app/dumling-docs/public/") ||
		path.startsWith("app/dumling-docs/src/generated/") ||
		path.startsWith("app/dumling-docs/dist/") ||
		path.startsWith("battery/dumling/resources/") ||
		path.startsWith("battery/dumgen/docs/learning/") ||
		path.startsWith("battery/dumgen/.laboratory/sessions/") ||
		/^battery\/dumgen\/docs\/prototypes\/[^/]+\/runs\/[^/]+\/diagnostic-report\.md$/u.test(
			path,
		) ||
		/^battery\/dumgen\/src\/promptsmith\/.*\/corpus\//u.test(path)
	);
}

/** The path-only portion of the developer-documentation boundary accepted in #307. */
export function isDeveloperDocumentationPath(candidate: string): boolean {
	const path = normalizeRepositoryPath(candidate);
	return (
		path.endsWith(".md") &&
		![...path.split("/")].some((part) =>
			excludedDirectoryNames.has(part),
		) &&
		!isPackageConsumerDocument(path) &&
		!isProducedArtifact(path)
	);
}

export async function developerDocumentationFiles(
	repositoryRoot: string,
): Promise<string[]> {
	return (await markdownFilesUnder(repositoryRoot))
		.map((path) => normalizeRepositoryPath(relative(repositoryRoot, path)))
		.filter(isDeveloperDocumentationPath)
		.toSorted();
}

export function isProtectedDeveloperDocument(candidate: string): boolean {
	const path = normalizeRepositoryPath(candidate);
	return (
		basename(path) === "VISION.md" ||
		/^(?:docs|(?:app|battery)\/[^/]+\/docs)\/reference\/human-owned\/.+\.md$/u.test(
			path,
		)
	);
}

export function isAllowedDeveloperDocumentationPath(
	candidate: string,
): boolean {
	const path = normalizeRepositoryPath(candidate);
	return (
		retainedEvidenceCompanionPaths.has(path) ||
		path === "README.md" ||
		/^app\/[^/]+\/README\.md$/u.test(path) ||
		path === "AGENTS.md" ||
		path === "CLAUDE.md" ||
		path === "CONTEXT-MAP.md" ||
		path === "VISION.md" ||
		/^(?:app|battery)\/[^/]+\/(?:AGENTS|CLAUDE|CONTEXT|VISION)\.md$/u.test(
			path,
		) ||
		/^(?:\.agents|(?:app|battery)\/[^/]+\/\.agents)\/skills\/.+\.md$/u.test(
			path,
		) ||
		/^(?:app|battery)\/[^/]+\/convex\/_generated\/ai\/guidelines\.md$/u.test(
			path,
		) ||
		/^(?:docs|(?:app|battery)\/[^/]+\/docs)\/adr\/\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/u.test(
			path,
		) ||
		/^(?:docs|(?:app|battery)\/[^/]+\/docs)\/(?:reference|runbooks)\/.+\.md$/u.test(
			path,
		)
	);
}

function isAgentInstructionPath(candidate: string): boolean {
	const path = normalizeRepositoryPath(candidate);
	return (
		/^(?:(?:app|battery)\/[^/]+\/)?(?:AGENTS|CLAUDE)\.md$/u.test(path) ||
		/^(?:\.agents|(?:app|battery)\/[^/]+\/\.agents)\/skills\/.+\.md$/u.test(
			path,
		) ||
		/^(?:app|battery)\/[^/]+\/convex\/_generated\/ai\/guidelines\.md$/u.test(
			path,
		)
	);
}

export async function loadDocumentationBaseline(): Promise<DocumentationBaseline> {
	return JSON.parse(await readFile(baselinePath, "utf8"));
}

export async function createDocumentationCensus(
	repositoryRoot: string,
): Promise<DocumentationCensus> {
	const baseline = await loadDocumentationBaseline();
	const current = await developerDocumentationFiles(repositoryRoot);
	const baselineFiles = new Set(baseline.files);
	const currentFiles = new Set(current);
	return {
		baseline,
		created: current.filter((path) => !baselineFiles.has(path)),
		current,
		removed: baseline.files.filter((path) => !currentFiles.has(path)),
		retained: baseline.files.filter((path) => currentFiles.has(path)),
	};
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

export async function auditMarkdownLinks(
	repositoryRoot: string,
	files?: readonly string[],
): Promise<DocumentationIssue[]> {
	const issues: DocumentationIssue[] = [];
	const anchorCache = new Map<string, Set<string>>();
	const relativeFiles =
		files ?? (await developerDocumentationFiles(repositoryRoot));

	for (const relativeSource of relativeFiles) {
		const sourcePath = resolve(repositoryRoot, relativeSource);
		const text = await readFile(sourcePath, "utf8");
		const severity = isProtectedDeveloperDocument(relativeSource)
			? "advisory"
			: "error";
		for (const link of markdownLinks(text)) {
			const target = cleanLinkTarget(link.target);
			if (isExternalOrSiteLink(target)) continue;
			const parts = splitTarget(target);
			const targetPath =
				parts.path.length === 0
					? sourcePath
					: resolve(dirname(sourcePath), parts.path);
			if (!(await pathExists(targetPath))) {
				issues.push({
					detail: `target does not exist: ${link.target}`,
					file: normalizeRepositoryPath(relativeSource),
					kind: "broken-link",
					line: link.line,
					severity,
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
					file: normalizeRepositoryPath(relativeSource),
					kind: "broken-anchor",
					line: link.line,
					severity,
				});
			}
		}
	}

	return issues;
}

export function auditBaseline(
	baseline: DocumentationBaseline,
): DocumentationIssue[] {
	const issues: DocumentationIssue[] = [];
	const sortedFiles = baseline.files.toSorted();
	if (baseline.count !== baseline.files.length) {
		issues.push({
			detail: `recorded count ${baseline.count} does not match ${baseline.files.length} listed files`,
			file: "tooling/developer-documentation-baseline.json",
			kind: "baseline-drift",
			severity: "error",
		});
	}
	if (new Set(baseline.files).size !== baseline.files.length) {
		issues.push({
			detail: "baseline file list contains duplicates",
			file: "tooling/developer-documentation-baseline.json",
			kind: "baseline-drift",
			severity: "error",
		});
	}
	if (!baseline.files.every((path, index) => path === sortedFiles[index])) {
		issues.push({
			detail: "baseline file list must be sorted",
			file: "tooling/developer-documentation-baseline.json",
			kind: "baseline-drift",
			severity: "error",
		});
	}
	for (const file of baseline.files) {
		if (!isDeveloperDocumentationPath(file)) {
			issues.push({
				detail: "listed file is outside the #307 developer-documentation boundary",
				file,
				kind: "baseline-drift",
				severity: "error",
			});
		}
	}
	return issues;
}

export function auditAllowedPaths(
	files: readonly string[],
): DocumentationIssue[] {
	return files.flatMap((file) =>
		isAllowedDeveloperDocumentationPath(file)
			? []
			: [
					{
						detail: "developer documentation must use an agent-instruction, Context, ADR, reference, runbook, protected Vision, or root maintainer-README path",
						file,
						kind: "allowed-path" as const,
						severity: "error" as const,
					},
				],
	);
}

export function auditGoalsAndVisions(
	files: readonly string[],
): DocumentationIssue[] {
	const issues: DocumentationIssue[] = [];
	for (const file of files) {
		if (basename(file) === "GOAL.md") {
			issues.push({
				detail: "GOAL.md was removed by the #307 human-owned-material policy",
				file,
				kind: "goal-removed",
				severity: "error",
			});
		}
		if (
			basename(file) === "VISION.md" &&
			file !== "VISION.md" &&
			!/^(?:app|battery)\/[^/]+\/VISION\.md$/u.test(file)
		) {
			issues.push({
				detail: "VISION.md is allowed only at the repository, app, or battery root",
				file,
				kind: "vision-placement",
				severity: "error",
			});
		}
		if (
			file.includes("human-owned") &&
			!/^(?:docs|(?:app|battery)\/[^/]+\/docs)\/reference\/human-owned\/.+\.md$/u.test(
				file,
			)
		) {
			issues.push({
				detail: "human-owned reference belongs under docs/reference/human-owned/ in its owning scope",
				file,
				kind: "protected-reference-placement",
				severity: "error",
			});
		}
	}
	return issues;
}

export function auditScopedCount(
	census: DocumentationCensus,
): DocumentationIssue[] {
	if (census.current.length < census.baseline.count) return [];
	return [
		{
			detail: `current scoped count ${census.current.length} must be below the ${census.baseline.count}-file baseline; human review still decides whether the reduction is drastic`,
			file: "tooling/developer-documentation-baseline.json",
			kind: "scoped-count",
			severity: "error",
		},
	];
}

function pathTokens(path: string): string[] {
	return normalizeRepositoryPath(path)
		.toLowerCase()
		.split(/[/_.-]+/u)
		.filter((token) => token.length > 0);
}

export function auditCoordinationFiles(
	files: readonly string[],
): DocumentationIssue[] {
	const issues: DocumentationIssue[] = [];
	for (const file of files) {
		if (isAgentInstructionPath(file)) continue;
		const token = pathTokens(file).find((part) =>
			coordinationTokens.has(part),
		);
		if (token !== undefined) {
			issues.push({
				detail: `coordination token "${token}" belongs in GitHub, not a repository document path`,
				file,
				kind: "coordination-file",
				severity: "error",
			});
		}
	}
	return issues;
}

function lineNumber(text: string, offset: number): number {
	return text.slice(0, offset).split("\n").length;
}

export function contextStructureIssues(
	file: string,
	text: string,
): DocumentationIssue[] {
	const issues: DocumentationIssue[] = [];
	const lines = text.split("\n");
	const languageHeading = lines.indexOf("## Language");
	const headings = lines
		.map((line, index) => ({ index, line }))
		.filter(({ line }) => /^#{1,6}\s/u.test(line));
	const firstContent = lines.findIndex((line) => line.trim().length > 0);
	if (firstContent === -1 || !/^# [^#].+/u.test(lines[firstContent] ?? "")) {
		issues.push({
			detail: "Context must start with one level-one title",
			file,
			kind: "context-structure",
			line: Math.max(firstContent + 1, 1),
			severity: "error",
		});
	}
	if (languageHeading === -1) {
		issues.push({
			detail: "Context must contain one ## Language section",
			file,
			kind: "context-structure",
			severity: "error",
		});
		return issues;
	}
	const description = lines
		.slice(firstContent + 1, languageHeading)
		.join("\n")
		.trim();
	if (description.length === 0) {
		issues.push({
			detail: "Context title must be followed by a short description",
			file,
			kind: "context-structure",
			line: languageHeading + 1,
			severity: "error",
		});
	}
	for (const heading of headings) {
		if (
			heading.index !== firstContent &&
			heading.index !== languageHeading &&
			!/^### [^#].+/u.test(heading.line)
		) {
			issues.push({
				detail: "Context may contain only its title, ## Language, and optional level-three term groups",
				file,
				kind: "context-structure",
				line: heading.index + 1,
				severity: "error",
			});
		}
	}
	const termMatches = [...text.matchAll(/^\*\*[^*\n]+\*\*:\s*$/gmu)].filter(
		(match) => (match.index ?? 0) > text.indexOf("## Language"),
	);
	if (termMatches.length === 0) {
		issues.push({
			detail: "Context Language section must contain at least one **Term**: entry",
			file,
			kind: "context-structure",
			line: languageHeading + 1,
			severity: "error",
		});
	}
	for (const match of text.matchAll(/^_Avoid_(?!:)/gmu)) {
		issues.push({
			detail: "Context alternatives must use the _Avoid_: label",
			file,
			kind: "context-structure",
			line: lineNumber(text, match.index ?? 0),
			severity: "error",
		});
	}
	return issues;
}

async function auditContexts(
	repositoryRoot: string,
	files: readonly string[],
): Promise<DocumentationIssue[]> {
	const issues: DocumentationIssue[] = [];
	for (const file of files.filter(
		(path) => basename(path) === "CONTEXT.md",
	)) {
		issues.push(
			...contextStructureIssues(
				file,
				await readFile(join(repositoryRoot, file), "utf8"),
			),
		);
	}
	return issues;
}

export function contextMapStructureIssues(text: string): DocumentationIssue[] {
	const file = "CONTEXT-MAP.md";
	const headings = text.split("\n").filter((line) => /^#{1,6}\s/u.test(line));
	if (
		headings.length === 2 &&
		headings[0] === "# Context Map" &&
		headings[1] === "## Contexts"
	) {
		return [];
	}
	return [
		{
			detail: "Context Map headings must be # Context Map, then ## Contexts",
			file,
			kind: "context-map-structure",
			severity: "error",
		},
	];
}

async function auditContextMap(
	repositoryRoot: string,
	files: readonly string[],
): Promise<DocumentationIssue[]> {
	if (!files.includes("CONTEXT-MAP.md")) {
		return [
			{
				detail: "multi-context repository requires a root CONTEXT-MAP.md",
				file: "CONTEXT-MAP.md",
				kind: "context-map-structure",
				severity: "error",
			},
		];
	}
	const text = await readFile(join(repositoryRoot, "CONTEXT-MAP.md"), "utf8");
	const issues = contextMapStructureIssues(text);
	const targets = new Set(
		markdownLinks(text)
			.map(({ target }) => cleanLinkTarget(target))
			.filter((target) => target.endsWith("/CONTEXT.md"))
			.map((target) => normalizeRepositoryPath(target)),
	);
	for (const context of files.filter(
		(path) => basename(path) === "CONTEXT.md",
	)) {
		if (!targets.has(`./${context}`) && !targets.has(context)) {
			issues.push({
				detail: "Context is not listed in root CONTEXT-MAP.md",
				file: context,
				kind: "context-map-structure",
				severity: "error",
			});
		}
	}
	return issues;
}

function stripFrontmatter(text: string): {
	body: string;
	frontmatter?: string;
} {
	if (!text.startsWith("---\n")) return { body: text };
	const end = text.indexOf("\n---\n", 4);
	if (end === -1) return { body: text, frontmatter: "" };
	return {
		body: text.slice(end + 5),
		frontmatter: text.slice(4, end),
	};
}

export function adrStructureIssues(
	file: string,
	text: string,
): DocumentationIssue[] {
	const issues: DocumentationIssue[] = [];
	const { body, frontmatter } = stripFrontmatter(text);
	if (
		frontmatter !== undefined &&
		!/^status: (?:proposed|accepted|deprecated|superseded by ADR-\d{4})$/u.test(
			frontmatter.trim(),
		)
	) {
		issues.push({
			detail: "ADR frontmatter may contain only a supported status from ADR-FORMAT.md",
			file,
			kind: "adr-structure",
			line: 1,
			severity: "error",
		});
	}
	const lines = body.split("\n");
	const firstContent = lines.findIndex((line) => line.trim().length > 0);
	if (firstContent === -1 || !/^# [^#].+/u.test(lines[firstContent] ?? "")) {
		issues.push({
			detail: "ADR must start with one level-one decision title",
			file,
			kind: "adr-structure",
			severity: "error",
		});
		return issues;
	}
	const headingIndexes = lines
		.map((line, index) => ({ index, line }))
		.filter(({ line }) => /^#{1,6}\s/u.test(line));
	for (const heading of headingIndexes.slice(1)) {
		if (
			heading.line !== "## Considered Options" &&
			heading.line !== "## Consequences"
		) {
			issues.push({
				detail: "ADR optional sections are limited to ## Considered Options and ## Consequences",
				file,
				kind: "adr-structure",
				line: heading.index + 1,
				severity: "error",
			});
		}
	}
	const firstSection = headingIndexes[1]?.index ?? lines.length;
	if (
		lines
			.slice(firstContent + 1, firstSection)
			.join("\n")
			.trim().length === 0
	) {
		issues.push({
			detail: "ADR title must be followed by the decision and its reason",
			file,
			kind: "adr-structure",
			severity: "error",
		});
	}
	return issues;
}

export async function auditAdrs(
	repositoryRoot: string,
	files: readonly string[],
): Promise<DocumentationIssue[]> {
	const issues: DocumentationIssue[] = [];
	const adrFiles = files.filter(
		(path) => path.includes("/docs/adr/") || path.startsWith("docs/adr/"),
	);
	for (const file of adrFiles) {
		issues.push(
			...adrStructureIssues(
				file,
				await readFile(join(repositoryRoot, file), "utf8"),
			),
		);
	}
	return issues;
}

function contentWithoutScaffolding(text: string): string {
	return stripFrontmatter(text)
		.body.replaceAll(/^#{1,6}\s.*$/gmu, "")
		.replaceAll(/<!--.*?-->/gsu, "")
		.trim();
}

export function isEmptyScaffoldingContent(text: string): boolean {
	const content = contentWithoutScaffolding(text);
	return (
		content.length === 0 ||
		/^(?:tbd|todo|coming soon|placeholder)[.!]?$/iu.test(content)
	);
}

export async function auditEmptyScaffolding(
	repositoryRoot: string,
	files: readonly string[],
): Promise<DocumentationIssue[]> {
	const issues: DocumentationIssue[] = [];
	for (const file of files) {
		if (
			isEmptyScaffoldingContent(
				await readFile(join(repositoryRoot, file), "utf8"),
			)
		) {
			issues.push({
				detail: "developer document is empty or placeholder scaffolding",
				file,
				kind: "empty-scaffolding",
				severity: "error",
			});
		}
	}
	const scopes = new Set([
		"docs",
		...files.flatMap((file) => {
			const match = file.match(/^((?:app|battery)\/[^/]+)\//u)?.[1];
			return match === undefined ? [] : [join(match, "docs")];
		}),
	]);
	for (const scope of scopes) {
		for (const category of ["adr", "reference", "runbooks"]) {
			const directory = join(repositoryRoot, scope, category);
			if (!(await pathExists(directory))) continue;
			const entries = await readdir(directory);
			if (entries.length === 0) {
				issues.push({
					detail: "documentation category directory is empty scaffolding",
					file: normalizeRepositoryPath(
						relative(repositoryRoot, directory),
					),
					kind: "empty-scaffolding",
					severity: "error",
				});
			}
		}
	}
	return issues;
}

export function auditProtectedChanges(
	changedFiles: readonly string[],
): DocumentationIssue[] {
	return [...new Set(changedFiles.map(normalizeRepositoryPath))]
		.filter(isProtectedDeveloperDocument)
		.toSorted()
		.map((file) => ({
			detail: "protected document changed; reviewer must verify explicit approval",
			file,
			kind: "protected-file-change",
			severity: "advisory",
		}));
}

async function gitOutput(
	repositoryRoot: string,
	args: string[],
): Promise<string> {
	const process = Bun.spawn(["git", ...args], {
		cwd: repositoryRoot,
		stderr: "pipe",
		stdout: "pipe",
	});
	const output = await new Response(process.stdout).text();
	if ((await process.exited) !== 0) return "";
	return output;
}

async function changedRepositoryFiles(
	repositoryRoot: string,
): Promise<string[]> {
	const configuredBase =
		process.env.DOCUMENTATION_BASE_REF ??
		(process.env.GITHUB_BASE_REF === undefined
			? undefined
			: `origin/${process.env.GITHUB_BASE_REF}`);
	const outputs = await Promise.all([
		configuredBase === undefined
			? Promise.resolve("")
			: gitOutput(repositoryRoot, [
					"diff",
					"--name-only",
					"--diff-filter=ACDMRTUXB",
					"--no-renames",
					`${configuredBase}...HEAD`,
				]),
		gitOutput(repositoryRoot, [
			"diff",
			"--name-only",
			"--diff-filter=ACDMRTUXB",
			"--no-renames",
			"HEAD",
		]),
		gitOutput(repositoryRoot, [
			"ls-files",
			"--others",
			"--exclude-standard",
		]),
	]);
	return outputs
		.flatMap((output) => output.split("\n"))
		.filter((path) => path.length > 0);
}

export async function auditDocumentationIntegrity(
	repositoryRoot: string,
): Promise<DocumentationIssue[]> {
	const census = await createDocumentationCensus(repositoryRoot);
	return [
		...auditBaseline(census.baseline),
		...auditScopedCount(census),
		...auditAllowedPaths(census.current),
		...auditGoalsAndVisions(census.current),
		...auditCoordinationFiles(census.current),
		...(await auditContexts(repositoryRoot, census.current)),
		...(await auditContextMap(repositoryRoot, census.current)),
		...(await auditAdrs(repositoryRoot, census.current)),
		...(await auditEmptyScaffolding(repositoryRoot, census.current)),
		...(await auditMarkdownLinks(repositoryRoot, census.current)),
		...auditProtectedChanges(await changedRepositoryFiles(repositoryRoot)),
	];
}

export function formatDocumentationIssue(issue: DocumentationIssue): string {
	return `${issue.file}${issue.line === undefined ? "" : `:${issue.line}`}: [${issue.kind}] ${issue.detail}`;
}

function printCensus(census: DocumentationCensus): void {
	console.log(
		`Developer documentation census: ${census.baseline.count} baseline files at ${census.baseline.commit}; ${census.current.length} current files (${census.retained.length} retained, ${census.removed.length} removed, ${census.created.length} created).`,
	);
	if (!process.argv.includes("--report")) return;
	for (const [disposition, files] of [
		["retained", census.retained],
		["removed", census.removed],
		["created", census.created],
	] as const) {
		console.log(`${disposition}:`);
		for (const file of files) console.log(`- ${file}`);
	}
}

if (import.meta.main) {
	const repositoryRoot = await findRepositoryRoot(process.cwd());
	const census = await createDocumentationCensus(repositoryRoot);
	const issues = await auditDocumentationIntegrity(repositoryRoot);
	const errors = issues.filter(({ severity }) => severity === "error");
	const advisories = issues.filter(({ severity }) => severity === "advisory");

	printCensus(census);
	if (advisories.length > 0) {
		console.warn("Documentation review advisories:");
		for (const issue of advisories) {
			console.warn(`- ${formatDocumentationIssue(issue)}`);
		}
	}
	if (errors.length === 0) {
		console.log("Developer-documentation policy gates passed.");
	} else {
		console.error("Developer-documentation policy gates failed:");
		for (const issue of errors) {
			console.error(`- ${formatDocumentationIssue(issue)}`);
		}
		process.exitCode = 1;
	}
}
