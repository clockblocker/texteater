import { beforeAll, expect, test } from "bun:test";
import path from "node:path";
import { build } from "esbuild";
import { buildPublishedPackage } from "./published-build.js";

const packageRoot = path.resolve(import.meta.dir, "..");
beforeAll(buildPublishedPackage, 60_000);

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
		"KnowledgePolicyUnavailable",
		"ParsingError",
		"allowedComplementKinds",
		"applyKnowledgeChange",
		"directSemanticRelationValues",
		"formulaRoleValues",
		"germanConjugationClass",
		"governedCaseValues",
		"locutionTypeValues",
		"parseReadingKnowledge",
		"participleMeaningValues",
		"projectParticipleSources",
		"projectSemanticRelations",
		"sayingTypeValues",
		"selectKnowledge",
		"translationLanguageValues",
	]);
});
