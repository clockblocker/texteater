import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dir, "..");
test("published production runtime is independent of authoring and evaluation", async () => {
	const result = await build({
		entryPoints: [join(root, "dist/index.js")],
		bundle: true,
		write: false,
		format: "esm",
		platform: "node",
		metafile: true,
	});
	if (!result.metafile) throw Error("Missing dependency graph");
	expect(
		Object.keys(result.metafile.inputs).filter((path) =>
			/\/zod\/|\/promptsmith\/|corpus|evaluator|source-data|\/codegen\//.test(
				path,
			),
		),
	).toEqual([]);
	const api = await import(join(root, "dist/index.js"));
	expect(Object.keys(api).sort()).toEqual([
		"DumgenFailure",
		"createDumgen",
		"selectGrammaticalAlternatives",
		"validateEncounter",
	]);
});
test("published consumer declarations preserve Language and Kind without a Zod graph", async () => {
	const directory = await mkdtemp(join(tmpdir(), "dumgen-types-"));
	try {
		await writeFile(
			join(directory, "consumer.ts"),
			`import {createDumgen} from ${JSON.stringify(join(root, "dist/index.js"))};
import type {Encounter,AnalysisTarget} from ${JSON.stringify(join(root, "dist/types.js"))};
import type * as Dumling from ${JSON.stringify(resolve(root, "../dumling-new/dist/types.js"))};
import {Effect} from ${JSON.stringify(resolve(root, "../../node_modules/effect/dist/dts/index.js"))};
declare const encounter:Encounter<"de">;
const operation=createDumgen({execute:async()=>null}).resolveGrammar(encounter);
const recovered=operation.pipe(Effect.catchTag("InvalidInput",error=>Effect.succeed(error.message)));
type Output=Effect.Effect.Success<typeof operation>;
declare const output:Output;
const language:"de"=output.surface.language;
// @ts-expect-error Wrong Family/Kind combination.
const wrong:AnalysisTarget<"de">={family:"Lexeme",kind:"Idiom",memberSegmentIndices:[0]};
// @ts-expect-error German-only route is unavailable in Hebrew.
const wrongLanguage:AnalysisTarget<"he">={family:"Phraseme",kind:"Collocation",memberSegmentIndices:[0]};
// @ts-expect-error Empty membership is not an Analysis Target.
const empty:AnalysisTarget<"de">={family:"Lexeme",kind:"NOUN",memberSegmentIndices:[]};
const attestation:Dumling.Attestation<"de">=output;
`,
		);
		await writeFile(
			join(directory, "tsconfig.json"),
			JSON.stringify({
				compilerOptions: {
					strict: true,
					noEmit: true,
					skipLibCheck: true,
					target: "ESNext",
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
				resolve(root, "../../node_modules/typescript/bin/tsc"),
				"-p",
				join(directory, "tsconfig.json"),
				"--listFiles",
			],
			{ stdout: "pipe", stderr: "pipe" },
		);
		const [output, error, exit] = await Promise.all([
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
			child.exited,
		]);
		expect(exit, output + error).toBe(0);
		expect(output).not.toMatch(/\/zod\/|\/schemas\/|\/promptsmith\//);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
