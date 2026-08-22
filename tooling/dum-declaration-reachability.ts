import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, posix, relative, resolve, sep } from "node:path";
import { parseSync } from "@swc/core";
import {
	DUM_ENTRYPOINTS,
	type DumEntryPoint,
} from "./dum-entrypoint-rss/inventory";
import {
	discoverWorkspaces,
	findRepositoryRoot,
	type JsonObject,
} from "./lib/workspaces";

export type DumDeclarationReachabilityIssue = {
	readonly chain: readonly string[];
	readonly detail: string;
	readonly entrypoint: string;
	readonly kind:
		| "forbidden-dependency"
		| "schema-authoring-reachability"
		| "unresolved-declaration";
};

export type DumDeclarationReachabilityOptions = {
	readonly entrypoints?: readonly DumEntryPoint[];
	readonly repositoryRoot: string;
};

type PublishedDeclaration = {
	readonly path: string;
};

const FORBIDDEN_PACKAGES = new Set(["codec-builder-library", "zod"]);

function auditsDeclarationReachability(
	classification: DumEntryPoint["classification"],
): boolean {
	switch (classification) {
		case "operational":
		case "type-only":
			return true;
		case "metadata":
		case "schema-authoring-exempt":
			return false;
		default: {
			const exhaustive: never = classification;
			return exhaustive;
		}
	}
}

function packageName(specifier: string): string {
	if (!specifier.startsWith("@"))
		return specifier.split("/", 1)[0] ?? specifier;
	return specifier.split("/", 2).join("/");
}

function exportKey(specifier: string, workspaceName: string): string {
	const suffix = specifier.slice(workspaceName.length);
	return suffix === "" ? "." : `.${suffix}`;
}

function findTypesTarget(value: unknown): string | undefined {
	if (typeof value === "string")
		return value.endsWith(".d.ts") ||
			value.endsWith(".d.mts") ||
			value.endsWith(".d.cts")
			? value
			: undefined;
	if (Array.isArray(value)) {
		for (const alternative of value) {
			const target = findTypesTarget(alternative);
			if (target !== undefined) return target;
		}
		return undefined;
	}
	if (value === null || typeof value !== "object") return undefined;
	const record = value as Record<string, unknown>;
	if (typeof record.types === "string") return record.types;
	for (const conditionalTarget of Object.values(record)) {
		const target = findTypesTarget(conditionalTarget);
		if (target !== undefined) return target;
	}
	return undefined;
}

function typesTarget(manifest: JsonObject, key: string): string | undefined {
	const exportsValue = manifest.exports;
	if (
		exportsValue !== null &&
		typeof exportsValue === "object" &&
		!Array.isArray(exportsValue)
	) {
		const target = findTypesTarget(
			(exportsValue as Record<string, unknown>)[key],
		);
		if (target !== undefined) return target;
	}
	if (key === "." && typeof manifest.types === "string")
		return manifest.types;
	return undefined;
}

function displayPath(repositoryRoot: string, path: string): string {
	return relative(repositoryRoot, path).split(sep).join(posix.sep);
}

function declarationCandidates(importer: string, specifier: string): string[] {
	const absolute = resolve(importer, "..", specifier);
	if (/\.d\.(?:c|m)?ts$/u.test(absolute)) return [absolute];
	const javascriptExtension = /\.(c|m)?js$/u.exec(absolute);
	if (javascriptExtension !== null) {
		const declarationExtension =
			javascriptExtension[1] === "c"
				? ".d.cts"
				: javascriptExtension[1] === "m"
					? ".d.mts"
					: ".d.ts";
		return [
			`${absolute.slice(0, -javascriptExtension[0].length)}${declarationExtension}`,
		];
	}
	return [
		`${absolute}.d.ts`,
		`${absolute}.d.mts`,
		`${absolute}.d.cts`,
		join(absolute, "index.d.ts"),
		join(absolute, "index.d.mts"),
		join(absolute, "index.d.cts"),
	];
}

