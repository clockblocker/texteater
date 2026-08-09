import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	evaluation,
	idiomGrammaticalResolutionExperiment,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-idiom/evaluation-suite";
import { evaluateIdiomGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-idiom/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/idiom/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/idiom/prompt-source";
import {
	buildDeIdiomCitationSurfaceCodec,
	buildDeIdiomInflectionSurfaceCodec,
	deIdiomLemmaCodec,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/idiom/schemas";

const expectedEvaluationIds = [
	"grammar-de-idiom-faeustchen-past-full",
	"grammar-de-idiom-faeustchen-participle-full",
	"grammar-de-idiom-faeustchen-infinitive-full",
	"grammar-de-idiom-faeustchen-typo",
	"grammar-de-idiom-truebsal-imperative-full",
	"grammar-de-idiom-hand-fuss-present-full",
	"grammar-de-idiom-hand-fuss-subjunctive-full",
	"grammar-de-idiom-schneider-past-full",
	"grammar-de-idiom-schneider-citation",
	"grammar-de-idiom-bett-past-full",
	"grammar-de-idiom-fliegen-present-full",
	"grammar-de-idiom-fliegen-participle-full",
	"grammar-de-idiom-loeffel-past-full",
	"grammar-de-idiom-loeffel-typo",
	"grammar-de-idiom-unresolved-underselected-without-head",
	"grammar-de-idiom-unresolved-overselected-subject",
	"grammar-de-idiom-unresolved-literal-bed",
	"grammar-de-idiom-unresolved-collocation",
	"grammar-de-idiom-unresolved-proverb",
	"grammar-de-idiom-unresolved-discourse-formula",
] as const;

describe("Phraseme/Idiom route-local corpus", () => {
	test("keeps five minimized demonstrations and 20 disjoint held-out cases", () => {
		expect(corpus.all().ids).toHaveLength(31);
		expect(demonstrations.ids).toEqual([
			"grammar-de-idiom-flinte-past-full",
			"grammar-de-idiom-flinte-participle-typo-full",
			"grammar-de-idiom-grass-citation",
			"grammar-de-idiom-woelfe-past-partial",
			"grammar-de-idiom-unresolved-proverb-grube",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(
			idiomGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(demonstrations.union(evaluation).ids).toHaveLength(25);
		expect(
			corpus.all().difference(demonstrations.union(evaluation)).ids,
		).toEqual([
			"grammar-de-idiom-unresolved-literal-grass",
			"grammar-de-idiom-unresolved-grass-underselected-without-head",
			"grammar-de-idiom-provisional-faeustchen-underselected-head",
			"grammar-de-idiom-unresolved-separable-verb",
			"grammar-de-idiom-unresolved-mixed-occurrences",
			"grammar-de-idiom-unresolved-two-occurrences",
		]);
		expect(Object.keys(corpus.collections)).toEqual([
			"forms",
			"boundaries",
		]);
	});

	test("keeps resolved demonstration Lemmas out of held-out scoring", () => {
		const demonstrationLemmas = new Set(
			demonstrations.cases.flatMap((testCase) =>
				testCase.idealOutput.resolution === null
					? []
					: [testCase.idealOutput.resolution.lemma.canonicalForm],
			),
		);
		expect(
			evaluation.cases.flatMap((testCase) =>
				testCase.idealOutput.resolution !== null &&
				demonstrationLemmas.has(
					testCase.idealOutput.resolution.lemma.canonicalForm,
				)
					? [testCase.idealOutput.resolution.lemma.canonicalForm]
					: [],
			),
		).toEqual([]);
	});

	test("assembles the semantic boundary, Partial tension, and selected-head policy", () => {
		const prompt = assembleSystemPrompt(promptSource);
		const normalizedPrompt = prompt.replaceAll(/\s+/gu, " ");
		expect(normalizedPrompt).toContain(
			"Apply these gates in order and stop at the first failure",
		);
		expect(prompt).toContain("conventional global or figurative meaning");
		expect(normalizedPrompt).toContain(
			"An independently enacted greeting is always DiscourseFormula",
		);
		expect(normalizedPrompt).toContain(
			"nonverbal Citation allowance never overrides this route gate",
		);
		expect(normalizedPrompt).toContain(
			"A verb-plus-noun shape alone does not make a Collocation",
		);
		expect(prompt).toContain("Idiom Core Features are exactly {}");
		expect(normalizedPrompt).toContain(
			"only authoritative positive Partial evidence",
		);
		expect(normalizedPrompt).toContain(
			"Do not generalize that one example",
		);
		expect(prompt).toContain("include the inflecting\nverbal head");
		expect(normalizedPrompt).toContain(
			"an omitted contextual verbal head forces Unresolved",
		);
		expect(normalizedPrompt).toContain(
			"An unambiguous spelling error does not fail the route or fixed-member gate",
		);
		expect(normalizedPrompt).toContain(
			"For a contextual clause, inspect the selected members themselves before using surrounding grammar",
		);
		expect(normalizedPrompt).toContain(
			"Determine verbForm from the selected verbal member itself before assigning clause-level features",
		);
		expect(normalizedPrompt).toContain(
			"Only a selected finite verb licenses verbForm Fin",
		);
		expect(prompt).toContain(
			"normalizedSurface contains only normalized selected",
		);
		expect(normalizedPrompt).toContain(
			"unmarked infinitival zu never appears in normalizedSurface",
		);
		expect(prompt).toContain("Konjunktiv I receives tense Pres");
		expect(prompt).toContain("Konjunktiv II receives tense Past");
		expect(normalizedPrompt).toContain(
			"singular second-person imperative has number Sing and person 2",
		);
		expect(normalizedPrompt).toContain(
			"A marked Partizip II remains verbForm Part",
		);
		expect(prompt).toContain("imperative Blase\nnormalizes to blase");
		expect(normalizedPrompt).toContain(
			"A Typo repair does not make Surface spelling Variant",
		);
		expect(prompt).toContain("<TARGET>Flintte</TARGET>");
		expect(prompt).toContain("<TARGET>warf</TARGET>");
		expect(prompt).toContain("<TARGET>beißen</TARGET>");
		expect(prompt).toContain("<TARGET>heulte</TARGET>");
		expect(prompt).toContain("<TARGET>Gras</TARGET>");
		expect(prompt).not.toContain(
			"Nach langer Krankheit biss der Bösewicht <TARGET>ins</TARGET> <TARGET>Gras</TARGET>.",
		);
		expect(prompt).not.toContain(
			"Nach dem verlorenen Duell musste der Schurke <TARGET>ins</TARGET> <TARGET>Gras</TARGET> beißen.",
		);
		expect(prompt).not.toContain("Das Kalb <TARGET>biss</TARGET>");
		expect(prompt).toContain(
			"<TARGET>Wer</TARGET> <TARGET>anderen</TARGET> <TARGET>eine</TARGET> <TARGET>Grube</TARGET> <TARGET>gräbt</TARGET>, <TARGET>fällt</TARGET> <TARGET>selbst</TARGET> <TARGET>hinein</TARGET>.",
		);
		expect(prompt).not.toContain("<TARGET>Morgenstund</TARGET>");
		expect(prompt).not.toContain("<TARGET>Fäustchen</TARGET>");
		expect(prompt).not.toContain("<TARGET>Löffel</TARGET>");
	});

	test("pins Full, Citation, and repository-authoritative Partial payloads", () => {
		expect(
			corpus.cases["grammar-de-idiom-flinte-participle-typo-full"]
				?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: [
					"Standard",
					"Typo",
					"Standard",
					"Standard",
					"Standard",
				],
				realizationCoverage: "Full",
				surface: {
					normalizedSurface: "die Flinte ins Korn geworfen",
					surfaceKind: "Inflection",
					inflectionalFeatures: {
						verbForm: "Part",
						tense: null,
					},
				},
				lemma: {
					canonicalForm: "die Flinte ins Korn werfen",
					coreFeatures: {},
				},
			},
		});
		expect(
			corpus.cases["grammar-de-idiom-flinte-participle-typo-full"]
				?.contaminationKeys,
		).toEqual(["de-idiom-lemma:flinte-ins-korn-werfen"]);
		expect(
			corpus.cases["grammar-de-idiom-grass-citation"]?.idealOutput,
		).toMatchObject({
			resolution: { surface: { surfaceKind: "Citation" } },
		});
		expect(
			corpus.cases["grammar-de-idiom-woelfe-past-partial"]?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Standard", "Standard"],
				realizationCoverage: "Partial",
				surface: {
					normalizedSurface: "heulte mit",
				},
				lemma: { canonicalForm: "mit den Wölfen heulen" },
			},
		});
		const partialIds = corpus.all().ids.filter((id) => {
			const testCase = corpus.cases[id];
			return (
				testCase?.idealOutput.resolution?.realizationCoverage ===
				"Partial"
			);
		});
		expect(partialIds).toEqual(["grammar-de-idiom-woelfe-past-partial"]);
	});

	test("keeps selected-head probes stimulus-distinct and corpus-only", () => {
		const corpusOnlyProbe =
			corpus.cases[
				"grammar-de-idiom-unresolved-grass-underselected-without-head"
			];
		const heldOut =
			corpus.cases[
				"grammar-de-idiom-unresolved-underselected-without-head"
			];
		expect(corpusOnlyProbe?.idealOutput).toEqual({
			decision: "Unresolved",
			resolution: null,
		});
		expect(corpusOnlyProbe?.input.markedContext).toBe(
			"Nach langer Krankheit biss der Bösewicht <TARGET>ins</TARGET> <TARGET>Gras</TARGET>.",
		);
		expect(corpusOnlyProbe?.input.markedContext).not.toBe(
			"Nach dem verlorenen Duell musste der Schurke <TARGET>ins</TARGET> <TARGET>Gras</TARGET> beißen.",
		);
		expect(corpusOnlyProbe?.contaminationKeys).toEqual([
			"de-idiom-lemma:ins-gras-beissen",
			"de-idiom-boundary:underselection-without-head-ins-gras",
		]);
		expect(heldOut?.contaminationKeys).toEqual([
			"de-idiom-lemma:sich-ins-faeustchen-lachen",
			"de-idiom-boundary:underselection-without-head-faeustchen",
		]);
		expect(heldOut?.input.markedContext).toBe(
			"Sie lachte <TARGET>sich</TARGET> <TARGET>ins</TARGET> <TARGET>Fäustchen</TARGET>.",
		);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
	});

	test("demonstrates a source-backed Proverb boundary without held-out leakage", () => {
		const demonstration =
			corpus.cases["grammar-de-idiom-unresolved-proverb-grube"];
		const heldOut = corpus.cases["grammar-de-idiom-unresolved-proverb"];
		expect(demonstration?.idealOutput).toEqual({
			decision: "Unresolved",
			resolution: null,
		});
		expect(demonstration?.input.markedContext).toBe(
			"<TARGET>Wer</TARGET> <TARGET>anderen</TARGET> <TARGET>eine</TARGET> <TARGET>Grube</TARGET> <TARGET>gräbt</TARGET>, <TARGET>fällt</TARGET> <TARGET>selbst</TARGET> <TARGET>hinein</TARGET>.",
		);
		expect(demonstration?.contaminationKeys).toEqual([
			"de-proverb:wer-anderen-eine-grube-graebt",
			"de-idiom-boundary:proverb-grube",
		]);
		expect(heldOut?.contaminationKeys).toEqual([
			"de-proverb:morgenstund-hat-gold-im-mund",
			"de-idiom-boundary:proverb-morgenstund",
		]);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
	});

	test("pins finite, imperative, subjunctive, infinitive, and participle feature shapes", () => {
		expect(
			corpus.cases["grammar-de-idiom-truebsal-imperative-full"]
				?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: {
					normalizedSurface: "blase Trübsal",
					inflectionalFeatures: {
						mood: "Imp",
						number: "Sing",
						person: "2",
						tense: null,
						verbForm: "Fin",
					},
				},
			},
		});
		expect(
			corpus.cases["grammar-de-idiom-hand-fuss-subjunctive-full"]
				?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: {
					inflectionalFeatures: {
						mood: "Sub",
						tense: "Past",
						verbForm: "Fin",
					},
				},
			},
		});
		expect(
			corpus.cases["grammar-de-idiom-faeustchen-infinitive-full"]
				?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: { inflectionalFeatures: { verbForm: "Inf" } },
			},
		});
		expect(
			corpus.cases["grammar-de-idiom-fliegen-participle-full"]
				?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: {
					inflectionalFeatures: {
						aspect: null,
						tense: null,
						verbForm: "Part",
					},
				},
			},
		});
	});

	test("covers sound semantic and target-scope boundaries", () => {
		for (const caseId of [
			"grammar-de-idiom-unresolved-literal-grass",
			"grammar-de-idiom-unresolved-underselected-without-head",
			"grammar-de-idiom-provisional-faeustchen-underselected-head",
			"grammar-de-idiom-unresolved-overselected-subject",
			"grammar-de-idiom-unresolved-literal-bed",
			"grammar-de-idiom-unresolved-collocation",
			"grammar-de-idiom-unresolved-proverb",
			"grammar-de-idiom-unresolved-discourse-formula",
			"grammar-de-idiom-unresolved-separable-verb",
			"grammar-de-idiom-unresolved-mixed-occurrences",
			"grammar-de-idiom-unresolved-two-occurrences",
		]) {
			expect(corpus.cases[caseId]?.idealOutput).toEqual({
				decision: "Unresolved",
				resolution: null,
			});
		}
	});

	test("round-trips route-fixed Lemma and linked Surface fields", () => {
		const modelLemma = {
			canonicalForm: "mit den Wölfen heulen",
			coreFeatures: {},
		} as const;
		const lemma = deIdiomLemmaCodec.decode(modelLemma);
		expect(lemma).toEqual({
			...modelLemma,
			language: "de",
			family: "Phraseme",
			kind: "Idiom",
		});
		expect(deIdiomLemmaCodec.encode(lemma)).toEqual(modelLemma);

		const modelCitation = {
			normalizedSurface: "mit den Wölfen heulen",
			spelling: "Canonical",
			surfaceKind: "Citation",
			surfaceFeatures: null,
		} as const;
		const citationCodec = buildDeIdiomCitationSurfaceCodec(lemma);
		const citation = citationCodec.decode(modelCitation);
		expect(citation).toEqual({
			...modelCitation,
			language: "de",
			lemma,
		});
		expect(citationCodec.encode(citation)).toEqual(modelCitation);

		const modelInflection = {
			normalizedSurface: "heulte mit",
			spelling: "Canonical",
			surfaceKind: "Inflection",
			surfaceFeatures: { historicalStatus: null },
			inflectionalFeatures: {
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Past",
				verbForm: "Fin",
				voice: null,
			},
		} as const;
		const inflectionCodec = buildDeIdiomInflectionSurfaceCodec(lemma);
		const inflection = inflectionCodec.decode(modelInflection);
		expect(inflection).toEqual({
			...modelInflection,
			surfaceFeatures: null,
			language: "de",
			lemma,
		});
		expect(inflectionCodec.encode(inflection)).toEqual({
			...modelInflection,
			surfaceFeatures: null,
		});
	});

	test("derives a strict minimal Idiom DTO", () => {
		const testCase = corpus.cases["grammar-de-idiom-faeustchen-past-full"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing Idiom fixture.");
		}
		expect(
			outputSchema.safeParse({
				...testCase.idealOutput,
				resolution: {
					...testCase.idealOutput.resolution,
					lemma: {
						...testCase.idealOutput.resolution.lemma,
						family: "Phraseme",
					},
				},
			}).success,
		).toBe(false);
		for (const fixedLemmaField of [{ language: "de" }, { kind: "Idiom" }]) {
			expect(
				outputSchema.safeParse({
					...testCase.idealOutput,
					resolution: {
						...testCase.idealOutput.resolution,
						lemma: {
							...testCase.idealOutput.resolution.lemma,
							...fixedLemmaField,
						},
					},
				}).success,
			).toBe(false);
		}
		expect(
			outputSchema.safeParse({
				...testCase.idealOutput,
				resolution: {
					...testCase.idealOutput.resolution,
					surface: {
						...testCase.idealOutput.resolution.surface,
						lemma: {
							language: "de",
							family: "Phraseme",
							kind: "Idiom",
							canonicalForm: "sich ins Fäustchen lachen",
							coreFeatures: {},
						},
					},
				},
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...testCase.idealOutput,
				resolution: {
					...testCase.idealOutput.resolution,
					lemma: {
						...testCase.idealOutput.resolution.lemma,
						coreFeatures: { figurative: true },
					},
				},
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...testCase.idealOutput,
				resolution: {
					...testCase.idealOutput.resolution,
					memberOrthographies: ["Standard"],
				},
			}).success,
		).toBe(false);
	});

	test("keeps every Golden Case structurally preflightable", () => {
		for (const testCase of corpus.all().cases) {
			expect(
				promptSource.inputSchema.safeParse(testCase.input).success,
			).toBe(true);
		}
	});
});

