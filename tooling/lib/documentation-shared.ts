import { readFile, stat } from "node:fs/promises";
import { basename, dirname } from "node:path";

export type DocumentationRule =
	| "adr-amendment-citation"
	| "adr-logbook"
	| "adr-structure"
	| "allowed-path"
	| "broken-anchor"
	| "broken-link"
	| "glossary-map-structure"
	| "glossary-structure"
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

export const fileReadConcurrency = 32;

export type TextReadCache = Map<string, Promise<string>>;

export function normalizeRepositoryPath(path: string): string {
	return path.replaceAll("\\", "/").replace(/^\.\//u, "");
}

export async function pathExists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

export function readCachedText(
	filePath: string,
	cache: TextReadCache,
): Promise<string> {
	let pending = cache.get(filePath);
	if (pending === undefined) {
		pending = readFile(filePath, "utf8");
		cache.set(filePath, pending);
	}
	return pending;
}

export async function mapWithConcurrency<T, R>(
	items: readonly T[],
	limit: number,
	fn: (item: T) => Promise<R>,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let nextIndex = 0;
	const workerCount = Math.min(limit, items.length);
	await Promise.all(
		Array.from({ length: workerCount }, async () => {
			while (nextIndex < items.length) {
				const index = nextIndex++;
				const item = items[index];
				if (item === undefined) continue;
				results[index] = await fn(item);
			}
		}),
	);
	return results;
}

/** Each Markdown line outside fenced code blocks, with its 1-based number. */
export function linesOutsideFences(
	text: string,
): { line: number; text: string }[] {
	const lines: { line: number; text: string }[] = [];
	let fence: "`" | "~" | undefined;
	for (const [index, line] of text.split("\n").entries()) {
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
		if (fence === undefined) lines.push({ line: index + 1, text: line });
	}
	return lines;
}

export function stripFrontmatter(text: string): {
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
export function gitVisiblePaths(files: readonly string[]): Set<string> {
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

export function isProtectedDeveloperDocument(candidate: string): boolean {
	const path = normalizeRepositoryPath(candidate);
	return (
		basename(path) === "VISION.md" ||
		/^(?:docs|(?:app|battery)\/[^/]+\/docs)\/reference\/human-owned\/.+\.md$/u.test(
			path,
		)
	);
}
