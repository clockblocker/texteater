import { expect, test } from "bun:test";
import { createDumgen, validateEncounter } from "dumgen";
import { getExperiment, listExperiments } from "dumgen/development";
import { Effect } from "effect";
import { assembleSystemPrompt } from "promptsmith";
import { targetInputSchema } from "../src/concrete-lang/de/model-schemas.js";
import type { GermanHighLevelTargetClassificationTarget } from "../src/concrete-lang/de/target-classification/projection.js";
import { createGermanHighLevelTargetClassificationProjection } from "../src/concrete-lang/de/target-classification/projection.js";
import targetData from "../src/concrete-lang/de/target-classification/source-data.json";
import { prompts } from "../src/generated/prompts.js";
import { grammarSchemas } from "../src/generated/schemas.js";

const kinds: Record<string, string> = {
	"proper-noun": "PROPN",
	auxiliary: "AUX",
	determiner: "DET",
	"subordinating-conjunction": "SCONJ",
	particle: "PART",
	adposition: "ADP",
	adverb: "ADV",
	"coordinating-conjunction": "CCONJ",
	pronoun: "PRON",
	adjective: "ADJ",
	interjection: "INTJ",
	verb: "VERB",
	symbol: "SYM",
	numeral: "NUM",
	noun: "NOUN",
	other: "X",
	idiom: "Idiom",
	aphorism: "Aphorism",
	"discourse-formula": "DiscourseFormula",
	collocation: "Collocation",
	proverb: "Proverb",
	fusion: "Fusion",
};
test("all development selections are disjoint and production assembly uses only demonstrations", () => {
	for (const item of listExperiments()) {
		const experiment = getExperiment(item.id);
		const corpus = experiment.promptSource.goldenCorpus!;
		const demos = experiment.promptSource.demonstrations;
		const toUse = corpus.select(demos && "ids" in demos ? demos.ids : []);
		expect(toUse.isDisjointFrom(experiment.evaluation)).toBe(true);
		if (prompts[item.id])
			expect(assembleSystemPrompt(experiment.promptSource)).toBe(
				prompts[item.id]!,
			);
	}
	expect(
		listExperiments().find(
			(item) =>
				item.id === "target-classification/de/high-level-whole-unit",
		),
	).toMatchObject({
		caseCount: 397,
		demonstrationCount: 28,
		evaluationCount: 105,
	});
	expect(
		Object.keys(prompts).some((route) =>
			route.includes("lexical-breakdown"),
		),
	).toBe(false);
});
test("canonical target corpus survives compact representation round-trips", () => {
	for (const golden of Object.values(targetData.cases)) {
		const projection = createGermanHighLevelTargetClassificationProjection(
			targetInputSchema.parse(golden.input),
		);
		const target = golden.idealOutput as
			| GermanHighLevelTargetClassificationTarget
			| { decision: "Unresolved" };
		expect(projection.canonicalize(projection.materialize(target))).toEqual(
			target,
		);
	}
});
test("all 1060 retained grammar answers project through public operations", async () => {
	let count = 0;
	for (const spec of listExperiments().filter((item) =>
		item.id.startsWith("grammatical-resolution/"),
	)) {
		const [, language, familyName, kindName] = spec.id.split("/");
		const family = familyName![0]!.toUpperCase() + familyName!.slice(1),
			kind = kinds[kindName!]!;
		const route =
			`${language}/${family}/${kind}` as keyof typeof grammarSchemas;
		const corpus = getExperiment(spec.id).promptSource.goldenCorpus!;
		for (const [id, golden] of Object.entries(corpus.cases)) {
			const input = golden.input as {
				markedContext: string;
				members: string[];
			};
			const segments: {
					kind: "ResolvableText" | "OpaqueText";
					text: string;
				}[] = [],
				memberSegmentIndices: number[] = [];
			for (const chunk of input.markedContext.split(
				/(<TARGET>.*?<\/TARGET>)/gu,
			)) {
				if (!chunk) continue;
				if (chunk.startsWith("<TARGET>")) {
					memberSegmentIndices.push(segments.length);
					segments.push({
						kind: "ResolvableText",
						text: chunk.slice(8, -9),
					});
				} else segments.push({ kind: "OpaqueText", text: chunk });
			}
			const encounter = validateEncounter({
				sentence: { id, language, segments },
				target: { family, kind, memberSegmentIndices },
			});
			const result = await Effect.runPromise(
				Effect.either(
					createDumgen({
						execute: async () => golden.idealOutput,
					}).resolveGrammar(encounter),
				),
			);
			if (
				typeof golden.idealOutput === "object" &&
				golden.idealOutput &&
				"decision" in golden.idealOutput
			)
				expect(result).toMatchObject({
					_tag: "Left",
					left: { _tag: "Unresolved" },
				});
			else if (id === "grammar-de-det-dev-foreign-the")
				expect(result).toMatchObject({
					_tag: "Left",
					left: { _tag: "CatalogMiss" },
				});
			else {
				if (result._tag === "Left")
					throw Error(`${id}: ${result.left.message}`);
				const output = grammarSchemas[route].parse(golden.idealOutput);
				expect([...result.right.members]).toEqual(
					input.members.map((attested, index) => ({
						attested,
						orthography: output.memberOrthographies[index]!,
					})),
				);
				expect(result.right.surface.lemma.coreFeatures).toEqual(
					output.lemma.coreFeatures,
				);
				if ("inflectionalFeatures" in output.surface)
					expect(result.right.surface).toHaveProperty(
						"inflectionalFeatures",
						output.surface.inflectionalFeatures,
					);
			}
			count++;
		}
	}
	expect(count).toBe(1060);
});
