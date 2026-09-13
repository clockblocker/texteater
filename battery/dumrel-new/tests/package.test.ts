import { expect, test } from "bun:test";
import path from "node:path";
import { build } from "esbuild";

const packageRoot = path.resolve(import.meta.dir, "..");

test("published operational entrypoint stays independent of Zod", async () => {
	const result = await build({
		entryPoints: [path.join(packageRoot, "dist/index.js")],
		bundle: true,
		write: false,
		format: "esm",
		platform: "node",
		metafile: true,
	});
	const inputs = Object.keys(result.metafile?.inputs ?? {});
	expect(
		inputs.some((input) => /(?:^|\/)zod\/|src\/schemas\.ts/.test(input)),
	).toBe(false);
	const module = await import(path.join(packageRoot, "dist/index.js"));
	expect(Object.keys(module).sort()).toEqual([
		"ParsingError",
		"applyKnowledgeChange",
		"directSemanticRelationValues",
		"parseReadingKnowledge",
		"translationLanguageValues",
	]);
});
