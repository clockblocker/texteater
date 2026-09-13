import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { build } from "esbuild";

test("relation entrypoint consumes the new projection without authoring or retained packages", async () => {
	const result = await build({
		stdin: {
			contents: `
 import {projectSemanticRelations} from "./src/relations.ts";
 const lemma={unitKind:"Lemma",language:"de",family:"Lexeme",kind:"NOUN",canonicalForm:"Bank",coreFeatures:{gender:"Fem",hyph:null}};
 const target={...lemma,canonicalForm:"Sitzbank"};
 const entry={reading:{unitKind:"Reading",lemma,emojiDescription:"🪑"},knowledge:{semanticRelations:{synonym:[target]}},attestedTranslations:[],attestations:[],notes:""};
 const result=projectSemanticRelations([entry]);
 if(!result.success || result.value.length!==1 || result.value[0].provenance!=="direct") throw Error("Invalid projection");
 console.log("relations-ok");
 `,
			loader: "ts",
			resolveDir: resolve(import.meta.dir, "../.."),
		},
		bundle: true,
		write: false,
		format: "esm",
		platform: "node",
		metafile: true,
	});
	const inputs = Object.keys(result.metafile?.inputs ?? {});
	expect(
		inputs.filter((path) =>
			/dumling-old|dumrel-old|gumgen-old|\/zod\/|\/schema[s.]|\/codegen\//.test(
				path,
			),
		),
	).toEqual([]);
	const output = result.outputFiles?.[0];
	if (!output) throw Error("Missing bundle");
	const child = Bun.spawn([process.execPath, "--eval", output.text], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exit] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	expect(exit, stderr).toBe(0);
	expect(stdout.trim()).toBe("relations-ok");
});
