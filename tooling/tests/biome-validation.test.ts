import { expect, test } from "bun:test";
import { join } from "node:path";
import { findRepositoryRoot } from "../lib/workspaces";

test("shared Biome configuration rejects unused imports", async () => {
	const repositoryRoot = await findRepositoryRoot(process.cwd());
	const config = await Bun.file(
		join(repositoryRoot, "tooling", "biome", "base.json"),
	).json();

	expect(config.linter.rules.correctness.noUnusedImports).toBe("error");
});

test("generated lockfiles are excluded from Biome validation", async () => {
	const repositoryRoot = await findRepositoryRoot(process.cwd());
	const config = await Bun.file(
		join(repositoryRoot, "tooling", "biome", "base.json"),
	).json();

	expect(config.files.includes).toEqual(
		expect.arrayContaining([
			"!!**/bun.lock",
			"!!**/package-lock.json",
			"!!**/pnpm-lock.yaml",
			"!!**/yarn.lock",
		]),
	);
});

test("VS Code treats Bun's text lockfile as JSON with comments", async () => {
	const repositoryRoot = await findRepositoryRoot(process.cwd());
	const settings = await Bun.file(
		join(repositoryRoot, ".vscode", "settings.json"),
	).json();

	expect(settings["files.associations"]).toMatchObject({
		"bun.lock": "jsonc",
	});
});
