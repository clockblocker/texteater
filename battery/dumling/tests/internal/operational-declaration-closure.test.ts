import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const packageRoot = resolve(import.meta.dir, "../..");
const distRoot = join(packageRoot, "dist");
const operationalRoots = [
	"index.d.ts",
	"id.d.ts",
	"reading.d.ts",
	"types.d.ts",
	"vocabulary.d.ts",
];

function declarationImports(contents: string): readonly string[] {
	return Array.from(
		contents.matchAll(/(?:from\s*|import\s*\()(?:["'])([^"']+)["']/g),
		(match) => match[1] ?? "",
	);
}

function resolveDeclaration(
	from: string,
	specifier: string,
): string | undefined {
	if (!specifier.startsWith(".")) return undefined;
	const candidate = resolve(
		dirname(from),
		specifier.replace(/\.js$/, ".d.ts"),
	);
	return existsSync(candidate) ? candidate : undefined;
}

function forbiddenClosureEdges(): readonly string[] {
	const failures: string[] = [];
	const visited = new Set<string>();
	const pending = operationalRoots.map((root) => join(distRoot, root));

	while (pending.length > 0) {
		const file = pending.pop();
		if (!file || visited.has(file)) continue;
		visited.add(file);
		for (const specifier of declarationImports(
			readFileSync(file, "utf8"),
		)) {
			if (
				specifier === "zod" ||
				specifier.startsWith("zod/") ||
				specifier === "codec-builder-library" ||
				specifier.includes("schema") ||
				specifier.includes("validation-route-proofs")
			) {
				failures.push(`${relative(distRoot, file)} -> ${specifier}`);
			}
			const dependency = resolveDeclaration(file, specifier);
			if (dependency) pending.push(dependency);
		}
	}

	return failures.sort();
}

describe("Dumling operational declarations", () => {
	test("do not reach schema-authoring dependencies", () => {
		const result = Bun.spawnSync(["bun", "run", "build:types"], {
			cwd: packageRoot,
			stderr: "pipe",
			stdout: "pipe",
		});
		expect(result.exitCode, result.stderr.toString()).toBe(0);
		expect(forbiddenClosureEdges()).toEqual([]);
	}, 30_000);
});
