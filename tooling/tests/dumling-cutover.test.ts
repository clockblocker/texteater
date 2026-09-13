import { expect, test } from "bun:test";
import { realpath } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DUM_PACKAGE_PATHS } from "../dum-entrypoint-rss/inventory";
import { discoverWorkspaces, findRepositoryRoot } from "../lib/workspaces";

test("only replacement Dum packages participate in workspace resolution", async () => {
	const root = await findRepositoryRoot(import.meta.dir);
	for (const [name, directory] of Object.entries(DUM_PACKAGE_PATHS))
		expect(
			await realpath(
				fileURLToPath(import.meta.resolve(`${name}/package.json`)),
			),
		).toBe(join(root, "battery", directory, "package.json"));
	expect(
		(await discoverWorkspaces(root)).filter((w) =>
			/-(?:old)$/.test(String(w.manifest.name)),
		),
	).toEqual([]);
});
