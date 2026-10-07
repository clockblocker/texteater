import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

import { findRepositoryRoot } from "./lib/workspaces";

export type DocumentationRule =
	| "adr-structure"
	| "allowed-path"
	| "broken-anchor"
	| "broken-link"
	| "context-map-structure"
	| "context-structure"
	| "coordination-file"
	| "empty-scaffolding"
	| "protected-file-change"
	| "protected-reference-placement"
	| "vision-placement";

export type DocumentationIssue = {
	detail: string;
	file: string;
	kind: DocumentationRule;
	line?: number;
	severity: "advisory" | "error";
};

type MarkdownLink = {
	line: number;
	target: string;
};

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

async function gitPaths(
	repositoryRoot: string,
	args: readonly string[],
): Promise<string[]> {
	const process = Bun.spawn(["git", "ls-files", "-z", ...args], {
		cwd: repositoryRoot,
		stderr: "pipe",
		stdout: "pipe",
	});
	const [output, error] = await Promise.all([
		new Response(process.stdout).text(),
		new Response(process.stderr).text(),
	]);
	if ((await process.exited) !== 0) {
		throw new Error(`git ls-files failed in ${repositoryRoot}: ${error}`);
	}
	return output.split("\0").filter((path) => path.length > 0);
}

/**
 * The files git would track: tracked files still present in the working tree
 * plus untracked files that no ignore rule covers, so gitignored local output
 * stays out and an uncommitted new document is still checked.
 */
export async function gitVisibleFiles(
	repositoryRoot: string,
): Promise<string[]> {
	const [listed, deleted] = await Promise.all([
		gitPaths(repositoryRoot, [
			"--cached",
			"--others",
			"--exclude-standard",
		]),
		gitPaths(repositoryRoot, ["--deleted"]),
	]);
	const deletedFiles = new Set(deleted);
	return [...new Set(listed)]
		.filter((path) => !deletedFiles.has(path))
		.toSorted();
}

/** Visible files and every directory that contains one; "" is the root. */
function gitVisiblePaths(files: readonly string[]): Set<string> {
	const paths = new Set([""]);
	for (const file of files) {
		paths.add(file);
		for (
			let directory = dirname(file);
			directory !== "." && !paths.has(directory);
			directory = dirname(directory)
		) {
			paths.add(directory);
		}
	}
	return paths;
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
		path.startsWith("battery/dumling/resources/") ||
		path.startsWith("battery/dumgen/docs/learning/") ||
		/^battery\/dumgen\/docs\/prototypes\/[^/]+\/runs\/[^/]+\/diagnostic-report\.md$/u.test(
			path,
		) ||
		// Committed eval evidence: run reports, sweeps and review sheets.
		path.startsWith("battery/dumgen/evidence/") ||
		/^battery\/dumgen\/src\/promptsmith\/.*\/corpus\//u.test(path)
	);
}

/** The path-only portion of the developer-documentation boundary accepted in #307. */
export function isDeveloperDocumentationPath(candidate: string): boolean {
	const path = normalizeRepositoryPath(candidate);
	return (
		path.endsWith(".md") &&
		!isPackageConsumerDocument(path) &&
		!isProducedArtifact(path)
	);
}

