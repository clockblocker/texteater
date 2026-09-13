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

/** Stage only built artifacts: Bun must not follow a workspace's development paths back into TypeScript. */
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
		const packages = {
			...DUM_PACKAGE_PATHS,
			"common-utils": "common-utils",
		};
		const external = new Set<string>();
		for (const [name, path] of Object.entries(packages)) {
			const source = join(repositoryRoot, "battery", path);
			const dest = join(root, "node_modules", name);
			await mkdir(dest, { recursive: true });
			const manifest = JSON.parse(
				await readFile(join(source, "package.json"), "utf8"),
			);
			await writeFile(
				join(dest, "package.json"),
				JSON.stringify(manifest),
			);
			await cp(join(source, "dist"), join(dest, "dist"), {
				recursive: true,
			});
			for (const dependency of Object.keys(manifest.dependencies ?? {}))
				if (!(dependency in packages)) external.add(dependency);
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
