import { dirname, extname, relative, resolve } from "node:path";

import {
	type DocumentationIssue,
	fileReadConcurrency,
	gitVisibleFiles,
	gitVisiblePaths,
	isDeveloperDocumentationPath,
	isProtectedDeveloperDocument,
	linesOutsideFences,
	mapWithConcurrency,
	normalizeRepositoryPath,
	pathExists,
	readCachedText,
	type TextReadCache,
} from "./documentation-shared";

type MarkdownLink = {
	line: number;
	target: string;
};

export function markdownLinks(text: string): MarkdownLink[] {
	const links: MarkdownLink[] = [];
	const inlineLink =
		/!?\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+["'][^)]*["'])?\s*\)/gu;
	const referenceDefinition = /^\s{0,3}\[[^\]]+\]:\s*(<[^>]+>|\S+)/u;

	for (const { line: number, text: originalLine } of linesOutsideFences(
		text,
	)) {
		const line = originalLine.replaceAll(/`[^`]*`/gu, "");
		for (const match of line.matchAll(inlineLink)) {
			const target = match[1];
			if (target !== undefined) links.push({ line: number, target });
		}
		const definition = line.match(referenceDefinition)?.[1];
		if (definition !== undefined) {
			links.push({ line: number, target: definition });
		}
	}

	return links;
}

export function cleanLinkTarget(target: string): string {
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

	for (const { text: line } of linesOutsideFences(text)) {
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

function shouldCheckFragment(
	targetPath: string,
	fragment: string | undefined,
): fragment is string {
	return (
		fragment !== undefined &&
		fragment.length > 0 &&
		!/^L\d+(?:-L?\d+)?$/u.test(fragment) &&
		extname(targetPath).toLowerCase() === ".md"
	);
}

function targetAnchors(
	targetPath: string,
	fileCache: TextReadCache,
	anchorCache: Map<string, Promise<Set<string>>>,
): Promise<Set<string>> {
	let pending = anchorCache.get(targetPath);
	if (pending === undefined) {
		pending = readCachedText(targetPath, fileCache).then(markdownAnchors);
		anchorCache.set(targetPath, pending);
	}
	return pending;
}

async function auditMarkdownLink(context: {
	anchorCache: Map<string, Promise<Set<string>>>;
	fileCache: TextReadCache;
	link: MarkdownLink;
	relativeSource: string;
	repositoryRoot: string;
	severity: "advisory" | "error";
	sourcePath: string;
	visiblePaths: ReadonlySet<string>;
}): Promise<DocumentationIssue | undefined> {
	const target = cleanLinkTarget(context.link.target);
	if (isExternalOrSiteLink(target)) return undefined;
	const parts = splitTarget(target);
	const targetPath =
		parts.path.length === 0
			? context.sourcePath
			: resolve(dirname(context.sourcePath), parts.path);
	const relativeTarget = normalizeRepositoryPath(
		relative(context.repositoryRoot, targetPath),
	);
	// A gitignored target exists only in this checkout, never on GitHub.
	if (!context.visiblePaths.has(relativeTarget)) {
		const reason = (await pathExists(targetPath))
			? "target is ignored by git"
			: "target does not exist";
		return {
			detail: `${reason}: ${context.link.target}`,
			file: normalizeRepositoryPath(context.relativeSource),
			kind: "broken-link",
			line: context.link.line,
			severity: context.severity,
		};
	}
	if (!shouldCheckFragment(targetPath, parts.fragment)) return undefined;

	const anchors = await targetAnchors(
		targetPath,
		context.fileCache,
		context.anchorCache,
	);
	const fragment = cleanLinkTarget(parts.fragment).replace(
		/^user-content-/u,
		"",
	);
	if (anchors.has(fragment)) return undefined;
	return {
		detail: `anchor does not exist: #${parts.fragment}`,
		file: normalizeRepositoryPath(context.relativeSource),
		kind: "broken-anchor",
		line: context.link.line,
		severity: context.severity,
	};
}

async function auditDocumentLinks(context: {
	anchorCache: Map<string, Promise<Set<string>>>;
	fileCache: TextReadCache;
	relativeSource: string;
	repositoryRoot: string;
	visiblePaths: ReadonlySet<string>;
}): Promise<DocumentationIssue[]> {
	const sourcePath = resolve(context.repositoryRoot, context.relativeSource);
	const text = await readCachedText(sourcePath, context.fileCache);
	const severity = isProtectedDeveloperDocument(context.relativeSource)
		? "advisory"
		: "error";
	const issues: DocumentationIssue[] = [];
	for (const link of markdownLinks(text)) {
		const issue = await auditMarkdownLink({
			...context,
			link,
			severity,
			sourcePath,
		});
		if (issue !== undefined) issues.push(issue);
	}
	return issues;
}

export async function auditMarkdownLinks(
	repositoryRoot: string,
	files?: readonly string[],
	options?: {
		fileCache?: TextReadCache;
		visibleFiles?: readonly string[];
	},
): Promise<DocumentationIssue[]> {
	const fileCache = options?.fileCache ?? new Map<string, Promise<string>>();
	const anchorCache = new Map<string, Promise<Set<string>>>();
	const visibleFiles =
		options?.visibleFiles ?? (await gitVisibleFiles(repositoryRoot));
	const visiblePaths = gitVisiblePaths(visibleFiles);
	const relativeFiles =
		files ?? visibleFiles.filter(isDeveloperDocumentationPath);

	const perFileIssues = await mapWithConcurrency(
		relativeFiles,
		fileReadConcurrency,
		(relativeSource) =>
			auditDocumentLinks({
				anchorCache,
				fileCache,
				relativeSource,
				repositoryRoot,
				visiblePaths,
			}),
	);
	return perFileIssues.flat();
}
