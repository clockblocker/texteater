import { existsSync } from "node:fs";
import {
	cp,
	mkdir,
	mkdtemp,
	readFile,
	realpath,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DUM_PACKAGE_PATHS } from "./inventory";

/** Workspace packages export their src under these conditions for Bun and Convex. */
const SOURCE_CONDITIONS = new Set(["bun", "convex"]);

function withoutSourceConditions(exports: unknown): unknown {
	if (Array.isArray(exports)) return exports.map(withoutSourceConditions);
	if (exports === null || typeof exports !== "object") return exports;
	return Object.fromEntries(
		Object.entries(exports)
			.filter(([key]) => !SOURCE_CONDITIONS.has(key))
			.map(([key, target]) => [key, withoutSourceConditions(target)]),
	);
}

/**
 * Stage only what each workspace package would publish: its `files` and a
 * manifest without the source conditions, so Bun loads the built artifacts.
 */
export async function preparePublishedRuntime(repositoryRoot: string) {
	const root = await mkdtemp(join(tmpdir(), "dum-published-rss-"));
	try {
		await mkdir(join(root, "tooling/dum-entrypoint-rss"), {
			recursive: true,
		});
		for (const file of ["runner.ts", "operations.ts", "empty-module.ts"])
			await cp(
				join(repositoryRoot, "tooling/dum-entrypoint-rss", file),
				join(root, "tooling/dum-entrypoint-rss", file),
			);
		const workspacePath = (name: string): string | undefined => {
			const path =
				DUM_PACKAGE_PATHS[name as keyof typeof DUM_PACKAGE_PATHS] ??
				name;
			return existsSync(
				join(repositoryRoot, "battery", path, "package.json"),
			)
				? path
				: undefined;
		};
		const staged = new Set<string>();
		const external = new Set<string>();
		const pending: string[] = Object.keys(DUM_PACKAGE_PATHS);
		while (pending.length > 0) {
			const name = pending.pop();
			if (name === undefined || staged.has(name)) continue;
			const path = workspacePath(name);
			if (path === undefined) {
				external.add(name);
				continue;
			}
			staged.add(name);
			const source = join(repositoryRoot, "battery", path);
			const dest = join(root, "node_modules", name);
			await mkdir(dest, { recursive: true });
			const manifest = JSON.parse(
				await readFile(join(source, "package.json"), "utf8"),
			);
			await writeFile(
				join(dest, "package.json"),
				JSON.stringify({
					...manifest,
					exports: withoutSourceConditions(manifest.exports),
				}),
			);
			for (const file of manifest.files ?? ["dist"])
				if (existsSync(join(source, file)))
					await cp(join(source, file), join(dest, file), {
						recursive: true,
					});
			// Dependencies installed apart from the root node_modules.
			if (existsSync(join(source, "node_modules")))
				await symlink(
					join(source, "node_modules"),
					join(dest, "node_modules"),
				);
			pending.push(...Object.keys(manifest.dependencies ?? {}));
		}
		for (const name of external) {
			await mkdir(join(root, "node_modules", name, ".."), {
				recursive: true,
			});
			await symlink(
				join(repositoryRoot, "node_modules", name),
				join(root, "node_modules", name),
			);
		}
		return await realpath(root);
	} catch (error) {
		await rm(root, { recursive: true, force: true });
		throw error;
	}
}