describe("Phraseme/Idiom diagnostic evaluator", () => {
	test("passes every pinned ideal output exactly", () => {
		for (const testCase of corpus.all().cases) {
			expect(
				evaluateIdiomGrammaticalResolution({
					caseId: "ideal-output",
					input: testCase.input,
					idealOutput: testCase.idealOutput,
					output: testCase.idealOutput,
				}),
			).toMatchObject({ contractPass: true });
		}
	});

	test("diagnoses coverage, inflection, and Core independently", () => {
		const testCase = corpus.cases["grammar-de-idiom-woelfe-past-partial"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null ||
			testCase.idealOutput.resolution.surface.surfaceKind !== "Inflection"
		) {
			throw new Error("Missing Partial Idiom fixture.");
		}
		const result = evaluateIdiomGrammaticalResolution({
			caseId: "grammar-de-idiom-woelfe-past-partial",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output: outputSchema.parse({
				...testCase.idealOutput,
				resolution: {
					...testCase.idealOutput.resolution,
					realizationCoverage: "Full",
					surface: {
						...testCase.idealOutput.resolution.surface,
						inflectionalFeatures: {
							mood: "Ind",
							number: "Sing",
							person: "3",
							tense: "Pres",
							verbForm: "Fin",
							voice: null,
						},
					},
				},
			}),
		});
		expect(result.contractPass).toBe(false);
		expect(result.realizationCoveragePass).toBe(false);
		expect(result.inflectionalFeaturesPass).toBe(false);
		expect(result.coreFeaturesPass).toBe(true);
	});
});
