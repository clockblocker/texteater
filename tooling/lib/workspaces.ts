import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

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

export function stringRecord(value: unknown): Record<string, string> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return Object.fromEntries(
		Object.entries(value).filter(
			(entry): entry is [string, string] => typeof entry[1] === "string",
		),
	);
}

/**
 * The workspace a repository-wide check run from `cwd` reports on:
 * `undefined` at the repository root (the whole repository), otherwise the
 * workspace containing `cwd`. Bun runs a package script in its package's
 * directory, so a workspace's script lands here with that workspace's cwd.
 */
export function workspaceScope(
	cwd: string,
	repositoryRoot: string,
	workspaces: Workspace[],
): Workspace | undefined {
	const path = relative(repositoryRoot, resolve(cwd));
	if (path === "") return undefined;
	const scope = workspaces.find(
		(workspace) =>
			path === workspace.relativePath ||
			path.startsWith(`${workspace.relativePath}${sep}`),
	);
	if (!scope)
		throw new Error(
			`${cwd} is neither the repository root nor a workspace`,
		);
	return scope;
}
