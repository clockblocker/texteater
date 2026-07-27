import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

export type JsonObject = Record<string, unknown>;

export interface Workspace {
	dir: string;
	kind: "app" | "battery";
	manifest: JsonObject;
	relativePath: string;
}

export async function readJson(path: string): Promise<JsonObject> {
	return JSON.parse(await readFile(path, "utf8")) as JsonObject;
}

export async function findRepositoryRoot(start: string): Promise<string> {
	let candidate = resolve(start);
	for (;;) {
		const manifestPath = join(candidate, "package.json");
		if (existsSync(manifestPath)) {
			const manifest = await readJson(manifestPath);
			if (Array.isArray(manifest.workspaces)) {
				return candidate;
			}
		}
		const parent = dirname(candidate);
		if (parent === candidate) {
			throw new Error(`Could not find the workspace root from ${start}`);
		}
		candidate = parent;
	}
}

export async function discoverWorkspaces(
	repositoryRoot: string,
): Promise<Workspace[]> {
	const workspaces: Workspace[] = [];
	for (const kind of ["app", "battery"] as const) {
		const parent = join(repositoryRoot, kind);
		if (!existsSync(parent)) continue;
		const entries = await readdir(parent, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const dir = join(parent, entry.name);
			const manifestPath = join(dir, "package.json");
			if (!existsSync(manifestPath)) continue;
			workspaces.push({
				dir,
				kind,
				manifest: await readJson(manifestPath),
				relativePath: relative(repositoryRoot, dir),
			});
		}
	}
	return workspaces.sort((left, right) =>
		left.relativePath.localeCompare(right.relativePath),
	);
}

export function orderWorkspacesByDependencies(
	workspaces: Workspace[],
): Workspace[] {
	const byName = new Map(
		workspaces.flatMap((workspace) =>
			typeof workspace.manifest.name === "string"
				? [[workspace.manifest.name, workspace] as const]
				: [],
		),
	);
	const ordered: Workspace[] = [];
	const visiting = new Set<string>();
	const visited = new Set<string>();

	function visit(workspace: Workspace): void {
		if (
			visited.has(workspace.relativePath) ||
			visiting.has(workspace.relativePath)
		) {
			return;
		}
		visiting.add(workspace.relativePath);
		for (const field of [
			"dependencies",
			"devDependencies",
			"optionalDependencies",
			"peerDependencies",
		]) {
			for (const name of Object.keys(
				stringRecord(workspace.manifest[field]),
			)) {
				const dependency = byName.get(name);
				if (dependency) visit(dependency);
			}
		}
		visiting.delete(workspace.relativePath);
		visited.add(workspace.relativePath);
		ordered.push(workspace);
	}

	for (const workspace of workspaces) visit(workspace);
	return ordered;
}

export function stringRecord(value: unknown): Record<string, string> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return Object.fromEntries(
		Object.entries(value).filter(
			(entry): entry is [string, string] => typeof entry[1] === "string",
		),
	);
}
