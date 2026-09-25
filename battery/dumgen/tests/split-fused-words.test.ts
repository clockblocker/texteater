import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import { Effect } from "effect";
import type { SystemOneResult, TypeSafeExecutor } from "promptsmith/typesafe";
import { segmentGerman } from "../src/concrete-lang/de/segmentation/segment.js";
import { choiceAnswers } from "../src/testing/execution-fixture.js";
import { grammarFixture } from "../src/testing.js";
import type {
	AnalysisTarget,
	OperationTrace,
	SegmentedSentence,
} from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";

const unused = createDumgen({
	judge: async () => {
		throw Error("Must not judge");
	},
	execute: async () => {
		throw Error("Must not generate");
	},
});

/** A Sentence as Dumgen segments it. */
function sentenceOf(text: string): SegmentedSentence<"de"> {
	return {
		id: text,
		language: "de",
		segments: segmentGerman(text).segments.map(({ kind, text }) => ({
			kind,
			text,
		})),
	};
}

const texts = (sentence: SegmentedSentence) =>
	sentence.segments.map((segment) => segment.text);

test("segmentation splits every German fused word into its pieces", async () => {
	expect(texts(sentenceOf("Ich bin im Wald."))).toEqual([
		"Ich",
		" ",
		"bin",
		" ",
		"i",
		"m",
		" ",
		"Wald",
		".",
	]);
	// Each piece carries the word it stands for.
	expect(segmentGerman("Ich bin im Wald.").segments.slice(4, 6)).toEqual([
		{ kind: "ResolvableText", text: "i", surface: "in" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
	]);
	expect(
		segmentGerman("Aufs Dach!").trace.map(({ text, rule }) => [text, rule]),
	).toEqual([
		["Auf", "fused-word-piece"],
		["s", "fused-word-piece"],
		[" ", "space-separator"],
		["Dach", "de-surface-candidate"],
		["!", "conventional-punctuation-run"],
	]);
	const trusted = await Effect.runPromise(
		unused.segmentSentence({
			language: "de",
			stitchedText: "Er wartet aufs Ende.",
		}),
	);
	expect(trusted.segments.slice(4, 6)).toEqual([
		{ kind: "ResolvableText", text: "auf", surface: "auf" },
		{ kind: "ResolvableText", text: "s", surface: "das" },
	]);
	// Other languages have no German fusion table.
	const english = await Effect.runPromise(
		unused.segmentSentence({ language: "en", stitchedText: "I am in." }),
	);
	expect(texts(english)).toContain("am");
});

const whole: SegmentedSentence<"de"> = {
	id: "whole",
	language: "de",
	segments: [
		{ kind: "ResolvableText", text: "Ich" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "bin" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "im" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Wald" },
	],
};

test("a caller-supplied whole fused word is rejected at every German entry point", async () => {
	const failures = await Promise.all([
		Effect.runPromise(
			Effect.either(unused.analyzeSentence({ sentence: whole })),
		),
		Effect.runPromise(
			Effect.either(
				unused.classifyTarget({
					sentence: whole,
					clickedSegmentIndex: 6,
				}),
			),
		),
		Effect.runPromise(
			Effect.either(
				unused.resolveGrammar({
					sentence: whole,
					target: {
						family: "Lexeme",
						kind: "NOUN",
						memberSegmentIndices: [6],
					},
					contextAvailable: false,
				}),
			),
		),
	]);
	for (const failure of failures)
		expect(failure).toMatchObject({
			_tag: "Left",
			left: {
				_tag: "InvalidInput",
				message: expect.stringContaining("whole fused word"),
			},
		});
});

/** A classification judge that includes `members` and answers `route`. */
function classifier(members: readonly number[], route: string) {
	const traces: OperationTrace[] = [];
	const judge: TypeSafeExecutor = async (request) =>
		choiceAnswers(request.questions, (id) =>
			id === "route"
				? route
				: members.includes(Number(id.slice("member_".length)))
					? "Include"
					: "Exclude",
		) as SystemOneResult<typeof request.questions>;
	return {
		traces,
		dumgen: createDumgen({
			judge,
			execute: async () => {
				throw Error("Classification must not generate text");
			},
			onOperation: (trace) => traces.push(trace),
		}),
	};
}

const walds = {
	lemma: {
		canonicalForm: "Wald",
		coreFeatures: { gender: "Masc", hyph: null },
	},
	surface: {
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: {
			case: "Dat",
			number: "Sing",
			article: "Definite",
		},
	},
	memberOrthographies: ["Fused", "Standard"],
	normalizedMembers: ["dem", "Wald"],
	realizationCoverage: "Full",
	articleEvidence: { kind: "Owned", member: 0 },
	valencyEvidence: [],
};

test("the click-time fallback resolves Wald in Ich bin im Wald with its fused article", async () => {
	const sentence = sentenceOf("Ich bin im Wald");
	const { dumgen, traces } = classifier([5, 7], "Lexeme/NOUN");
	const target = await Effect.runPromise(
		dumgen.classifyTarget({ sentence, clickedSegmentIndex: 7 }),
	);
	expect(target).toEqual({
		family: "Lexeme",
		kind: "NOUN",
		memberSegmentIndices: [5, 7],
	});
	const request = traces[0]?.calls[0]?.request;
	if (!request || !("questions" in request))
		throw Error("Expected a classification judgment");
	expect(request.input).toMatchObject({
		fusedWords: [
			"im is one written word split into pieces: <s4> i stands for in; <s5> m stands for dem.",
		],
	});
	const attestation = await Effect.runPromise(
		createDumgen(grammarFixture(walds)).resolveGrammar({
			sentence,
			target: target as AnalysisTarget<"de">,
			contextAvailable: false,
		}),
	);
	expect(attestation.members).toEqual([
		{
			attested: "m",
			orthography: "Fused",
			fusion: {
				spelling: "im",
				components: [
					{ span: "i", surface: "in" },
					{ span: "m", surface: "dem" },
				],
			},
			component: 1,
		},
		{ attested: "Wald", orthography: "Standard" },
	]);
	expect(attestation.realizationCoverage).toBe("Full");
	expect(attestation.surface.normalizedSurface).toBe("Wald");
	expect(parseUnit(attestation).success).toBe(true);
});

test("a noun target may hold one article, a fused article piece included", async () => {
	// The preposition piece before the article piece is no noun member.
	const sentence = sentenceOf("Ich bin im Wald");
	const { dumgen } = classifier([4, 5, 7], "Lexeme/NOUN");
	expect(
		await Effect.runPromise(
			Effect.either(
				dumgen.classifyTarget({ sentence, clickedSegmentIndex: 7 }),
			),
		),
	).toMatchObject({ _tag: "Left", left: { _tag: "Unresolved" } });
	const twoArticles = sentenceOf("Der Mann im Wald");
	const run = classifier([0, 5, 7], "Lexeme/NOUN");
	expect(
		await Effect.runPromise(
			Effect.either(
				run.dumgen.classifyTarget({
					sentence: twoArticles,
					clickedSegmentIndex: 7,
				}),
			),
		),
	).toMatchObject({ _tag: "Left", left: { _tag: "Unresolved" } });
});

const adverb = {
	lemma: {
		canonicalForm: "zum Beispiel",
		coreFeatures: { foreign: null, numType: null, pronType: null },
	},
	surface: {
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: null,
	},
	memberOrthographies: ["Shorthand"],
	normalizedMembers: ["zum Beispiel"],
	realizationCoverage: "Full",
};

test("an abbreviation takes its table Kind and attests the Surface it stands for: Das ist z.B. gut", async () => {
	const sentence = sentenceOf("Das ist z.B. gut");
	expect(texts(sentence)).toContain("z.B.");
	const target = await Effect.runPromise(
		unused.classifyTarget({ sentence, clickedSegmentIndex: 4 }),
	);
	expect(target).toEqual({
		family: "Lexeme",
		kind: "ADV",
		memberSegmentIndices: [4],
	});
	const traces: OperationTrace[] = [];
	const attestation = await Effect.runPromise(
		createDumgen({
			...grammarFixture(adverb),
			onOperation: (trace) => traces.push(trace),
		}).resolveGrammar({
			sentence,
			target: target as AnalysisTarget<"de">,
			contextAvailable: false,
		}),
	);
	expect(attestation.members).toEqual([
		{ attested: "z.B.", orthography: "Shorthand" },
	]);
	expect(attestation.surface.normalizedSurface).toBe("zum Beispiel");
	expect(attestation.surface.spelling).toBe("Canonical");
	const request = traces[0]?.calls[0]?.request;
	if (!request || !("questions" in request))
		throw Error("Expected a grammar judgment");
	// Code sets the spelling and the normalization of a table abbreviation.
	expect(Object.keys(request.questions)).not.toContain("spelling");
	expect(Object.keys(request.questions)).not.toContain("normalization_0");
	expect(request.input).toHaveProperty(
		"canonicalFormCandidate",
		"zum Beispiel",
	);
});

const verb = (canonicalForm: string, person: string, normalized: string) => ({
	memberOrthographies: ["Fused"],
	normalizedMembers: [normalized],
	surface: {
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person,
			tense: "Pres",
			verbForm: "Fin",
			voice: null,
			perfect: null,
			future: null,
			passive: null,
			expletive: null,
		},
	},
	lemma: {
		canonicalForm,
		coreFeatures: {
			hasSepPrefix: null,
			lexicallyReflexive: null,
			verbType: null,
		},
	},
	realizationCoverage: "Full",
	expletiveEvidence: null,
	valencyEvidence: [],
});

const pronoun = (
	canonicalForm: string,
	normalized: string,
	core: Record<string, unknown>,
) => ({
	memberOrthographies: ["Fused"],
	normalizedMembers: [normalized],
	surface: {
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: null,
	},
	lemma: {
		canonicalForm,
		coreFeatures: {
			extPos: null,
			foreign: null,
			polite: null,
			poss: null,
			...core,
		},
	},
	realizationCoverage: "Full",
});

const es = pronoun("es", "es", {
	case: "Nom",
	number: "Sing",
	person: "3",
	pronType: "Prs",
	gender: "Neut",
});

/** The surface each Fusion component of each member shows. */
const fusionSurfaces = (attestation: { members: readonly object[] }) =>
	attestation.members.map((member) =>
		(
			member as {
				fusion?: {
					components: readonly { span: string; surface: string }[];
				};
			}
		).fusion?.components.map(({ span, surface }) => `${span}=${surface}`),
	);

async function resolve(
	sentence: SegmentedSentence<"de">,
	kind: "VERB" | "PRON",
	index: number,
	golden: unknown,
	overrides: Record<string, string> = {},
) {
	return Effect.runPromise(
		createDumgen(grammarFixture(golden, overrides)).resolveGrammar({
			sentence,
			target: { family: "Lexeme", kind, memberSegmentIndices: [index] },
			contextAvailable: false,
		}),
	);
}

test("every Attestation referencing a Fusion shows the reading the sentence chose for each piece", async () => {
	// Wie0 geht2 's3 ?4
	const wie = sentenceOf("Wie geht's?");
	expect(texts(wie)).toEqual(["Wie", " ", "geht", "'s", "?"]);
	const [host, clitic] = await Promise.all([
		resolve(wie, "VERB", 2, verb("gehen", "3", "geht"), {
			reading_3: "surface_0",
		}),
		resolve(wie, "PRON", 3, es),
	]);
	expect(fusionSurfaces(host)).toEqual([["geht=geht", "'s=es"]]);
	expect(fusionSurfaces(clitic)).toEqual([["geht=geht", "'s=es"]]);

	// Hast0 du2 's3 gesehen5 ?6
	const hast = sentenceOf("Hast du's gesehen?");
	const du = pronoun("du", "du", {
		case: "Nom",
		number: "Sing",
		person: "2",
		polite: "Infm",
		pronType: "Prs",
		gender: null,
	});
	const [subject, object] = await Promise.all([
		resolve(hast, "PRON", 2, du),
		resolve(hast, "PRON", 3, {
			...es,
			lemma: {
				...es.lemma,
				coreFeatures: { ...es.lemma.coreFeatures, case: "Acc" },
			},
		}),
	]);
	expect(fusionSurfaces(subject)).toEqual([["du=du", "'s=es"]]);
	expect(fusionSurfaces(object)).toEqual([["du=du", "'s=es"]]);
});

test("the verb's Fusion follows the sentence when it reads 's as das: Das ist's", async () => {
	// Das0 ist2 's3
	const sentence = sentenceOf("Das ist's");
	const traces: OperationTrace[] = [];
	const attestation = await Effect.runPromise(
		createDumgen({
			...grammarFixture(verb("sein", "3", "ist"), {
				reading_3: "surface_1",
			}),
			onOperation: (trace) => traces.push(trace),
		}).resolveGrammar({
			sentence,
			target: {
				family: "Lexeme",
				kind: "VERB",
				memberSegmentIndices: [2],
			},
			contextAvailable: false,
		}),
	);
	expect(fusionSurfaces(attestation)).toEqual([["ist=ist", "'s=das"]]);
	const request = traces[0]?.calls[0]?.request;
	if (!request || !("questions" in request))
		throw Error("Expected a grammar judgment");
	expect(request.questions.reading_3).toMatchObject({
		criteria: { surface_0: "es", surface_1: "das" },
	});
	const demonstrative = await resolve(
		sentence,
		"PRON",
		3,
		pronoun("das", "das", {
			case: "Nom",
			number: "Sing",
			person: null,
			pronType: "Dem",
			gender: "Neut",
		}),
	);
	expect(fusionSurfaces(demonstrative)).toEqual([["ist=ist", "'s=das"]]);
});

test("a fused word a unit holds whole is written whole in its Surface: zur Verfügung stellen", async () => {
	// Wir0 stellen2 die4 Daten6 zu8 r9 Verfügung11 .12
	const sentence = sentenceOf("Wir stellen die Daten zur Verfügung.");
	const attestation = await Effect.runPromise(
		createDumgen(
			grammarFixture({
				memberOrthographies: ["Standard", "Fused", "Fused", "Standard"],
				normalizedMembers: ["stellen", "zu", "r", "Verfügung"],
				surface: {
					spelling: "Canonical",
					surfaceFeatures: null,
					inflectionalFeatures: {
						mood: "Ind",
						number: "Plur",
						person: "1",
						tense: "Pres",
						verbForm: "Fin",
						voice: null,
						perfect: null,
						future: null,
						passive: null,
						expletive: null,
					},
				},
				lemma: {
					canonicalForm: "zur Verfügung stellen",
					coreFeatures: {},
				},
				realizationCoverage: "Full",
				expletiveEvidence: null,
				valencyEvidence: [],
			}),
		).resolveGrammar({
			sentence,
			target: {
				family: "Phraseme",
				kind: "Collocation",
				memberSegmentIndices: [2, 8, 9, 11],
			},
			contextAvailable: false,
		}),
	);
	expect(attestation.surface.normalizedSurface).toBe("stellen zur Verfügung");
	expect(fusionSurfaces(attestation)).toEqual([
		undefined,
		["zu=zu", "r=der"],
		["zu=zu", "r=der"],
		undefined,
	]);
});

test("a shortened article never makes the noun Surface a Variant: Hast du 'ne Frage?", async () => {
	// Hast0 du2 'ne4 Frage6 ?7
	const sentence = sentenceOf("Hast du 'ne Frage?");
	const traces: OperationTrace[] = [];
	const attestation = await Effect.runPromise(
		createDumgen({
			...grammarFixture({
				lemma: {
					canonicalForm: "Frage",
					coreFeatures: { gender: "Fem", hyph: null },
				},
				surface: {
					spelling: "Canonical",
					surfaceFeatures: null,
					inflectionalFeatures: {
						case: "Acc",
						number: "Sing",
						article: "Indefinite",
					},
				},
				memberOrthographies: ["Shorthand", "Standard"],
				normalizedMembers: ["eine", "Frage"],
				realizationCoverage: "Full",
				articleEvidence: { kind: "Owned", member: 0 },
				valencyEvidence: [],
			}),
			onOperation: (trace) => traces.push(trace),
		}).resolveGrammar({
			sentence,
			target: {
				family: "Lexeme",
				kind: "NOUN",
				memberSegmentIndices: [4, 6],
			},
			contextAvailable: false,
		}),
	);
	expect(attestation.surface.spelling).toBe("Canonical");
	expect(attestation.surface.normalizedSurface).toBe("Frage");
	const request = traces[0]?.calls[0]?.request;
	if (!request || !("questions" in request))
		throw Error("Expected a grammar judgment");
	expect(request.questions.spelling?.instructions).toContain(
		"Judge only the members `memberSpellings` does not list (Frage)",
	);
});
