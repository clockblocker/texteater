import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { build } from "esbuild";

test("planning entrypoint plans without Effect, schema authoring, or retained packages", async () => {
	const result = await build({
		stdin: {
			contents: `
 import {createDumdictPlanner} from "./src/planning.ts";
 const lemma={unitKind:"Lemma",language:"de",family:"Lexeme",kind:"NOUN",canonicalForm:"Bank",coreFeatures:{gender:"Fem",hyph:null}};
 const reading={unitKind:"Reading",lemma,emojiDescription:"🏦"};
 const planner=createDumdictPlanner("de");
 const request={draft:{reading,note:{attestedTranslations:[],attestations:[],notes:""}}};
 const planned=planner.addNewNote({intent:"addNewNote",revision:"convex-0",existingOwnedSurfaces:[],explicitExistingLemmaTargets:[],exactPendingRelations:[],pendingRelationsMatchingProposedLemma:[],relationLemmas:[],relationReadings:[]},request);
 if(planned.status!=="planned" || planned.plan.changes.map(c=>c.type).join(",")!=="createLemma,createReading") throw Error("Invalid plan "+JSON.stringify(planned));
 const rejected=planner.ensureOwnedSurface({intent:"ensureOwnedSurface",revision:"convex-0",existingOwnedSurfaces:[]},{reading,ownedSurface:{surface:{unitKind:"Surface",language:"de",lemma,normalizedSurface:"Bank",spelling:"Canonical",surfaceFeatures:null,inflectionalFeatures:{case:"Nom",number:"Sing",article:"None"}},note:{attestedTranslations:[],attestations:[],notes:""}}});
 if(rejected.status!=="rejected" || rejected.code!=="readingMissing") throw Error("Expected readingMissing "+JSON.stringify(rejected));
 console.log("planning-ok");
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
			/node_modules\/effect\/|\/zod\/|\/schema[s.]|\/codegen\//.test(
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
	expect(stdout.trim()).toBe("planning-ok");
});
