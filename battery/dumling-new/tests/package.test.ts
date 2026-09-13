import { beforeAll, expect, test } from "bun:test";
import {
	mkdir,
	mkdtemp,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
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
		"GrundformAssessmentError",
		"ParsingError",
		"UnitKind",
		"checkIfGrundform",
		"parseUnit",
	]);
	expect(module.parseUnit(null).success).toBe(false);
});

test("published types stay precise without loading Zod declarations", async () => {
	const directory = await mkdtemp(join(tmpdir(), "dumling-consumer-"));
	try {
		await writeFile(
			join(directory, "consumer.ts"),
			`import {parseUnit,checkIfGrundform,type Unit} from ${JSON.stringify(join(packageRoot, "dist/index.js"))};
type Noun=Unit<"Lemma","de","Lexeme","NOUN">;
declare const prefix:Unit<"Surface","de","Morpheme","Prefix">;
const assessment=checkIfGrundform(prefix);
if(assessment.success){const result:boolean=assessment.value;}
else{const tag:"GrundformAssessmentError"=assessment.error._tag;const path:readonly string[]=assessment.error.issues[0].path;}
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

test("published concrete schema exports retain exact composition types", async () => {
	const directory = await mkdtemp(join(tmpdir(), "dumling-schema-consumer-"));
	try {
		await mkdir(join(directory, "node_modules"));
		await symlink(
			packageRoot,
			join(directory, "node_modules/dumling"),
			"dir",
		);
		await writeFile(
			join(directory, "consumer.ts"),
			`
import {surfaceSchema as noun} from "dumling/schema/de/lexeme/noun";
const featureSchema=noun.shape.inflectionalFeatures;
const model=noun.omit({unitKind:true,language:true,lemma:true});
const value=model.parse({});
const number:"Sing"|"Plur"|null|undefined=value.inflectionalFeatures?.number;
import {surfaceSchema as prefix} from "dumling/schema/de/morpheme/prefix";
// @ts-expect-error The route has no inflectional field.
prefix.shape.inflectionalFeatures;
// @ts-expect-error No schema module exists for an unsupported route.
import type * as Unsupported from "dumling/schema/en/phraseme/collocation";
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
			],
			{ stdout: "pipe", stderr: "pipe" },
		);
		const [output, error, exit] = await Promise.all([
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
			child.exited,
		]);
		expect(exit, output + error).toBe(0);
		const childRuntime = Bun.spawn(
			[
				process.execPath,
				"-e",
				'import * as schemas from "dumling/schema/de/lexeme/noun"; console.log(JSON.stringify(Object.keys(schemas).sort()));',
			],
			{ cwd: directory, stdout: "pipe", stderr: "pipe" },
		);
		const [runtimeOutput, runtimeError, runtimeExit] = await Promise.all([
			new Response(childRuntime.stdout).text(),
			new Response(childRuntime.stderr).text(),
			childRuntime.exited,
		]);
		expect(runtimeExit, runtimeError).toBe(0);
		expect(JSON.parse(runtimeOutput)).toEqual([
			"attestationSchema",
			"lemmaSchema",
			"readingSchema",
			"surfaceSchema",
		]);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}, 30_000);

test("a concrete schema import loads no other concrete route", async () => {
	const result = await build({
		entryPoints: [
			join(packageRoot, "src/generated/schemas/de/lexeme/noun.ts"),
		],
		bundle: true,
		write: false,
		format: "esm",
		platform: "node",
		packages: "external",
		metafile: true,
	});
	if (!result.metafile) throw Error("Missing dependency graph");
	const paths = Object.keys(result.metafile.inputs);
	const routes = paths.filter((path) =>
		/schemas\/concrete-language\/[^/]+\/(construction|lexeme|morpheme|phraseme)\//.test(
			path,
		),
	);
	expect(routes).toHaveLength(1);
	expect(routes[0]).toEndWith("/de/lexeme/noun.ts");
});
