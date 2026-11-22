import { readdir } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";

import {
	adrAmendmentCitationIssues,
	adrLogbookIssues,
	adrStructureIssues,
	auditAdrAmendmentCitations,
	auditAdrs,
	isAdrCitationScanPath,
} from "./lib/documentation-adr-rules";
import {
	auditMarkdownLinks,
	cleanLinkTarget,
	markdownLinks,
} from "./lib/documentation-markdown-links";
import {
	type DocumentationIssue,
	type DocumentationRule,
	fileReadConcurrency,
	gitVisibleFiles,
	isDeveloperDocumentationPath,
	isProtectedDeveloperDocument,
	mapWithConcurrency,
	normalizeRepositoryPath,
	pathExists,
	readCachedText,
	stripFrontmatter,
	type TextReadCache,
} from "./lib/documentation-shared";
import { findRepositoryRoot } from "./lib/workspaces";

export {
	adrAmendmentCitationIssues,
	adrLogbookIssues,
	adrStructureIssues,
	auditAdrAmendmentCitations,
	auditAdrs,
	auditMarkdownLinks,
	type DocumentationIssue,
	type DocumentationRule,
	gitVisibleFiles,
	isAdrCitationScanPath,
	isDeveloperDocumentationPath,
	isProtectedDeveloperDocument,
	markdownLinks,
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

export async function developerDocumentationFiles(
	repositoryRoot: string,
): Promise<string[]> {
	return (await gitVisibleFiles(repositoryRoot)).filter(
		isDeveloperDocumentationPath,
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

export function auditAllowedPaths(
	files: readonly string[],
): DocumentationIssue[] {
	return files.flatMap((file) =>
		isAllowedDeveloperDocumentationPath(file)
			? []
			: [
					{
						detail: "developer documentation must use an agent-instruction, glossary, ADR, reference, runbook, protected Vision, or root maintainer-README path",
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

export function glossaryStructureIssues(
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
			detail: "Glossary must start with one level-one title",
			file,
			kind: "glossary-structure",
			line: Math.max(firstContent + 1, 1),
			severity: "error",
		});
	}
	if (languageHeading === -1) {
		issues.push({
			detail: "Glossary must contain one ## Language section",
			file,
			kind: "glossary-structure",
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
			detail: "Glossary title must be followed by a short description",
			file,
			kind: "glossary-structure",
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
				detail: "Glossary may contain only its title, ## Language, and optional level-three term groups",
				file,
				kind: "glossary-structure",
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
			detail: "Glossary Language section must contain at least one **Term**: entry",
			file,
			kind: "glossary-structure",
			line: languageHeading + 1,
			severity: "error",
		});
	}
	for (const match of text.matchAll(/^_Avoid_(?!:)/gmu)) {
		issues.push({
			detail: "Glossary alternatives must use the _Avoid_: label",
			file,
			kind: "glossary-structure",
			line: lineNumber(text, match.index ?? 0),
			severity: "error",
		});
	}
	return issues;
}

function isGlossaryPath(path: string): boolean {
	return basename(path) === "GLOSSARY.md";
}

async function auditGlossaries(
	repositoryRoot: string,
	files: readonly string[],
	fileCache: TextReadCache = new Map(),
): Promise<DocumentationIssue[]> {
	const perFileIssues = await mapWithConcurrency(
		files.filter(isGlossaryPath),
		fileReadConcurrency,
		async (file) =>
			glossaryStructureIssues(
				file,
				await readCachedText(resolve(repositoryRoot, file), fileCache),
			),
	);
	return perFileIssues.flat();
}

export function glossaryMapStructureIssues(text: string): DocumentationIssue[] {
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
			kind: "glossary-map-structure",
			severity: "error",
		},
	];
}

async function auditGlossaryMap(
	repositoryRoot: string,
	files: readonly string[],
	fileCache: TextReadCache = new Map(),
): Promise<DocumentationIssue[]> {
	if (!files.includes("GLOSSARY-MAP.md")) {
		return [
			{
				detail: "multi-context repository requires a root GLOSSARY-MAP.md",
				file: "GLOSSARY-MAP.md",
				kind: "glossary-map-structure",
				severity: "error",
			},
		];
	}
	const text = await readCachedText(
		resolve(repositoryRoot, "GLOSSARY-MAP.md"),
		fileCache,
	);
	const issues = glossaryMapStructureIssues(text);
	const targets = new Set(
		markdownLinks(text)
			.map(({ target }) => cleanLinkTarget(target))
			.filter((target) => target.endsWith("/GLOSSARY.md"))
			.map((target) => normalizeRepositoryPath(target)),
	);
	for (const glossary of files.filter(isGlossaryPath)) {
		if (!targets.has(`./${glossary}`) && !targets.has(glossary)) {
			issues.push({
				detail: "Glossary is not listed in root GLOSSARY-MAP.md",
				file: glossary,
				kind: "glossary-map-structure",
				severity: "error",
			});
		}
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
	fileCache: TextReadCache = new Map(),
): Promise<DocumentationIssue[]> {
	const fileIssues = (
		await mapWithConcurrency(files, fileReadConcurrency, async (file) => {
			const text = await readCachedText(
				resolve(repositoryRoot, file),
				fileCache,
			);
			return isEmptyScaffoldingContent(text)
				? [
						{
							detail: "developer document is empty or placeholder scaffolding",
							file,
							kind: "empty-scaffolding" as const,
							severity: "error" as const,
						},
					]
				: [];
		})
	).flat();
	const scopes = new Set([
		"docs",
		...files.flatMap((file) => {
			const match = file.match(/^((?:app|battery)\/[^/]+)\//u)?.[1];
			return match === undefined ? [] : [join(match, "docs")];
		}),
	]);
	const directories = [...scopes].flatMap((scope) =>
		(["adr", "reference", "runbooks"] as const).map((category) =>
			join(repositoryRoot, scope, category),
		),
	);
	const directoryIssues = (
		await mapWithConcurrency(
			directories,
			fileReadConcurrency,
			async (directory) => {
				if (!(await pathExists(directory))) return [];
				const entries = await readdir(directory);
				if (entries.length > 0) return [];
				return [
					{
						detail: "documentation category directory is empty scaffolding",
						file: normalizeRepositoryPath(
							relative(repositoryRoot, directory),
						),
						kind: "empty-scaffolding" as const,
						severity: "error" as const,
					},
				];
			},
		)
	).flat();
	return [...fileIssues, ...directoryIssues];
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
	const [visibleFiles, changedFiles] = await Promise.all([
		gitVisibleFiles(repositoryRoot),
		changedRepositoryFiles(repositoryRoot),
	]);
	const files = visibleFiles.filter(isDeveloperDocumentationPath);
	const fileCache: TextReadCache = new Map();
	const [
		glossaries,
		glossaryMap,
		adrs,
		adrAmendmentCitations,
		emptyScaffolding,
		markdownLinkIssues,
	] = await Promise.all([
		auditGlossaries(repositoryRoot, files, fileCache),
		auditGlossaryMap(repositoryRoot, files, fileCache),
		auditAdrs(repositoryRoot, files, fileCache),
		auditAdrAmendmentCitations(repositoryRoot, visibleFiles, fileCache),
		auditEmptyScaffolding(repositoryRoot, files, fileCache),
		auditMarkdownLinks(repositoryRoot, files, {
			fileCache,
			visibleFiles,
		}),
	]);
	return [
		...auditAllowedPaths(files),
		...auditProtectedPlacement(files),
		...auditCoordinationFiles(files),
		...glossaries,
		...glossaryMap,
		...adrs,
		...adrAmendmentCitations,
		...emptyScaffolding,
		...markdownLinkIssues,
		...auditProtectedChanges(changedFiles),
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
