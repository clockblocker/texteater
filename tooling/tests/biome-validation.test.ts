import { expect, test } from "bun:test";
import { join } from "node:path";

import { biomeFormatAndAssistArgs } from "../lib/biome-validation";
import { findRepositoryRoot } from "../lib/workspaces";

test("format validation uses read-only Biome CI with assists enforced", async () => {
	const repositoryRoot = await findRepositoryRoot(process.cwd());

	expect(
		biomeFormatAndAssistArgs({
			biomePath: join(
				repositoryRoot,
				"node_modules",
				"@biomejs",
				"biome",
				"bin",
				"biome",
			),
			scope: ".",
		}),
	).toEqual([
		"bun",
		join(
			repositoryRoot,
			"node_modules",
			"@biomejs",
			"biome",
			"bin",
			"biome",
		),
		"ci",
		"--linter-enabled=false",
		".",
	]);
});

test("shared Biome configuration rejects unused imports", async () => {
	const repositoryRoot = await findRepositoryRoot(process.cwd());
	const config = await Bun.file(
		join(repositoryRoot, "tooling", "biome", "base.json"),
	).json();

	expect(config.linter.rules.correctness.noUnusedImports).toBe("error");
});