export async function developerDocumentationFiles(
	repositoryRoot: string,
): Promise<string[]> {
	return (await gitVisibleFiles(repositoryRoot)).filter(
		isDeveloperDocumentationPath,
	);
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
		path === "README.md" ||
		/^app\/[^/]+\/README\.md$/u.test(path) ||
		path === "AGENTS.md" ||
		path === "CLAUDE.md" ||
		path === "GLOSSARY-MAP.md" ||
		path === "VISION.md" ||
		/^(?:app|battery)\/[^/]+\/(?:AGENTS|CLAUDE|GLOSSARY|VISION)\.md$/u.test(
			path,
		) ||
		isInstalledSkillPath(path) ||
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

/** Installed agent skills are vendored from their skill sources, not authored here. */
function isInstalledSkillPath(path: string): boolean {
	return /^(?:\.agents|(?:app|battery)\/[^/]+\/\.agents)\/skills\/.+\.md$/u.test(
		path,
	);
}

function isAgentInstructionPath(candidate: string): boolean {
	const path = normalizeRepositoryPath(candidate);
	return (
		/^(?:(?:app|battery)\/[^/]+\/)?(?:AGENTS|CLAUDE)\.md$/u.test(path) ||
		isInstalledSkillPath(path) ||
		/^(?:app|battery)\/[^/]+\/convex\/_generated\/ai\/guidelines\.md$/u.test(
			path,
		)
	);
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
		.replaceAll(/\s/gu, "-");
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
		const explicitId = heading?.match(/\{:?\s*#([\w-]+)\s*\}$/u)?.[1];
		if (explicitId !== undefined) {
			anchors.add(explicitId);
		} else if (heading !== undefined) {
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
	const visibleFiles = await gitVisibleFiles(repositoryRoot);
	const visiblePaths = gitVisiblePaths(visibleFiles);
	const relativeFiles =
		files ?? visibleFiles.filter(isDeveloperDocumentationPath);

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
			// A gitignored target exists only in this checkout, never on GitHub.
			if (
				!visiblePaths.has(
					normalizeRepositoryPath(
						relative(repositoryRoot, targetPath),
					),
				)
			) {
				issues.push({
					detail: `${(await pathExists(targetPath)) ? "target is ignored by git" : "target does not exist"}: ${link.target}`,
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

export function auditProtectedPlacement(
	files: readonly string[],
): DocumentationIssue[] {
	const issues: DocumentationIssue[] = [];
	for (const file of files) {
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

/** A Context glossary; installed skills may ship their own GLOSSARY.md. */
function isContextPath(path: string): boolean {
	return basename(path) === "GLOSSARY.md" && !isInstalledSkillPath(path);
}

async function auditContexts(
	repositoryRoot: string,
	files: readonly string[],
): Promise<DocumentationIssue[]> {
	const issues: DocumentationIssue[] = [];
	for (const file of files.filter(isContextPath)) {
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
	const file = "GLOSSARY-MAP.md";
	const headings = text.split("\n").filter((line) => /^#{1,6}\s/u.test(line));
	if (
		headings.length === 2 &&
		headings[0] === "# Glossary Map" &&
		headings[1] === "## Contexts"
	) {
		return [];
	}
	return [
		{
			detail: "Glossary Map headings must be # Glossary Map, then ## Contexts",
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
	if (!files.includes("GLOSSARY-MAP.md")) {
		return [
			{
				detail: "multi-context repository requires a root GLOSSARY-MAP.md",
				file: "GLOSSARY-MAP.md",
				kind: "context-map-structure",
				severity: "error",
			},
		];
	}
	const text = await readFile(
		join(repositoryRoot, "GLOSSARY-MAP.md"),
		"utf8",
	);
	const issues = contextMapStructureIssues(text);
	const targets = new Set(
		markdownLinks(text)
			.map(({ target }) => cleanLinkTarget(target))
			.filter((target) => target.endsWith("/GLOSSARY.md"))
			.map((target) => normalizeRepositoryPath(target)),
	);
	for (const context of files.filter(isContextPath)) {
		if (!targets.has(`./${context}`) && !targets.has(context)) {
			issues.push({
				detail: "Context is not listed in root GLOSSARY-MAP.md",
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
	const status = frontmatter?.trim();
	if (status !== "status: accepted") {
		issues.push({
			detail: "ADR must start with the frontmatter `status: accepted` (docs/reference/developer-documentation.md)",
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
	const files = await developerDocumentationFiles(repositoryRoot);
	return [
		...auditAllowedPaths(files),
		...auditProtectedPlacement(files),
		...auditCoordinationFiles(files),
		...(await auditContexts(repositoryRoot, files)),
		...(await auditContextMap(repositoryRoot, files)),
		...(await auditAdrs(repositoryRoot, files)),
		...(await auditEmptyScaffolding(repositoryRoot, files)),
		...(await auditMarkdownLinks(repositoryRoot, files)),
		...auditProtectedChanges(await changedRepositoryFiles(repositoryRoot)),
	];
}

export function formatDocumentationIssue(issue: DocumentationIssue): string {
	return `${issue.file}${issue.line === undefined ? "" : `:${issue.line}`}: [${issue.kind}] ${issue.detail}`;
}

if (import.meta.main) {
	const repositoryRoot = await findRepositoryRoot(process.cwd());
	const issues = await auditDocumentationIntegrity(repositoryRoot);
	const errors = issues.filter(({ severity }) => severity === "error");
	const advisories = issues.filter(({ severity }) => severity === "advisory");

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
