import { beforeAll, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";

const packageRoot = resolve(import.meta.dir, "..");
beforeAll(async () => {
	const child = Bun.spawn([process.execPath, "run", "build"], {
		cwd: packageRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [output, error, exit] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (exit) throw Error(output + error);
}, 30_000);

test("built operational entrypoint has no schema or compiler dependency", async () => {
	const result = await build({
		entryPoints: [join(packageRoot, "dist/index.js")],
		bundle: true,
		write: false,
		format: "esm",
		platform: "node",
		metafile: true,
	});
	if (!result.metafile) throw Error("Missing bundle dependency graph");
	const paths = Object.keys(result.metafile.inputs);
	expect(
		paths.some((path) =>
			/(?:^|\/)zod\/|src\/schemas\/|\/codegen\//.test(path),
		),
	).toBe(false);
	const module = await import(join(packageRoot, "dist/index.js"));
	expect(Object.keys(module).sort()).toEqual([
		"ParsingError",
		"SurfaceKind",
		"UnitKind",
		"assessSurfaceKind",
		"parseUnit",
	]);
	expect(module.parseUnit(null).success).toBe(false);
});

test("published types stay precise without loading Zod declarations", async () => {
	const directory = await mkdtemp(join(tmpdir(), "dumling-consumer-"));
	try {
		await writeFile(
			join(directory, "consumer.ts"),
			`import {parseUnit,type Unit} from ${JSON.stringify(join(packageRoot, "dist/index.js"))};
type Noun=Unit<"Lemma","de","Lexeme","NOUN">;
declare const prefix:Unit<"Surface","de","Morpheme","Prefix">;
// @ts-expect-error This route has no inflectional features.
prefix.inflectionalFeatures;
declare const noun:Noun;
const gender:"Fem"|"Masc"|"Neut"|null=noun.coreFeatures.gender;
// @ts-expect-error Invalid grammatical coordinates.
type Invalid=Unit<"Lemma","de","Morpheme","NOUN">;
// @ts-expect-error Invalid feature type.
const invalidGender:"Common"=noun.coreFeatures.gender;
const result=parseUnit(null,{unitKind:"Lemma",language:"de",family:"Lexeme",kind:"NOUN"});
if(result.success){const exact:Noun=result.chain.value;}
`,
		);
		await writeFile(
			join(directory, "tsconfig.json"),
			JSON.stringify({
				compilerOptions: {
					noEmit: true,
					strict: true,
					skipLibCheck: true,
					target: "ES2022",
					module: "ESNext",
					moduleResolution: "Bundler",
					types: [],
				},
				files: ["consumer.ts"],
			}),
		);
		const child = Bun.spawn(
			[
				process.execPath,
				join(packageRoot, "../../node_modules/typescript/bin/tsc"),
				"-p",
				join(directory, "tsconfig.json"),
				"--listFiles",
				"--extendedDiagnostics",
			],
			{ stdout: "pipe", stderr: "pipe" },
		);
		const [output, error, exit] = await Promise.all([
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
			child.exited,
		]);
		expect(exit, output + error).toBe(0);
		expect(output).not.toMatch(
			/\/zod\/|\/schemas\/|\/generated\/validation\./,
		);
		expect(
			await readFile(
				join(packageRoot, "dist/generated/units.d.ts"),
				"utf8",
			),
		).not.toMatch(/from ["']zod/);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}, 30_000);
