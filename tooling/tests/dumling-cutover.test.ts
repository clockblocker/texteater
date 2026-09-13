import { expect, test } from "bun:test";
import { realpath } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DUM_PACKAGE_PATHS } from "../dum-entrypoint-rss/inventory";
import { discoverWorkspaces, findRepositoryRoot } from "../lib/workspaces";

test("Dum packages resolve from their canonical workspace directories", async () => {
	const root = await findRepositoryRoot(import.meta.dir);
	for (const [name, directory] of Object.entries(DUM_PACKAGE_PATHS))
		expect(
			await realpath(
				fileURLToPath(import.meta.resolve(`${name}/package.json`)),
			),
		).toBe(join(root, "battery", directory, "package.json"));
	expect(
		(await discoverWorkspaces(root)).filter((w) =>
			/-(?:old|new)$/.test(w.relativePath),
		),
	).toEqual([]);
});
