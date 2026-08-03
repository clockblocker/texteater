import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	collocationGrammaticalResolutionExperiment,
	evaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-collocation/evaluation-suite";
import { evaluateCollocationGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-collocation/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/collocation/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/collocation/prompt-source";
import { outputSchema } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/collocation/schemas";

const expectedEvaluationIds = [
	"grammar-de-coll-antrag-present-full",
	"grammar-de-coll-antrag-past-full",
	"grammar-de-coll-vereinbarung-present-full",
	"grammar-de-coll-abbitte-plural-full",
	"grammar-de-coll-abschied-past-full",
	"grammar-de-coll-zustimmung-present-full",
	"grammar-de-coll-ende-imperative-full",
	"grammar-de-coll-anspruch-participle-full",
	"grammar-de-coll-ausdruck-infinitive-full",
	"grammar-de-coll-einfluss-present-full",
	"grammar-de-coll-erscheinung-modified-full",
	"grammar-de-coll-abschied-citation",
	"grammar-de-coll-abbitte-typo",
	"grammar-de-coll-unresolved-idiom-loeffel",
	"grammar-de-coll-unresolved-construction-je-desto",
	"grammar-de-coll-unresolved-verb-only-antrag",
	"grammar-de-coll-unresolved-mixed-occurrences",
	"grammar-de-coll-unresolved-marked-dependent",
	"grammar-de-coll-unresolved-elliptic-kenntnis",
	"grammar-de-coll-unresolved-present-member-unmarked",
] as const;

describe("Phraseme/Collocation route-local corpus", () => {
	test("keeps four demonstrations and 20 disjoint held-out cases", () => {
		expect(corpus.all().ids).toHaveLength(27);
		expect(demonstrations.ids).toEqual([
			"grammar-de-coll-decision-present-full",
			"grammar-de-coll-frage-citation",
			"grammar-de-coll-verfuegung-present-full",
			"grammar-de-coll-unresolved-free-book-read",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(
			collocationGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(demonstrations.union(evaluation).ids).toHaveLength(24);
		expect(corpus.all().ids.some((id) => /-(?:demo|eval)-/u.test(id))).toBe(
			false,
		);
		expect(Object.keys(corpus.collections)).toEqual([
			"forms",
			"boundaries",
			"alternants",
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

	test("assembles the route policy and only the selected demonstrations", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("German verbal support-verb");
		expect(prompt).toContain("Core Features are exactly {}");
		expect(prompt).toContain("no proven positive Partial policy");
		expect(prompt).toContain("a present canonical member is unmarked");
		expect(prompt).toContain("Never borrow grammatical features");
		expect(prompt).toContain("A marked support verb alone");
		expect(prompt).toContain(
			"normalizedSurface contains only normalized attested",
		);
		expect(prompt).toContain("<TARGET>trifft</TARGET>");
		expect(prompt).toContain("<TARGET>Frage</TARGET>");
		expect(prompt).toContain("<TARGET>Verfügung</TARGET>");
		expect(prompt).toContain("<TARGET>Buch</TARGET>");
		expect(prompt).not.toContain("<TARGET>Antrag</TARGET>");
		expect(prompt).not.toContain("<TARGET>Löffel</TARGET>");
	});

	test("makes Collocation eligibility an ordered fail-closed decision procedure", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain(
			"Apply these gates in order and stop at the first failure",
		);
		expect(prompt).toContain("Gate 1 — Route boundary");
		expect(prompt).toContain(
			"Gate 2 — One occurrence and marked inventory",
		);
		expect(prompt).toContain("Gate 3 — Full realization");
		expect(prompt).toContain("Only after all three gates pass");
		expect(prompt.indexOf("Gate 1 — Route boundary")).toBeLessThan(
			prompt.indexOf("Gate 2 — One occurrence and marked inventory"),
		);
		expect(
			prompt.indexOf("Gate 2 — One occurrence and marked inventory"),
		).toBeLessThan(prompt.indexOf("Gate 3 — Full realization"));
	});

	test("pins every retained-run surface and morphology regression", () => {
		const regressionPayload = (caseId: keyof typeof corpus.cases) => {
			const idealOutput = corpus.cases[caseId]?.idealOutput;
			if (
				idealOutput?.decision !== "Resolved" ||
				idealOutput.resolution === null ||
				idealOutput.resolution.surface.surfaceKind !== "Inflection"
			) {
				throw new Error(
					`Missing resolved Inflection fixture ${caseId}.`,
				);
			}
			return {
				normalizedSurface:
					idealOutput.resolution.surface.normalizedSurface,
				inflectionalFeatures:
					idealOutput.resolution.surface.inflectionalFeatures,
				canonicalForm: idealOutput.resolution.lemma.canonicalForm,
			};
		};

		expect(regressionPayload("grammar-de-coll-abschied-past-full")).toEqual(
			{
				normalizedSurface: "nahmen Abschied",
				inflectionalFeatures: {
					mood: "Ind",
					number: "Plur",
					person: "1",
					tense: "Past",
					verbForm: "Fin",
					voice: null,
				},
				canonicalForm: "Abschied nehmen",
			},
		);
		expect(
			regressionPayload("grammar-de-coll-ende-imperative-full"),
		).toEqual({
			normalizedSurface: "komm zum Ende",
			inflectionalFeatures: {
				mood: "Imp",
				number: "Sing",
				person: "2",
				tense: null,
				verbForm: "Fin",
				voice: null,
			},
			canonicalForm: "zum Ende kommen",
		});
		expect(
			regressionPayload("grammar-de-coll-anspruch-participle-full"),
		).toEqual({
			normalizedSurface: "in Anspruch genommen",
			inflectionalFeatures: {
				aspect: null,
				gender: null,
				mood: null,
				number: null,
				person: null,
				tense: null,
				verbForm: "Part",
				voice: null,
			},
			canonicalForm: "in Anspruch nehmen",
		});
		expect(
			regressionPayload("grammar-de-coll-ausdruck-infinitive-full"),
		).toEqual({
			normalizedSurface: "zum Ausdruck bringen",
			inflectionalFeatures: {
				mood: null,
				number: null,
				person: null,
				tense: null,
				verbForm: "Inf",
				voice: null,
			},
			canonicalForm: "zum Ausdruck bringen",
		});
		expect(
			regressionPayload("grammar-de-coll-einfluss-present-full"),
		).toEqual({
			normalizedSurface: "nimmt Einfluss",
			inflectionalFeatures: {
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Pres",
				verbForm: "Fin",
				voice: null,
			},
			canonicalForm: "Einfluss nehmen",
		});
	});

	test("pins every retained-run boundary contradiction as Unresolved", () => {
		for (const caseId of [
			"grammar-de-coll-unresolved-idiom-loeffel",
			"grammar-de-coll-unresolved-construction-je-desto",
			"grammar-de-coll-unresolved-marked-dependent",
			"grammar-de-coll-unresolved-elliptic-kenntnis",
			"grammar-de-coll-unresolved-present-member-unmarked",
		] as const) {
			expect(corpus.cases[caseId]?.idealOutput).toEqual({
				decision: "Unresolved",
				resolution: null,
			});
		}
	});

	test("pins Full, Citation, and member-aligned payloads", () => {
		expect(
			corpus.cases["grammar-de-coll-decision-present-full"]?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Standard", "Standard", "Standard"],
				surface: {
					normalizedSurface: "trifft eine Entscheidung",
					realizationCoverage: "Full",
					surfaceKind: "Inflection",
				},
				lemma: {
					canonicalForm: "eine Entscheidung treffen",
					coreFeatures: {},
				},
			},
		});
		expect(
			corpus.cases["grammar-de-coll-verfuegung-present-full"]
				?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Standard", "Standard", "Standard"],
				surface: {
					normalizedSurface: "stellen zur Verfügung",
					realizationCoverage: "Full",
				},
				lemma: { canonicalForm: "zur Verfügung stellen" },
			},
		});
		expect(
			corpus.cases["grammar-de-coll-frage-citation"]?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: { surfaceKind: "Citation" },
				lemma: { canonicalForm: "eine Frage stellen" },
			},
		});
		for (const testCase of corpus.all().cases) {
			if (
				testCase.idealOutput.decision === "Resolved" &&
				testCase.idealOutput.resolution !== null
			) {
				expect(
					testCase.idealOutput.resolution.surface.realizationCoverage,
				).not.toBe("Partial");
			}
		}
	});

	test("pins the support verb feature shape for finite, infinitive, and participle Surfaces", () => {
		expect(
			corpus.cases["grammar-de-coll-antrag-present-full"]?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: {
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
		});
		expect(
			corpus.cases["grammar-de-coll-ausdruck-infinitive-full"]
				?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: { inflectionalFeatures: { verbForm: "Inf" } },
			},
		});
		expect(
			corpus.cases["grammar-de-coll-anspruch-participle-full"]
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

	test("covers semantic route boundaries and keeps alternant identity separate", () => {
		for (const caseId of [
			"grammar-de-coll-unresolved-free-book-read",
			"grammar-de-coll-unresolved-idiom-loeffel",
			"grammar-de-coll-unresolved-construction-je-desto",
			"grammar-de-coll-unresolved-verb-only-antrag",
			"grammar-de-coll-unresolved-mixed-occurrences",
			"grammar-de-coll-unresolved-marked-dependent",
			"grammar-de-coll-unresolved-elliptic-kenntnis",
			"grammar-de-coll-unresolved-present-member-unmarked",
		]) {
			expect(corpus.cases[caseId]?.idealOutput).toEqual({
				decision: "Unresolved",
				resolution: null,
			});
		}
		for (const caseId of [
			"grammar-de-coll-determiner-alternant",
			"grammar-de-coll-plural-member-alternant",
			"grammar-de-coll-support-verb-alternant",
		]) {
			expect(corpus.cases[caseId]).toBeDefined();
			expect(demonstrations.ids).not.toContain(caseId);
			expect(evaluation.ids).not.toContain(caseId);
		}
	});

	test("derives strict minimal Collocation DTOs", () => {
		const testCase = corpus.cases["grammar-de-coll-antrag-present-full"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing Collocation fixture.");
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
		expect(
			outputSchema.safeParse({
				...testCase.idealOutput,
				resolution: {
					...testCase.idealOutput.resolution,
					lemma: {
						...testCase.idealOutput.resolution.lemma,
						coreFeatures: { supportVerb: "stellen" },
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

	test("keeps corpus TARGET spans structurally preflightable", () => {
		for (const testCase of corpus.all().cases) {
			const openings =
				testCase.input.markedContext.match(/<TARGET>/gu) ?? [];
			const closings =
				testCase.input.markedContext.match(/<\/TARGET>/gu) ?? [];
			const spans = [
				...testCase.input.markedContext.matchAll(
					/<TARGET>([^<]+)<\/TARGET>/gu,
				),
			];
			expect(openings.length).toBe(closings.length);
			expect(spans).toHaveLength(openings.length);
			expect(spans.every((match) => !/\s/u.test(match[1] ?? ""))).toBe(
				true,
			);
		}
	});
});

describe("Phraseme/Collocation diagnostic evaluator", () => {
	test("passes every pinned ideal output exactly", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateCollocationGrammaticalResolution({
				caseId,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			});
			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("diagnoses member alignment, coverage, and Core independently", () => {
		const testCase = corpus.cases["grammar-de-coll-antrag-present-full"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing Collocation fixture.");
		}
		const output = {
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				memberOrthographies: ["Standard" as const],
				surface: {
					...testCase.idealOutput.resolution.surface,
					realizationCoverage: "Partial" as const,
				},
				lemma: {
					...testCase.idealOutput.resolution.lemma,
					coreFeatures: { unsupported: true },
				},
			},
		};
		const result = evaluateCollocationGrammaticalResolution({
			caseId: "grammar-de-coll-antrag-present-full",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output: output as never,
		});
		expect(result.memberCountPass).toBe(false);
		expect(result.memberOrthographiesPass).toBe(false);
		expect(result.realizationCoveragePass).toBe(false);
		expect(result.coreFeaturesPass).toBe(false);
		expect(result.decisionPass).toBe(true);
	});
});
