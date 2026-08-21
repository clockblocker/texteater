import { beforeAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build, type Plugin } from "esbuild";

const packageRoot = resolve(import.meta.dir, "../..");
const batteryRoot = resolve(packageRoot, "..");

type RelationProbe = {
	code: Uint8Array;
	inputs: string[];
};

function workspaceSourcePlugin(): Plugin {
	const entries = new Map([
		["dumling/id", resolve(batteryRoot, "dumling/src/id.ts")],
		["dumling/types", resolve(batteryRoot, "dumling/src/types.ts")],
		["dumrel/relations", resolve(batteryRoot, "dumrel/src/relations.ts")],
		["dumrel/types", resolve(batteryRoot, "dumrel/src/types.ts")],
	]);

	return {
		name: "workspace-source-entrypoints",
		setup(context) {
			context.onResolve({ filter: /^(dumling|dumrel)\// }, (args) => {
				const path = entries.get(args.path);
				return path === undefined ? undefined : { path };
			});
		},
	};
}

async function buildRelationProbe(): Promise<RelationProbe> {
	const relationEntry = resolve(packageRoot, "src/relations.ts");
	const result = await build({
		bundle: true,
		format: "esm",
		metafile: true,
		platform: "node",
		plugins: [workspaceSourcePlugin()],
		stdin: {
			contents: `
				import { projectSemanticRelations } from ${JSON.stringify(relationEntry)};

				const bank = {
					language: "de",
					canonicalForm: "Bank",
					family: "Lexeme",
					kind: "NOUN",
					coreFeatures: { gender: "Fem", hyph: null },
				};
				const bench = {
					language: "de",
					canonicalForm: "Sitzbank",
					family: "Lexeme",
					kind: "NOUN",
					coreFeatures: { gender: "Fem", hyph: null },
				};
				const sourceReading = { lemma: bank, emojiDescription: "bank" };
				const targetReading = { lemma: bench, emojiDescription: "bench" };
				const projection = projectSemanticRelations({
					lemmas: [{ lemma: bank }, { lemma: bench }],
					readings: [
						{
							reading: sourceReading,
							knowledge: { semanticRelations: { synonym: [bench] } },
							attestedTranslations: [],
							attestations: [],
							notes: "",
						},
						{
							reading: targetReading,
							attestedTranslations: [],
							attestations: [],
							notes: "",
						},
					],
				});
				if (!projection.some((item) => item.provenance === "direct")) {
					throw new Error("relation projection omitted its direct claim");
				}
				console.log("relations-ok");
			`,
			loader: "ts",
			resolveDir: packageRoot,
		},
		write: false,
	});
	const output = result.outputFiles[0];
	if (output === undefined)
		throw new Error("esbuild produced no relation probe");
	return {
		code: output.contents,
		inputs: Object.keys(result.metafile.inputs).map((path) =>
			path.replaceAll("\\", "/"),
		),
	};
}

let probe: RelationProbe;

beforeAll(async () => {
	probe = await buildRelationProbe();
});

describe("relations package entrypoint", () => {
	test("is exported and included in the package build", () => {
		const manifest = JSON.parse(
			readFileSync(resolve(packageRoot, "package.json"), "utf8"),
		) as {
			exports: Record<string, { import?: string; types?: string }>;
			scripts: Record<string, string>;
		};

		expect(manifest.exports["./relations"]).toEqual({
			types: "./dist/relations.d.ts",
			import: "./dist/relations.js",
		});
		expect(manifest.scripts["build:js"]).toContain("src/relations.ts");
	});

	test("does not pull package roots, schemas, or services into its bundle", () => {
		const forbiddenInputs = [
			/dumling\/src\/index\.ts$/,
			/dumling\/src\/schema\.ts$/,
			/dumling\/src\/schemas\//,
			/dumrel\/src\/index\.ts$/,
			/dumrel\/src\/schema\.ts$/,
			/dumrel\/src\/schema\/(?:knowledge|references)\.ts$/,
			/dumdict\/src\/(?:index|runtime|schema)\.ts$/,
			/dumdict\/src\/service\//,
		];

		expect(
			probe.inputs.some((path) =>
				forbiddenInputs.some((pattern) => pattern.test(path)),
			),
		).toBe(false);
		expect(
			probe.inputs.some((path) => path.endsWith("dumling/src/id.ts")),
		).toBe(true);
		expect(
			probe.inputs.some((path) =>
				path.endsWith("dumrel/src/relations.ts"),
			),
		).toBe(true);
		expect(probe.code.byteLength).toBeLessThan(64 * 1024);
	});

	test("loads and projects under a 64 MiB old-space limit", () => {
		const temporaryDirectory = mkdtempSync(
			join(tmpdir(), "dumdict-relations-"),
		);
		const bundlePath = join(temporaryDirectory, "probe.mjs");

		try {
			writeFileSync(bundlePath, probe.code);
			const output = execFileSync(
				process.execPath,
				["--max-old-space-size=64", bundlePath],
				{
					encoding: "utf8",
					timeout: 30_000,
				},
			);
			expect(output.trim()).toBe("relations-ok");
		} finally {
			rmSync(temporaryDirectory, { force: true, recursive: true });
		}
	});
});