function importedSpecifiers(source: string): string[] {
	const program = parseSync(source, {
		comments: false,
		syntax: "typescript",
		tsx: false,
	});
	const specifiers = new Set<string>();
	const visit = (value: unknown): void => {
		if (value === null || typeof value !== "object") return;
		if (Array.isArray(value)) {
			for (const item of value) visit(item);
			return;
		}
		const node = value as Record<string, unknown>;
		if (
			(node.type === "ImportDeclaration" ||
				node.type === "ExportAllDeclaration" ||
				node.type === "ExportNamedDeclaration") &&
			node.source !== null &&
			typeof node.source === "object"
		) {
			const sourceNode = node.source as Record<string, unknown>;
			if (typeof sourceNode.value === "string")
				specifiers.add(sourceNode.value);
		}
		if (node.type === "TsImportType") {
			const argument = node.argument;
			if (argument !== null && typeof argument === "object") {
				const argumentNode = argument as Record<string, unknown>;
				if (typeof argumentNode.value === "string")
					specifiers.add(argumentNode.value);
			}
		}
		if (node.type === "TsExternalModuleReference") {
			const expression = node.expression;
			if (expression !== null && typeof expression === "object") {
				const expressionNode = expression as Record<string, unknown>;
				if (typeof expressionNode.value === "string")
					specifiers.add(expressionNode.value);
			}
		}
		if (node.type === "CallExpression") {
			const callee = node.callee;
			const argumentsValue = node.arguments;
			const isDynamicImport =
				callee !== null &&
				typeof callee === "object" &&
				(callee as Record<string, unknown>).type === "Import";
			const isRequire =
				callee !== null &&
				typeof callee === "object" &&
				(callee as Record<string, unknown>).type === "Identifier" &&
				(callee as Record<string, unknown>).value === "require";
			if (
				(isDynamicImport || isRequire) &&
				Array.isArray(argumentsValue)
			) {
				const first = argumentsValue[0] as
					| Record<string, unknown>
					| undefined;
				const expression = first?.expression;
				if (expression !== null && typeof expression === "object") {
					const expressionNode = expression as Record<
						string,
						unknown
					>;
					if (typeof expressionNode.value === "string")
						specifiers.add(expressionNode.value);
				}
			}
		}
		for (const [key, child] of Object.entries(node)) {
			if (key === "span" || key === "ctxt" || key === "source") continue;
			visit(child);
		}
	};
	visit(program);
	for (const match of source.matchAll(
		/\/\/\/\s*<reference\b[^>]*\b(?:path|types)\s*=\s*["']([^"']+)["'][^>]*>/gu,
	)) {
		const specifier = match[1];
		if (specifier !== undefined) specifiers.add(specifier);
	}
	return [...specifiers].sort();
}

