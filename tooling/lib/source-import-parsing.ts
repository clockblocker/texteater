import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { parseSync, Visitor } from "oxc-parser";

const sourceExtensions = new Set([
	".astro",
	".cjs",
	".js",
	".jsx",
	".mjs",
	".ts",
	".tsx",
]);
const ignoredDirectories = new Set([
	".astro",
	".git",
	".runs",
	"dist",
	"node_modules",
]);

export const fileReadConcurrency = 32;

export async function sourceFiles(dir: string): Promise<string[]> {
	const files: string[] = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		if (ignoredDirectories.has(entry.name)) continue;
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await sourceFiles(path)));
		} else if (sourceExtensions.has(extname(entry.name))) {
			files.push(path);
		}
	}
	return files;
}

export interface ImportReference {
	specifier: string;
	/**
	 * Erased before runtime: `import type`, `export type` and `import("…")`
	 * type nodes. An inline `type` specifier still loads its module under
	 * `verbatimModuleSyntax`, so it does not count.
	 */
	typeOnly: boolean;
}

export function importReferences(
	contents: string,
	file: string,
): ImportReference[] {
	const script =
		extname(file) === ".astro"
			? (contents.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? "")
			: contents;
	const references: ImportReference[] = [];
	const addLiteral = (node: unknown, typeOnly = false): void => {
		if (
			node &&
			typeof node === "object" &&
			"value" in node &&
			typeof node.value === "string"
		)
			references.push({ specifier: node.value, typeOnly });
	};
	const parsed = parseSync(file, script, {
		lang:
			file.endsWith(".tsx") ||
			file.endsWith(".jsx") ||
			file.endsWith(".astro")
				? "tsx"
				: "ts",
		sourceType: "unambiguous",
	});
	new Visitor({
		CallExpression(node) {
			if (
				node.callee.type === "Identifier" &&
				node.callee.name === "require"
			)
				addLiteral(node.arguments[0]);
		},
		ExportAllDeclaration(node) {
			addLiteral(node.source, node.exportKind === "type");
		},
		ExportNamedDeclaration(node) {
			addLiteral(node.source, node.exportKind === "type");
		},
		ImportDeclaration(node) {
			addLiteral(node.source, node.importKind === "type");
		},
		ImportExpression(node) {
			addLiteral(node.source);
		},
		TSImportType(node) {
			addLiteral(node.source, true);
		},
		TSExternalModuleReference(node) {
			addLiteral(node.expression);
		},
	}).visit(parsed.program);
	return references;
}

export interface PathAlias {
	prefix: string;
	suffix: string;
	wildcard: boolean;
	targets: string[];
}

/** The `compilerOptions.paths` of a workspace's root tsconfig. */
export async function pathAliases(workspaceDir: string): Promise<PathAlias[]> {
	const path = join(workspaceDir, "tsconfig.json");
	if (!existsSync(path)) return [];
	const config = Bun.JSONC.parse(await readFile(path, "utf8")) as {
		compilerOptions?: {
			baseUrl?: string;
			paths?: Record<string, string[]>;
		};
	};
	const base = join(workspaceDir, config.compilerOptions?.baseUrl ?? ".");
	return Object.entries(config.compilerOptions?.paths ?? {}).map(
		([pattern, targets]) => {
			const [prefix = "", suffix = ""] = pattern.split("*");
			return {
				prefix,
				suffix,
				wildcard: pattern.includes("*"),
				targets: targets.map((target) => join(base, target)),
			};
		},
	);
}

const resolvableExtensions = [".ts", ".tsx", ".d.ts", ".js", ".jsx", ".mjs"];

export function resolveFile(base: string): string {
	const candidates = [
		base,
		base.replace(/\.([cm]?)js(x?)$/, ".$1ts$2"),
		...resolvableExtensions.map((extension) => `${base}${extension}`),
		...resolvableExtensions.map((extension) =>
			join(base, `index${extension}`),
		),
	];
	return (
		candidates.find(
			(candidate) =>
				existsSync(candidate) &&
				sourceExtensions.has(extname(candidate)),
		) ?? base
	);
}

/** The file a relative or aliased specifier names, or undefined for a package. */
export function resolveLocalImport(
	file: string,
	specifier: string,
	aliases: readonly PathAlias[],
): string | undefined {
	if (specifier.startsWith(".")) {
		return resolveFile(resolve(dirname(file), specifier));
	}
	for (const alias of aliases) {
		const matches = alias.wildcard
			? specifier.startsWith(alias.prefix) &&
				specifier.endsWith(alias.suffix)
			: specifier === alias.prefix;
		const target = alias.targets[0];
		if (!matches || !target) continue;
		const matched = specifier.slice(
			alias.prefix.length,
			specifier.length - alias.suffix.length,
		);
		return resolveFile(target.replace("*", matched));
	}
	return undefined;
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
