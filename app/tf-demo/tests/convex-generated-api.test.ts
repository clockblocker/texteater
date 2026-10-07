import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * `convex/_generated/api.d.ts` lists one entry per Convex module, and only
 * `bunx convex codegen` (or a running `convex dev`) rewrites it. Nothing else
 * notices when it drifts: a module added without regenerating is missing from
 * `api`/`internal`, and a moved or deleted one leaves a stale entry. This test
 * compares the two lists without a deployment.
 */
const convexRoot = join(import.meta.dir, "..", "convex");
const generatedApiPath = join(convexRoot, "_generated", "api.d.ts");
const REGENERATE_HINT =
	"convex/_generated/api.d.ts is out of step with convex/: run `bunx convex codegen` inside app/tf-demo (check `lsof -i :3210` first; a running `convex dev` regenerates it)";

/** The extensions Convex's bundler takes as entry points. */
const ENTRY_EXTENSIONS = [".js", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"];

function walk(directory: string): string[] {
	return readdirSync(directory).flatMap((name) => {
		if (name === "_generated" || name === "node_modules") return [];
		const path = join(directory, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

/**
 * The codegen key of one file under `convex/`, or null for a file Convex
 * skips: non-JS files, dotfiles, `schema.ts`, and names with more than one
 * dot (which covers `convex.config.ts` and `*.d.ts`).
 */
function convexModuleKey(relativePath: string): string | null {
	const base = relativePath.split("/").at(-1) ?? relativePath;
	const extension = ENTRY_EXTENSIONS.find((candidate) =>
		base.endsWith(candidate),
	);
	if (!extension) return null;
	if (base.startsWith(".") || base.startsWith("#")) return null;
	if (base === "schema.ts" || base === "schema.js") return null;
	if ((base.match(/\./g) ?? []).length > 1) return null;
	return relativePath.slice(0, -extension.length);
}

/** The module keys inside `api.d.ts`'s `ApiFromModules<{ … }>` block. */
function generatedApiKeys(source: string): string[] {
	const block = source.match(/ApiFromModules<\{([^}]*)\}>/)?.[1];
	if (block === undefined) throw new Error("No ApiFromModules block found.");
	return [...block.matchAll(/^\s*"?([\w/.-]+)"?\s*:\s*typeof\b/gm)].map(
		([, key]) => key as string,
	);
}

function generatedApiDrift(
	moduleKeys: readonly string[],
	apiKeys: readonly string[],
) {
	const generated = new Set(apiKeys);
	const modules = new Set(moduleKeys);
	return {
		missing: [...modules].filter((key) => !generated.has(key)).sort(),
		stale: [...generated].filter((key) => !modules.has(key)).sort(),
	};
}

function convexModuleKeys(): string[] {
	return walk(convexRoot).flatMap((path) => {
		const key = convexModuleKey(
			relative(convexRoot, path).split(sep).join("/"),
		);
		return key === null ? [] : [key];
	});
}

test("convex/_generated/api.d.ts lists exactly the Convex modules under convex/", () => {
	const drift = generatedApiDrift(
		convexModuleKeys(),
		generatedApiKeys(readFileSync(generatedApiPath, "utf8")),
	);
	expect(drift, REGENERATE_HINT).toEqual({ missing: [], stale: [] });
});

test("the drift check maps paths to codegen keys and catches both directions", () => {
	expect(convexModuleKey("modules/notes/relationNeighborhood.ts")).toBe(
		"modules/notes/relationNeighborhood",
	);
	expect(convexModuleKey("schema.ts")).toBeNull();
	expect(convexModuleKey("convex.config.ts")).toBeNull();
	expect(convexModuleKey("tsconfig.json")).toBeNull();

	const apiKeys = generatedApiKeys(`declare const fullApi: ApiFromModules<{
  analysisStripping: typeof analysisStripping;
  "modules/notes/relationNeighborhood": typeof modules_notes_relationNeighborhood;
  texts: typeof texts;
}>;`);
	expect(apiKeys).toEqual([
		"analysisStripping",
		"modules/notes/relationNeighborhood",
		"texts",
	]);
	expect(
		generatedApiDrift(
			[...apiKeys, "model/x"],
			apiKeys.filter((key) => key !== "texts"),
		),
	).toEqual({ missing: ["model/x", "texts"], stale: [] });
	expect(generatedApiDrift(["texts"], ["texts", "model/gone"])).toEqual({
		missing: [],
		stale: ["model/gone"],
	});
});