export async function auditDumDeclarationReachability(
	options: DumDeclarationReachabilityOptions,
): Promise<DumDeclarationReachabilityIssue[]> {
	const { repositoryRoot } = options;
	const entrypoints = options.entrypoints ?? DUM_ENTRYPOINTS;
	const workspaces = await discoverWorkspaces(repositoryRoot);
	const workspaceByName = new Map(
		workspaces.flatMap((workspace) =>
			typeof workspace.manifest.name === "string"
				? [[workspace.manifest.name, workspace] as const]
				: [],
		),
	);
	const resolvePublishedDeclaration = (
		specifier: string,
	): PublishedDeclaration | undefined => {
		const workspaceName = packageName(specifier);
		const workspace = workspaceByName.get(workspaceName);
		if (workspace === undefined) return undefined;
		const target = typesTarget(
			workspace.manifest,
			exportKey(specifier, workspaceName),
		);
		if (target === undefined) return undefined;
		return {
			path: resolve(workspace.dir, target),
		};
	};

	const schemaTargets = new Map<string, string>();
	for (const entrypoint of entrypoints) {
		if (entrypoint.classification !== "schema-authoring-exempt") continue;
		const declaration = resolvePublishedDeclaration(entrypoint.specifier);
		if (declaration !== undefined)
			schemaTargets.set(declaration.path, entrypoint.specifier);
	}

	const issues: DumDeclarationReachabilityIssue[] = [];
	for (const entrypoint of entrypoints) {
		if (!auditsDeclarationReachability(entrypoint.classification)) continue;
		const start = resolvePublishedDeclaration(entrypoint.specifier);
		if (start === undefined || !existsSync(start.path)) {
			issues.push({
				chain: [entrypoint.specifier],
				detail: "public entrypoint does not resolve to an emitted declaration",
				entrypoint: entrypoint.specifier,
				kind: "unresolved-declaration",
			});
			continue;
		}
		const queue: { chain: string[]; path: string }[] = [
			{
				chain: [
					entrypoint.specifier,
					displayPath(repositoryRoot, start.path),
				],
				path: start.path,
			},
		];
		const visited = new Set<string>();
		while (queue.length > 0) {
			const current = queue.shift();
			if (current === undefined || visited.has(current.path)) continue;
			visited.add(current.path);
			let imports: string[];
			try {
				imports = importedSpecifiers(
					await readFile(current.path, "utf8"),
				);
			} catch (error) {
				issues.push({
					chain: current.chain,
					detail: `cannot read or parse emitted declaration: ${error instanceof Error ? error.message : String(error)}`,
					entrypoint: entrypoint.specifier,
					kind: "unresolved-declaration",
				});
				continue;
			}
			for (const specifier of imports) {
				if (FORBIDDEN_PACKAGES.has(packageName(specifier))) {
					issues.push({
						chain: [...current.chain, specifier],
						detail: `forbidden declaration dependency "${specifier}"`,
						entrypoint: entrypoint.specifier,
						kind: "forbidden-dependency",
					});
					continue;
				}

				let target: PublishedDeclaration | undefined;
				if (specifier.startsWith(".")) {
					const path = declarationCandidates(
						current.path,
						specifier,
					).find((candidate) => existsSync(candidate));
					if (path !== undefined) target = { path };
				} else if (workspaceByName.has(packageName(specifier))) {
					target = resolvePublishedDeclaration(specifier);
				} else {
					continue;
				}

				if (target === undefined || !existsSync(target.path)) {
					issues.push({
						chain: [...current.chain, specifier],
						detail: `cannot resolve declaration import "${specifier}"`,
						entrypoint: entrypoint.specifier,
						kind: "unresolved-declaration",
					});
					continue;
				}
				const schemaEntrypoint = schemaTargets.get(target.path);
				const nextDisplay = displayPath(repositoryRoot, target.path);
				if (schemaEntrypoint !== undefined) {
					issues.push({
						chain: [
							...current.chain,
							nextDisplay,
							schemaEntrypoint,
						],
						detail: `declaration reaches schema-authoring entrypoint "${schemaEntrypoint}"`,
						entrypoint: entrypoint.specifier,
						kind: "schema-authoring-reachability",
					});
					continue;
				}
				queue.push({
					chain: [...current.chain, nextDisplay],
					path: target.path,
				});
			}
		}
	}
	return issues.sort((left, right) => {
		const leftKey = `${left.entrypoint}\0${left.kind}\0${left.chain.join("\0")}`;
		const rightKey = `${right.entrypoint}\0${right.kind}\0${right.chain.join("\0")}`;
		return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
	});
}

export function formatDumDeclarationReachabilityIssues(
	issues: readonly DumDeclarationReachabilityIssue[],
): string {
	return issues
		.map(
			(issue) =>
				`FAIL declaration ${issue.entrypoint}: ${issue.detail}\n  ${issue.chain.join(" -> ")}\n`,
		)
		.join("");
}

if (import.meta.main) {
	const repositoryRoot = await findRepositoryRoot(import.meta.dir);
	const issues = await auditDumDeclarationReachability({ repositoryRoot });
	if (issues.length === 0) {
		process.stdout.write(
			"PASS declaration closure: operational and type-only Dum entrypoints are schema-authoring-free\n",
		);
	} else {
		process.stderr.write(formatDumDeclarationReachabilityIssues(issues));
		process.exitCode = 1;
	}
}
