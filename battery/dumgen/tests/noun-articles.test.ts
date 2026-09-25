import { expect, test } from "bun:test";
import { checkIfGrundform, parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { Effect } from "effect";
import { germanFusionTable } from "../src/concrete-lang/de/fusion-entries.js";
import {
	deriveNounArticle,
	nounArticleReference,
	selectNounHeadingArticle,
} from "../src/index.js";
import { grammarFixture } from "../src/testing.js";
import type { OperationTrace } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { fusedWordPieces, fusionEntry } from "../src/universal/fusion-table.js";
import { validateEncounter } from "../src/universal/validation.js";

/**
 * Whitespace, words and punctuation, with every fused word split into its
 * pieces as intake does (ADR 0035): `im` is `i` and `m`.
 */
function segmentsOf(text: string) {
	return (
		text.match(/\s+|[\p{L}\p{N}'’.-]+|[^\s\p{L}\p{N}]/gu) ?? []
	).flatMap((word) => {
		const fusion = fusionEntry(germanFusionTable, word);
		return (fusion ? fusedWordPieces(fusion, word) : [word]).map(
			(piece) => ({
				text: piece,
				kind: /^\s+$/u.test(piece)
					? "Whitespace"
					: /[\p{L}\p{N}]/u.test(piece)
						? "ResolvableText"
						: "Punctuation",
			}),
		);
	});
}

type ArticleEvidence = Dumling.Attestation<
	"de",
	"Lexeme",
	"NOUN"
>["articleEvidence"];

function example(
	text: string,
	members: string[],
	noun: string,
	form: string,
	article: "Definite" | "Indefinite" | "None",
	caseValue = "Nom",
	number = "Sing",
	gender = "Masc",
	shared: ArticleEvidence = null,
	articleOrthography: "Standard" | "Fused" | "Shorthand" = "Standard",
) {
	const segments = segmentsOf(text);
	let previous = -1;
	const indices = members.map((member) => {
		previous = segments.findIndex(
			(segment, index) => index > previous && segment.text === member,
		);
		return previous;
	});
	const encounter = validateEncounter({
		sentence: { id: "noun-article", language: "de", segments },
		target: {
			family: "Lexeme",
			kind: "NOUN",
			memberSegmentIndices: indices,
		},
	});
	const owned = article !== "None" && !shared;
	const golden = {
		lemma: { canonicalForm: noun, coreFeatures: { gender, hyph: null } },
		surface: {
			spelling: "Canonical",
			surfaceFeatures: null,
			inflectionalFeatures: { case: caseValue, number, article },
		},
		normalizedMembers: members.map((member, position) =>
			owned && position === 0 ? form : member,
		),
		memberOrthographies: members.map((_, position) =>
			owned && position === 0 ? articleOrthography : "Standard",
		),
		realizationCoverage: shared ? "Partial" : "Full",
		articleEvidence: owned ? { kind: "Owned", member: 0 } : shared,
	};
	return {
		encounter,
		golden,
		resolve: () =>
			Effect.runPromise(
				createDumgen(grammarFixture(golden)).resolveGrammar({
					...encounter,
					contextAvailable: false,
				}),
			),
	};
}

const sharedDer: ArticleEvidence = {
	kind: "Shared",
	article: { attested: "der", orthography: "Standard" },
};

for (const [text, members, noun, form, article, caseValue, number, shared] of [
	[
		"der Aufstieg",
		["der", "Aufstieg"],
		"Aufstieg",
		"der",
		"Definite",
		"Nom",
		"Sing",
		null,
	],
	[
		"den Aufstiegen",
		["den", "Aufstiegen"],
		"Aufstieg",
		"den",
		"Definite",
		"Dat",
		"Plur",
		null,
	],
	[
		"einem Aufstieg",
		["einem", "Aufstieg"],
		"Aufstieg",
		"einem",
		"Indefinite",
		"Dat",
		"Sing",
		null,
	],
	[
		"den Hund",
		["den", "Hund"],
		"Hund",
		"den",
		"Definite",
		"Acc",
		"Sing",
		null,
	],
	[
		"der steile Aufstieg",
		["der", "Aufstieg"],
		"Aufstieg",
		"der",
		"Definite",
		"Nom",
		"Sing",
		null,
	],
	[
		"der Aufstieg und Abstieg",
		["Abstieg"],
		"Abstieg",
		"der",
		"Definite",
		"Nom",
		"Sing",
		sharedDer,
	],
	[
		"der Aufstieg und Abstieg und Umstieg",
		["Umstieg"],
		"Umstieg",
		"der",
		"Definite",
		"Nom",
		"Sing",
		sharedDer,
	],
] as const)
	test(`direct grammar preserves owned members: ${text} -> ${noun}`, async () => {
		const result = await example(
			text,
			[...members],
			noun,
			form,
			article,
			caseValue,
			number,
			"Masc",
			shared,
		).resolve();
		expect(result.members.map((member) => member.attested)).toEqual([
			...members,
		]);
		expect(result.realizationCoverage).toBe(shared ? "Partial" : "Full");
		// The Surface is the noun's own letters; the article is a member.
		expect(result.surface.normalizedSurface).toBe(members.at(-1) ?? "");
		expect(result.surface.lemma.canonicalForm).toBe(noun);
		expect(deriveNounArticle(result.surface)).toHaveProperty(
			"surface.normalizedSurface",
			form,
		);
		expect(result).toHaveProperty(
			"articleEvidence",
			shared ?? { kind: "Owned", member: 0 },
		);
	});

test("shared noun resolves first without resolving or claiming the article owner", async () => {
	const second = await example(
		"der Aufstieg und Abstieg",
		["Abstieg"],
		"Abstieg",
		"der",
		"Definite",
		"Nom",
		"Sing",
		"Masc",
		sharedDer,
	).resolve();
	const first = await example(
		"der Aufstieg und Abstieg",
		["der", "Aufstieg"],
		"Aufstieg",
		"der",
		"Definite",
	).resolve();
	expect(first.members).toHaveLength(2);
	expect(second.members).toHaveLength(1);
	expect(deriveNounArticle(second.surface)).toEqual(
		deriveNounArticle(first.surface),
	);
});

for (const determiner of ["mein", "dieser", "kein"])
	test(`${determiner} does not become a noun article`, async () => {
		const result = await example(
			`${determiner} Haus`,
			["Haus"],
			"Haus",
			"",
			"None",
			"Dat",
			"Sing",
			"Neut",
		).resolve();
		expect(result.surface).not.toHaveProperty("articleReference");
		expect(deriveNounArticle(result.surface)).toBeNull();
		expect(result.surface).toHaveProperty(
			"inflectionalFeatures.article",
			"None",
		);
		expect(result).toHaveProperty("articleEvidence", null);
		expect(result.surface.normalizedSurface).toBe("Haus");
	});

test("an owned article leaves the noun a Grundform: der Aufstieg", async () => {
	const result = await example(
		"der Aufstieg",
		["der", "Aufstieg"],
		"Aufstieg",
		"der",
		"Definite",
	).resolve();
	expect(checkIfGrundform(result.surface)).toEqual({
		success: true,
		value: true,
	});
});

test("article agreement and reference identity are validated", async () => {
	expect(() =>
		nounArticleReference({
			article: "Definite",
			spelled: "den",
			case: "Acc",
			number: "Sing",
			gender: "Neut",
		}),
	).toThrow();
	const result = await example(
		"den Hund",
		["den", "Hund"],
		"Hund",
		"den",
		"Definite",
		"Acc",
	).resolve();
	expect(
		parseUnit({ ...result.surface, articleReference: null }).success,
	).toBe(false);
	expect(parseUnit(result.surface).success).toBe(true);
	expect(parseUnit({ ...result, articleEvidence: null }).success).toBe(false);
});

test("sentence-initial article casing stays source evidence while the article cell uses its contextual form", async () => {
	const result = await example(
		"Der Aufstieg",
		["Der", "Aufstieg"],
		"Aufstieg",
		"der",
		"Definite",
	).resolve();
	expect(result.surface.normalizedSurface).toBe("Aufstieg");
	expect(result.members[0]).toEqual({
		attested: "Der",
		orthography: "Standard",
	});
	expect(result).toHaveProperty("articleEvidence", {
		kind: "Owned",
		member: 0,
	});
	expect(deriveNounArticle(result.surface)).toHaveProperty(
		"surface.normalizedSurface",
		"der",
	);
});

const fused = (spelling: string, surfaces: [string, string]) => {
	// The article piece is the last letter: m, s or r.
	const piece = spelling.length - 1;
	return {
		attested: spelling.slice(piece),
		orthography: "Fused" as const,
		fusion: {
			spelling,
			components: [
				{ span: spelling.slice(0, piece), surface: surfaces[0] },
				{ span: spelling.slice(piece), surface: surfaces[1] },
			] as [
				{ span: string; surface: string },
				{ span: string; surface: string },
			],
		},
		component: 1,
	};
};

for (const [text, noun, form, caseValue, gender, spelling, adposition] of [
	["Wir bleiben im Wald", "Wald", "dem", "Dat", "Masc", "im", "in"],
	["Wir gehen zum Wald", "Wald", "dem", "Dat", "Masc", "zum", "zu"],
	["Wir gehen ins Haus", "Haus", "das", "Acc", "Neut", "ins", "in"],
	["Im Wald bleiben wir", "Wald", "dem", "Dat", "Masc", "Im", "in"],
	["Wir bleiben im dichten Wald", "Wald", "dem", "Dat", "Masc", "im", "in"],
	["Wir gehen zur Schule", "Schule", "der", "Dat", "Fem", "zur", "zu"],
	["Er wartet aufs Ende", "Ende", "das", "Acc", "Neut", "aufs", "auf"],
] as const) {
	test(`a fused article piece is an owned Fused member: ${text}`, async () => {
		const piece = fused(spelling, [adposition, form]);
		const result = await example(
			text,
			[piece.attested, noun],
			noun,
			form,
			"Definite",
			caseValue,
			"Sing",
			gender,
			null,
			"Fused",
		).resolve();
		expect(result.surface.normalizedSurface).toBe(noun);
		expect(result.surface).toHaveProperty(
			"inflectionalFeatures.article",
			"Definite",
		);
		expect(deriveNounArticle(result.surface)).toHaveProperty(
			"surface.normalizedSurface",
			form,
		);
		expect(result.members).toEqual([
			piece,
			{ attested: noun, orthography: "Standard" },
		]);
		expect(result.realizationCoverage).toBe("Full");
		expect(result).toHaveProperty("articleEvidence", {
			kind: "Owned",
			member: 0,
		});
		expect(parseUnit(result).success).toBe(true);
	});
}

test("a noun coordinated after a fused article shares it: im Wald und Feld", async () => {
	const shared: ArticleEvidence = {
		kind: "Shared",
		article: fused("im", ["in", "dem"]),
	};
	const result = await example(
		"Wir bleiben im Wald und Feld",
		["Feld"],
		"Feld",
		"dem",
		"Definite",
		"Dat",
		"Sing",
		"Neut",
		shared,
	).resolve();
	expect(result.surface.normalizedSurface).toBe("Feld");
	expect(result.members).toEqual([
		{ attested: "Feld", orthography: "Standard" },
	]);
	expect(result.realizationCoverage).toBe("Partial");
	expect(result).toHaveProperty("articleEvidence", shared);
	expect(parseUnit(result).success).toBe(true);
});

test("a shortened article is an owned Shorthand member: Hast du 'ne Frage?", async () => {
	const result = await example(
		"Hast du 'ne Frage?",
		["'ne", "Frage"],
		"Frage",
		"eine",
		"Indefinite",
		"Acc",
		"Sing",
		"Fem",
		null,
		"Shorthand",
	).resolve();
	expect(result.members).toEqual([
		{ attested: "'ne", orthography: "Shorthand" },
		{ attested: "Frage", orthography: "Standard" },
	]);
	expect(result.surface.normalizedSurface).toBe("Frage");
	expect(result.surface).toHaveProperty(
		"inflectionalFeatures.article",
		"Indefinite",
	);
	expect(result.realizationCoverage).toBe("Full");
	expect(deriveNounArticle(result.surface)).toHaveProperty(
		"surface.normalizedSurface",
		"eine",
	);
});

test("Fused and standalone article produce the same reusable noun Surface", async () => {
	const fusedArticle = await example(
		"im Wald",
		["m", "Wald"],
		"Wald",
		"dem",
		"Definite",
		"Dat",
		"Sing",
		"Masc",
		null,
		"Fused",
	).resolve();
	const standalone = await example(
		"in dem Wald",
		["dem", "Wald"],
		"Wald",
		"dem",
		"Definite",
		"Dat",
	).resolve();
	expect(fusedArticle.surface).toEqual(standalone.surface);
	expect(fusedArticle.realizationCoverage).toBe("Full");
	expect(standalone.realizationCoverage).toBe("Full");
});

test("an unsplit fused word is rejected, not resolved without its article", async () => {
	const fixture = example(
		"Wir bleiben im Wald",
		["m", "Wald"],
		"Wald",
		"dem",
		"Definite",
		"Dat",
		"Sing",
		"Masc",
		null,
		"Fused",
	);
	const segments = fixture.encounter.sentence.segments.flatMap((segment) =>
		segment.text === "i"
			? [{ ...segment, text: "im" }]
			: segment.text === "m"
				? []
				: [segment],
	);
	const encounter = {
		sentence: { ...fixture.encounter.sentence, segments },
		target: { ...fixture.encounter.target, memberSegmentIndices: [6] },
	};
	expect(() => validateEncounter(encounter)).toThrow(/whole fused word/u);
	const result = await Effect.runPromise(
		Effect.either(
			createDumgen(grammarFixture(fixture.golden)).resolveGrammar({
				...(encounter as unknown as typeof fixture.encounter),
				contextAvailable: false,
			}),
		),
	);
	expect(result).toMatchObject({
		_tag: "Left",
		left: { _tag: "InvalidInput", stage: "resolveGrammar" },
	});
});

test("article attachment offers only complete lexical candidates", async () => {
	const fixture = example(
		"Wir bleiben im Wald",
		["m", "Wald"],
		"Wald",
		"dem",
		"Definite",
		"Dat",
		"Sing",
		"Masc",
		null,
		"Fused",
	);
	const options = grammarFixture(fixture.golden);
	const judge = options.judge;
	if (!judge) throw Error("Missing fixture judge");
	let inspected = false;
	const result = await Effect.runPromise(
		createDumgen({
			...options,
			judge: async (request, settings) => {
				if (request.questions.attachment) {
					inspected = true;
					// Attachment travels with the feature questions in one round trip.
					expect(Object.keys(request.questions)).toContain("support");
					expect(Object.keys(request.questions)).toContain(
						"surface.inflectionalFeatures.case",
					);
					// Code sets a Fused member's orthography and normalization.
					expect(Object.keys(request.questions)).not.toContain(
						"orthography_0",
					);
					expect(Object.keys(request.questions)).not.toContain(
						"normalization_0",
					);
					const question = request.questions.attachment;
					if (question.type !== "choice")
						throw Error("Expected attachment choice");
					expect(Object.keys(question.criteria)).toEqual([
						"Owned_s5",
						"None",
						"Unresolved",
					]);
					expect(question.criteria.Owned_s5).toContain("dem");
				}
				return judge(request, settings);
			},
		}).resolveGrammar({ ...fixture.encounter, contextAvailable: false }),
	);
	expect(inspected).toBe(true);
	expect(result.surface.normalizedSurface).toBe("Wald");
});

test("Fusion agreement contradictions remain Unresolved", async () => {
	const fixture = example(
		"ins Wald",
		["s", "Wald"],
		"Wald",
		"dem",
		"Definite",
		"Dat",
		"Sing",
		"Masc",
		null,
		"Fused",
	);
	await expect(fixture.resolve()).rejects.toThrow(
		"Article form and noun agreement are incompatible",
	);
});

test("unrelated Fusion evidence is optional and uncertainty is not a bare noun", async () => {
	const fixture = example(
		"Im Haus liegt Holz",
		["Holz"],
		"Holz",
		"",
		"None",
		"Nom",
		"Sing",
		"Neut",
	);
	const result = await fixture.resolve();
	expect(result.surface.normalizedSurface).toBe("Holz");
	expect(result.surface).not.toHaveProperty("articleReference");
	expect(deriveNounArticle(result.surface)).toBeNull();
	await expect(
		Effect.runPromise(
			createDumgen(
				grammarFixture(fixture.golden, { attachment: "Unresolved" }),
			).resolveGrammar({ ...fixture.encounter, contextAvailable: false }),
		),
	).rejects.toThrow("Unresolved noun article attachment");
});

test("Fusion morphology determines Case before any independent Case judgment", async () => {
	const fixture = example(
		"Wir gehen zur Schule",
		["r", "Schule"],
		"Schule",
		"der",
		"Definite",
		"Dat",
		"Sing",
		"Fem",
		null,
		"Fused",
	);
	const options = grammarFixture(fixture.golden, {
		"surface.inflectionalFeatures.case": "Gen",
	});
	const result = await Effect.runPromise(
		createDumgen(options).resolveGrammar({
			...fixture.encounter,
			contextAvailable: false,
		}),
	);
	expect(result.surface).toHaveProperty("inflectionalFeatures.case", "Dat");
	expect(deriveNounArticle(result.surface)).toHaveProperty(
		"surface.lemma.coreFeatures.case",
		"Dat",
	);
});

for (const [text, caseValue] of [
	["mit der Frau", "Dat"],
	["wegen der Frau", "Gen"],
] as const) {
	test(`syncretic standalone article retains contextual Case: ${text}`, async () => {
		const fixture = example(
			text,
			["der", "Frau"],
			"Frau",
			"der",
			"Definite",
			caseValue,
			"Sing",
			"Fem",
		);
		const options = grammarFixture(fixture.golden);
		const judge = options.judge;
		if (!judge) throw Error("Missing fixture judge");
		const traces: OperationTrace[] = [];
		let checked = false;
		const result = await Effect.runPromise(
			createDumgen({
				...options,
				onOperation: (trace) => traces.push(trace),
				judge: async (request, settings) => {
					const question =
						request.questions["surface.inflectionalFeatures.case"];
					if (question?.type === "choice") {
						checked = true;
						// The speculative Case question travels with the features
						// and offers the whole schema; code filters by the article.
						expect(Object.keys(request.questions)).toContain(
							"support",
						);
						expect(Object.keys(question.criteria).sort()).toEqual([
							"Acc",
							"Dat",
							"Gen",
							"Nom",
							"Unmarked",
							"Unresolved",
						]);
					}
					return judge(request, settings);
				},
			}).resolveGrammar({
				...fixture.encounter,
				contextAvailable: false,
			}),
		);
		expect(checked).toBe(true);
		expect(traces[0]?.calls).toHaveLength(1);
		expect(result.surface).toHaveProperty(
			"inflectionalFeatures.case",
			caseValue,
		);
	});

	test(`incompatible speculative Case falls back to a compatible-only question: ${text}`, async () => {
		const fixture = example(
			text,
			["der", "Frau"],
			"Frau",
			"der",
			"Definite",
			caseValue,
			"Sing",
			"Fem",
		);
		const options = grammarFixture(fixture.golden);
		const judge = options.judge;
		if (!judge) throw Error("Missing fixture judge");
		const traces: OperationTrace[] = [];
		const offered: string[][] = [];
		const result = await Effect.runPromise(
			createDumgen({
				...options,
				onOperation: (trace) => traces.push(trace),
				judge: async (request, settings) => {
					const question =
						request.questions["surface.inflectionalFeatures.case"];
					if (question?.type === "choice")
						offered.push(Object.keys(question.criteria).sort());
					const answered = await judge(request, settings);
					if (Object.hasOwn(request.questions, "support")) {
						// Speculative Nom contradicts the Dat/Gen article form.
						const speculative =
							answered.answers[
								"surface.inflectionalFeatures.case"
							];
						if (speculative?.type === "choice")
							return {
								...answered,
								answers: {
									...answered.answers,
									"surface.inflectionalFeatures.case": {
										...speculative,
										choice: "Nom",
									},
								},
							};
					}
					return answered;
				},
			}).resolveGrammar({
				...fixture.encounter,
				contextAvailable: false,
			}),
		);
		expect(traces[0]?.calls.map((call) => call.request.route)).toEqual([
			"de/Lexeme/NOUN/features",
			"de/Lexeme/NOUN/case",
		]);
		expect(offered[1]).toEqual(["Dat", "Gen", "Unresolved"]);
		expect(result.surface).toHaveProperty(
			"inflectionalFeatures.case",
			caseValue,
		);
	});
}

for (const [form, caseValue, number, gender] of [
	["der", "Dat", "Sing", "Fem"],
	["der", "Gen", "Sing", "Fem"],
	["dem", "Dat", "Sing", "Neut"],
	["den", "Acc", "Sing", "Masc"],
	["der", "Gen", "Plur", "Masc"],
] as const) {
	test(`${form} (${gender} ${number} ${caseValue}) is its own article cell`, () => {
		const reference = nounArticleReference({
			article: "Definite",
			case: caseValue,
			number,
			gender,
			spelled: form,
		});
		expect(reference.surface.lemma.canonicalForm).toBe(form);
		expect(reference.reading.lemma).toEqual(reference.surface.lemma);
		// Plural agreement has no gender, whatever the noun's lexical gender.
		expect(reference.surface.lemma.coreFeatures).toMatchObject({
			case: caseValue,
			number,
			gender: number === "Plur" ? null : gender,
		});
		expect(reference.surface.inflectionalFeatures).toBeNull();
	});
}

/** A proper noun on the PROPN route, with its Core `article` (ADR 0035). */
function name(
	text: string,
	members: string[],
	canonicalForm: string,
	article: "Definite" | null,
	gender: "Fem" | "Masc" | "Neut",
	caseValue: "Acc" | "Dat",
	articleOrthography: "Standard" | "Fused" = "Standard",
) {
	const segments = segmentsOf(text);
	let previous = -1;
	const indices = members.map((member) => {
		previous = segments.findIndex(
			(segment, index) => index > previous && segment.text === member,
		);
		return previous;
	});
	const encounter = validateEncounter({
		sentence: { id: "proper-noun-article", language: "de", segments },
		target: {
			family: "Lexeme",
			kind: "PROPN",
			memberSegmentIndices: indices,
		},
	});
	const owned = members.length > 1;
	const golden = {
		lemma: {
			canonicalForm,
			coreFeatures: { abbr: null, article, foreign: null, gender },
		},
		surface: {
			spelling: "Canonical",
			surfaceFeatures: null,
			inflectionalFeatures: { case: caseValue, number: "Sing" },
		},
		normalizedMembers: members.map((member, position) =>
			owned && position === 0
				? articleOrthography === "Fused"
					? "dem"
					: member.toLocaleLowerCase("de")
				: member,
		),
		memberOrthographies: members.map((_, position) =>
			owned && position === 0 ? articleOrthography : "Standard",
		),
		realizationCoverage: "Full",
		articleEvidence: owned ? { kind: "Owned", member: 0 } : null,
	};
	return (overrides: Record<string, string> = {}) =>
		Effect.runPromise(
			createDumgen(grammarFixture(golden, overrides)).resolveGrammar({
				...encounter,
				contextAvailable: false,
			}),
		);
}

test("a name cited with its article owns it: Wir fahren in die Schweiz", async () => {
	const result = await name(
		"Wir fahren in die Schweiz",
		["die", "Schweiz"],
		"Schweiz",
		"Definite",
		"Fem",
		"Acc",
	)();
	expect(
		result.members.map(({ attested, orthography }) => [
			attested,
			orthography,
		]),
	).toEqual([
		["die", "Standard"],
		["Schweiz", "Standard"],
	]);
	expect(result.realizationCoverage).toBe("Full");
	expect(result).toHaveProperty("articleEvidence", {
		kind: "Owned",
		member: 0,
	});
	expect(result.surface.normalizedSurface).toBe("Schweiz");
	expect(result.surface.lemma).toMatchObject({
		kind: "PROPN",
		canonicalForm: "Schweiz",
		coreFeatures: { article: "Definite", gender: "Fem" },
	});
	expect(result.surface).toHaveProperty("inflectionalFeatures", {
		case: "Acc",
		number: "Sing",
	});
	// Its article is derived like a noun's: die, Acc Sing Fem.
	expect(deriveNounArticle(result.surface)).toHaveProperty(
		"surface.normalizedSurface",
		"die",
	);
	expect(selectNounHeadingArticle(result.surface.lemma)).toHaveProperty(
		"lemma.canonicalForm",
		"die",
	);
});

test("a name owns the article piece of a fused word: Er badet im Rhein", async () => {
	const result = await name(
		"Er badet im Rhein",
		["m", "Rhein"],
		"Rhein",
		"Definite",
		"Masc",
		"Dat",
		"Fused",
	)();
	expect(
		result.members.map(({ attested, orthography }) => [
			attested,
			orthography,
		]),
	).toEqual([
		["m", "Fused"],
		["Rhein", "Standard"],
	]);
	expect(result.members[0]).toMatchObject({
		fusion: { spelling: "im" },
		component: 1,
	});
	expect(result.realizationCoverage).toBe("Full");
	expect(result.surface.normalizedSurface).toBe("Rhein");
	expect(deriveNounArticle(result.surface)).toHaveProperty(
		"surface.normalizedSurface",
		"dem",
	);
});

test("a name cited bare owns no article: Ich wohne in Berlin", async () => {
	const result = await name(
		"Ich wohne in Berlin",
		["Berlin"],
		"Berlin",
		null,
		"Neut",
		"Dat",
	)();
	expect(result.members.map(({ attested }) => attested)).toEqual(["Berlin"]);
	expect(result).toHaveProperty("articleEvidence", null);
	expect(result.surface.lemma.coreFeatures).toHaveProperty("article", null);
	expect(deriveNounArticle(result.surface)).toBeNull();
	expect(selectNounHeadingArticle(result.surface.lemma)).toBeNull();
});

test("an article before a name cited bare is never the name's own", async () => {
	// das alte Berlin: the article is its own DET, so a judged attachment
	// to a bare-cited name is refused rather than stored.
	const resolve = name(
		"Viele vermissen das alte Berlin",
		["das", "Berlin"],
		"Berlin",
		null,
		"Neut",
		"Acc",
	);
	await expect(resolve()).rejects.toThrow(
		"Only a name cited with its definite article owns one",
	);
});
