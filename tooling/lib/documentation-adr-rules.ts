import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

import {
	type DocumentationIssue,
	fileReadConcurrency,
	isDeveloperDocumentationPath,
	linesOutsideFences,
	mapWithConcurrency,
	normalizeRepositoryPath,
	readCachedText,
	stripFrontmatter,
	type TextReadCache,
} from "./documentation-shared";

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

/**
 * Dated amendment paragraphs, "Amended by" back-pointers and "the <date>
 * amendment" mentions turn an ADR into a logbook. The present-tense "Amends
 * ADR NNNN" that scopes a newer decision stays allowed.
 */
export function adrLogbookIssues(
	file: string,
	text: string,
): DocumentationIssue[] {
	return linesOutsideFences(text)
		.filter(({ text: line }) => /\bamend(?:ed|ments?)\b/iu.test(line))
		.map(({ line }) => ({
			detail: "An ADR states the current decision: fold the change into the text and leave its history to the issue and git (docs/reference/developer-documentation.md)",
			file,
			kind: "adr-logbook" as const,
			line,
			severity: "error" as const,
		}));
}

function isAdrPath(path: string): boolean {
	return path.includes("/docs/adr/") || path.startsWith("docs/adr/");
}

export async function auditAdrs(
	repositoryRoot: string,
	files: readonly string[],
	fileCache: TextReadCache = new Map(),
): Promise<DocumentationIssue[]> {
	const perFileIssues = await mapWithConcurrency(
		files.filter(isAdrPath),
		fileReadConcurrency,
		async (file) => {
			const text = await readCachedText(
				resolve(repositoryRoot, file),
				fileCache,
			);
			return [
				...adrStructureIssues(file, text),
				...adrLogbookIssues(file, text),
			];
		},
	);
	return perFileIssues.flat();
}

/**
 * The rule's own source and tests name the amendment forms on purpose, so the
 * citation scan leaves them out.
 */
const amendmentCitationRuleFiles = new Set([
	"tooling/documentation-integrity.ts",
	"tooling/lib/documentation-adr-rules.ts",
	"tooling/tests/documentation-integrity.test.ts",
]);

/**
 * Code, tests and records (every non-Markdown file under app/, battery/ and
 * tooling/), plus the developer documents outside the ADRs, which the stricter
 * ADR logbook rule already covers.
 */
export function isAdrCitationScanPath(candidate: string): boolean {
	const path = normalizeRepositoryPath(candidate);
	if (extname(path).toLowerCase() === ".md") {
		return isDeveloperDocumentationPath(path) && !isAdrPath(path);
	}
	return (
		/^(?:app|battery|tooling)\//u.test(path) &&
		!amendmentCitationRuleFiles.has(path)
	);
}

const amendmentCitationForms = [
	// "ADR 0040, amended 2026-10-02", "ADR 0036 amended on #653", "(ADR 0037, amended)"
	/\bADR[\s-]?\d{4},?\s+amended\b/iu,
	// "(amended 2026-09-30)", "amended on #618", "amended for #767"
	/\bamended\s+(?:(?:on|for|in)\s+)?(?:\d{4}-\d{2}-\d{2}|#\d+)/iu,
	// "the 2026-10-02 amendment", "ADR 0040's amendment"
	/(?:\b\d{4}-\d{2}-\d{2}|\bADR[\s-]?\d{4}(?:'s)?)\s+amendment\b/iu,
];

/**
 * An ADR citation in code, tests, a record or a document names the ADR alone;
 * an ADR states its current decision, so "amended <date>" points at history
 * that the issue and git keep. The present-tense "Amends ADR NNNN" and, in
 * Markdown, fenced examples stay allowed.
 */
export function adrAmendmentCitationIssues(
	file: string,
	text: string,
): DocumentationIssue[] {
	const lines =
		extname(file).toLowerCase() === ".md"
			? linesOutsideFences(text)
			: text
					.split("\n")
					.map((line, index) => ({ line: index + 1, text: line }));
	return lines.flatMap(({ line, text: content }) =>
		amendmentCitationForms.some((form) => form.test(content))
			? [
					{
						detail: "Cite the ADR alone, as (ADR 0040) or (ADR 0040, #618); the ADR states its current decision",
						file,
						kind: "adr-amendment-citation" as const,
						line,
						severity: "error" as const,
					},
				]
			: [],
	);
}

/** Git's own heuristic: a NUL byte in the first 8000 bytes marks a binary file. */
function isBinaryContent(bytes: Uint8Array): boolean {
	return bytes.subarray(0, 8000).includes(0);
}

export async function auditAdrAmendmentCitations(
	repositoryRoot: string,
	files: readonly string[],
	fileCache?: TextReadCache,
): Promise<DocumentationIssue[]> {
	const scanFiles = files.filter(isAdrCitationScanPath);
	const perFileIssues = await mapWithConcurrency(
		scanFiles,
		fileReadConcurrency,
		async (file) => {
			const fullPath = resolve(repositoryRoot, file);
			if (
				fileCache !== undefined &&
				extname(file).toLowerCase() === ".md"
			) {
				const text = await readCachedText(fullPath, fileCache);
				if (text.slice(0, 8000).includes("\0")) return [];
				return adrAmendmentCitationIssues(
					normalizeRepositoryPath(file),
					text,
				);
			}
			const bytes = await readFile(fullPath);
			if (isBinaryContent(bytes)) return [];
			return adrAmendmentCitationIssues(
				normalizeRepositoryPath(file),
				new TextDecoder().decode(bytes),
			);
		},
	);
	return perFileIssues.flat();
}
