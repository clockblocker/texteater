import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	acceptanceEvaluation,
	developmentEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-discourse-formula/evaluation-suite";
import { evaluateDiscourseFormulaGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-discourse-formula/evaluator";
import { corpus } from "../../src/promptsmith/production/grammatical-resolution/de/phraseme/discourse-formula/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/production/grammatical-resolution/de/phraseme/discourse-formula/prompt-source";
import {
	buildDeDiscourseFormulaCitationSurfaceCodec,
	deDiscourseFormulaLemmaCodec,
	discourseFormulaResolutionCodec,
	inputSchema,
	outputSchema,
} from "../../src/promptsmith/production/grammatical-resolution/de/phraseme/discourse-formula/schemas";

describe("Phraseme/DiscourseFormula canonical total contract", () => {
	test("freezes 34 cases into disjoint 6/18/10 partitions", () => {
		expect(corpus.all().ids).toHaveLength(34);
		expect(demonstrations.ids).toHaveLength(6);
		expect(developmentEvaluation.ids).toHaveLength(18);
		expect(acceptanceEvaluation.ids).toEqual([
			"grammar-de-discourse-formula-accept-schoenen-guten-tag",
			"grammar-de-discourse-formula-accept-gute-nacht",
			"grammar-de-discourse-formula-accept-besten-dank",
			"grammar-de-discourse-formula-accept-ich-bitte-um-verzeihung",
			"grammar-de-discourse-formula-accept-keine-ursache",
			"grammar-de-discourse-formula-accept-vielen-herzlichen-partial",
			"grammar-de-discourse-formula-accept-auf-keinen-fall",
			"grammar-de-discourse-formula-accept-nun-denn",
			"grammar-de-discourse-formula-accept-um-himmels-willen",
			"grammar-de-discourse-formula-accept-willkommen-single",
		]);
		expect(demonstrations.isDisjointFrom(developmentEvaluation)).toBe(true);
		expect(demonstrations.isDisjointFrom(acceptanceEvaluation)).toBe(true);
		expect(developmentEvaluation.isDisjointFrom(acceptanceEvaluation)).toBe(
			true,
		);
		expect(
			new Set(
				demonstrations
					.union(developmentEvaluation)
					.union(acceptanceEvaluation).ids,
			),
		).toEqual(new Set(corpus.all().ids));
	});

	test("uses exact canonical inputs and a strict flat Citation DTO", () => {
		for (const testCase of corpus.all().cases) {
			expect(inputSchema.parse(testCase.input).members).toEqual(
				[
					...testCase.input.markedContext.matchAll(
						/<TARGET>([^<>]+)<\/TARGET>/gu,
					),
				].map((match) => match[1] ?? ""),
			);
			expect(outputSchema.safeParse(testCase.idealOutput).success).toBe(
				true,
			);
			expect(
				evaluateDiscourseFormulaGrammaticalResolution({
					caseId: "ideal-output",
					input: testCase.input,
					idealOutput: testCase.idealOutput,
					output: testCase.idealOutput,
				}).contractPass,
			).toBe(true);
		}

		const fixture =
			corpus.cases["grammar-de-discourse-formula-demo-guten-morgen"];
		if (fixture === undefined)
			throw new Error("Missing DiscourseFormula fixture.");
		for (const extra of [
			{ decision: "Resolved" },
			{ resolution: fixture.idealOutput },
			{ language: "de" },
		]) {
			expect(
				outputSchema.safeParse({ ...fixture.idealOutput, ...extra })
					.success,
			).toBe(false);
		}
		expect(
			outputSchema.safeParse({
				...fixture.idealOutput,
				lemma: {
					canonicalForm: fixture.idealOutput.lemma.canonicalForm,
				},
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...fixture.idealOutput,
				lemma: {
					...fixture.idealOutput.lemma,
					coreFeatures: { discourseFormulaRole: "Wish" },
				},
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...fixture.idealOutput,
				surface: {
					...fixture.idealOutput.surface,
					surfaceKind: "Citation",
				},
			}).success,
		).toBe(false);
		expect(
			inputSchema.safeParse({
				markedContext:
					"Sie sagte <TARGET>Guten</TARGET> <TARGET>Morgen</TARGET>.",
				members: ["Morgen", "Guten"],
			}).success,
		).toBe(false);
	});

	test("keeps route contrasts outside authoritative membership", () => {
		const prompt = assembleSystemPrompt(promptSource).replaceAll(
			/\s+/gu,
			" ",
		);
		expect(prompt).toContain("operation is total: always resolve");
		expect(prompt).toContain(
			"Never reject, repair, add, remove, merge, split, reorder, or reclassify membership",
		);
		expect(prompt).toContain("application injects German language");
		expect(prompt).toContain("Partial never repairs membership");
		expect(prompt).toContain(
			"For Full coverage with Canonical spelling, derive canonicalForm mechanically",
		);
		expect(prompt).toContain("Never absorb unmarked context");
		expect(prompt).toContain("Preserve repeated positions");
		expect(prompt).toContain(
			"Without an explicit ellipsis or broken-off signal",
		);
		expect(prompt).toContain(
			"Apply initial-casing normalization equally to Canonical and Variant Surfaces",
		);
		expect(prompt).not.toContain('"decision":');
		expect(
			corpus.cases["grammar-de-discourse-formula-dev-wie-dem-auch-sei"]
				?.input.markedContext,
		).toContain("Morgenstund hat Gold im Mund");
		expect(
			corpus.cases["grammar-de-discourse-formula-dev-gute-reise-wish"]
				?.input.markedContext,
		).toContain("über eine gute Reise");
		expect(
			corpus.cases[
				"grammar-de-discourse-formula-accept-willkommen-single"
			]?.input.members,
		).toEqual(["Willkommen"]);
	});

	test("pins role identity, variants, typos, repetition, and genuine Partial", () => {
		expect(
			corpus.cases[
				"grammar-de-discourse-formula-dev-bitte-schoen-presentation"
			]?.idealOutput.lemma.coreFeatures.discourseFormulaRole,
		).toBeNull();
		expect(
			corpus.cases[
				"grammar-de-discourse-formula-dev-bitte-schoen-request"
			]?.idealOutput.lemma.coreFeatures.discourseFormulaRole,
		).toBe("Request");
		expect(
			corpus.cases["grammar-de-discourse-formula-demo-mfg-variant"]
				?.idealOutput,
		).toMatchObject({
			memberOrthographies: ["Standard"],
			realizationCoverage: "Full",
			normalizedMembers: ["MfG"],
			surface: { spelling: "Variant" },
			lemma: { canonicalForm: "mit freundlichen grüßen" },
		});
		expect(
			corpus.cases[
				"grammar-de-discourse-formula-dev-guten-morgen-casing-typo"
			]?.idealOutput,
		).toMatchObject({
			memberOrthographies: ["Standard", "Typo"],
			normalizedMembers: ["guten", "Morgen"],
			surface: { spelling: "Canonical" },
		});
		expect(
			corpus.cases[
				"grammar-de-discourse-formula-dev-danke-danke-repetition"
			]?.input.members,
		).toEqual(["Danke", "danke"]);

		const partialIds = corpus
			.all()
			.ids.filter(
				(id) =>
					corpus.cases[id]?.idealOutput.realizationCoverage ===
					"Partial",
			);
		expect(partialIds).toEqual([
			"grammar-de-discourse-formula-demo-es-tut-mir-partial",
			"grammar-de-discourse-formula-dev-mit-freundlichen-partial",
			"grammar-de-discourse-formula-accept-vielen-herzlichen-partial",
		]);
		for (const id of partialIds) {
			expect(corpus.cases[id]?.input.markedContext).toContain("…");
		}
	});

	test("restores application-owned route identity and linked Citation through codecs", () => {
		const model =
			corpus.cases["grammar-de-discourse-formula-demo-guten-morgen"]
				?.idealOutput;
		if (model === undefined)
			throw new Error("Missing DiscourseFormula fixture.");
		const runtime = discourseFormulaResolutionCodec.decode(model);
		expect(runtime.lemma).toEqual({
			language: "de",
			family: "Phraseme",
			kind: "DiscourseFormula",
			canonicalForm: "guten morgen",
			coreFeatures: { discourseFormulaRole: "Greeting" },
		});
		const lemma = deDiscourseFormulaLemmaCodec.decode(model.lemma);
		expect(
			buildDeDiscourseFormulaCitationSurfaceCodec(lemma).decode({
				...model.surface,
				surfaceKind: "Citation",
				normalizedSurface: model.normalizedMembers.join(" "),
			}),
		).toMatchObject({ language: "de", surfaceKind: "Citation", lemma });
	});
});
