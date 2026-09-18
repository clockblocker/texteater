import { expect, test } from "bun:test";
import { checkIfGrundform, parseUnit } from "dumling";
import { Effect } from "effect";
import { deriveNounArticle, nounArticleReference } from "../src/index.js";
import type { OperationTrace } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { validateEncounter } from "../src/universal/validation.js";
import { grammarFixture } from "./grammar-fixture.js";

function example(
	text: string,
	members: string[],
	noun: string,
	form: string,
	article: string | null,
	caseValue = "Nom",
	number = "Sing",
	gender = "Masc",
	shared = false,
	articleSource = form,
) {
	const segments = text
		.split(/(\s+)/u)
		.filter(Boolean)
		.map((text) => ({
			text,
			kind: /^\s+$/u.test(text) ? "Whitespace" : "ResolvableText",
		}));
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
	const golden = {
		lemma: { canonicalForm: noun, coreFeatures: { gender, hyph: null } },
		surface: {
			spelling: "Canonical",
			surfaceFeatures: null,
			inflectionalFeatures: { case: caseValue, number, article },
		},
		normalizedMembers: members,
		memberOrthographies: members.map(() => "Standard"),
		realizationCoverage: shared ? "Partial" : "Full",
		articleEvidence: article
			? { attested: articleSource, orthography: "Standard" }
			: null,
	};
	return {
		encounter,
		golden,
		resolve: () =>
			Effect.runPromise(
				createDumgen(grammarFixture(golden)).resolveGrammar(encounter),
			),
	};
}

for (const [text, members, noun, form, article, caseValue, number, shared] of [
	[
		"der Aufstieg",
		["der", "Aufstieg"],
		"Aufstieg",
		"der",
		"Definite",
		"Nom",
		"Sing",
		false,
	],
	[
		"den Aufstiegen",
		["den", "Aufstiegen"],
		"Aufstieg",
		"den",
		"Definite",
		"Dat",
		"Plur",
		false,
	],
	[
		"einem Aufstieg",
		["einem", "Aufstieg"],
		"Aufstieg",
		"einem",
		"Indefinite",
		"Dat",
		"Sing",
		false,
	],
	[
		"den Hund",
		["den", "Hund"],
		"Hund",
		"den",
		"Definite",
		"Acc",
		"Sing",
		false,
	],
	[
		"der steile Aufstieg",
		["der", "Aufstieg"],
		"Aufstieg",
		"der",
		"Definite",
		"Nom",
		"Sing",
		false,
	],
	[
		"der Aufstieg und Abstieg",
		["Abstieg"],
		"Abstieg",
		"der",
		"Definite",
		"Nom",
		"Sing",
		true,
	],
	[
		"der Aufstieg und Abstieg und Umstieg",
		["Umstieg"],
		"Umstieg",
		"der",
		"Definite",
		"Nom",
		"Sing",
		true,
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
		expect(result.surface.normalizedSurface).toBe(
			`${form} ${members.at(-1)}`,
		);
		expect(result.surface.lemma.canonicalForm).toBe(noun);
		expect(checkIfGrundform(result.surface)).toEqual({
			success: true,
			value: false,
		});
		expect(result).toHaveProperty("articleEvidence", {
			attested: form,
			orthography: "Standard",
		});
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
		true,
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
			null,
			"Dat",
			"Sing",
			"Neut",
		).resolve();
		expect(result.surface).not.toHaveProperty("articleReference");
		expect(deriveNounArticle(result.surface)).toBeNull();
		expect(result.surface).toHaveProperty(
			"inflectionalFeatures.article",
			null,
		);
		expect(result.surface.normalizedSurface).toBe("Haus");
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
	expect(
		parseUnit({ ...result.surface, normalizedSurface: "das Hund" }).success,
	).toBe(false);
	expect(parseUnit(result.surface).success).toBe(true);
	expect(parseUnit({ ...result, articleEvidence: null }).success).toBe(false);
});

test("sentence-initial article casing stays source evidence while the noun Surface uses the contextual article form", async () => {
	const fixture = example(
		"Der Aufstieg",
		["Der", "Aufstieg"],
		"Aufstieg",
		"der",
		"Definite",
	);
	const result = await fixture.resolve();
	expect(result.surface.normalizedSurface).toBe("der Aufstieg");
	expect(result.members[0]).toEqual({
		attested: "Der",
		orthography: "Standard",
	});
	expect(result).toHaveProperty("articleEvidence", {
		attested: "Der",
		orthography: "Standard",
	});
});

for (const [text, noun, form, caseValue, gender, source] of [
	["Wir bleiben im Wald", "Wald", "dem", "Dat", "Masc", "im"],
	["Wir gehen zum Wald", "Wald", "dem", "Dat", "Masc", "zum"],
	["Wir gehen ins Haus", "Haus", "das", "Acc", "Neut", "ins"],
	["Im Wald bleiben wir", "Wald", "dem", "Dat", "Masc", "Im"],
	["Wir bleiben im dichten Wald", "Wald", "dem", "Dat", "Masc", "im"],
	["Wir bleiben im Wald und Feld", "Feld", "dem", "Dat", "Neut", "im"],
	["Wir gehen zur Schule", "Schule", "der", "Dat", "Fem", "zur"],
] as const) {
	test(`Fusion supplies DET without owning the source: ${text}`, async () => {
		const fixture = example(
			text,
			[noun],
			noun,
			form,
			"Definite",
			caseValue,
			"Sing",
			gender,
			true,
			source,
		);
		const result = await fixture.resolve();
		expect(result.surface.normalizedSurface).toBe(`${form} ${noun}`);
		expect(result.surface).toHaveProperty(
			"inflectionalFeatures.article",
			"Definite",
		);
		expect(deriveNounArticle(result.surface)).toHaveProperty(
			"surface.normalizedSurface",
			form,
		);
		expect(result.members).toEqual([
			{ attested: noun, orthography: "Standard" },
		]);
		expect(result.realizationCoverage).toBe("Partial");
		expect(result).toHaveProperty("articleEvidence", {
			attested: source,
			orthography: "Standard",
		});
		expect(parseUnit(result).success).toBe(true);
	});
}

test("Fusion and standalone article produce the same reusable noun Surface", async () => {
	const fused = await example(
		"im Wald",
		["Wald"],
		"Wald",
		"dem",
		"Definite",
		"Dat",
		"Sing",
		"Masc",
		true,
		"im",
	).resolve();
	const standalone = await example(
		"in dem Wald",
		["dem", "Wald"],
		"Wald",
		"dem",
		"Definite",
		"Dat",
	).resolve();
	expect(fused.surface).toEqual(standalone.surface);
	expect(fused.realizationCoverage).toBe("Partial");
	expect(standalone.realizationCoverage).toBe("Full");
});

test("article attachment offers only complete lexical candidates", async () => {
	const fixture = example(
		"Wir bleiben im Wald",
		["Wald"],
		"Wald",
		"dem",
		"Definite",
		"Dat",
		"Sing",
		"Masc",
		true,
		"im",
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
					const question = request.questions.attachment;
					if (question.type !== "choice")
						throw Error("Expected attachment choice");
					expect(Object.keys(question.criteria)).toEqual([
						"Fusion_s4",
						"None",
						"Unresolved",
					]);
					expect(question.criteria.Fusion_s4).toContain("dem");
				}
				return judge(request, settings);
			},
		}).resolveGrammar(fixture.encounter),
	);
	expect(inspected).toBe(true);
	expect(result.surface.normalizedSurface).toBe("dem Wald");
});

test("Fusion agreement contradictions remain Unresolved", async () => {
	const fixture = example(
		"ins Wald",
		["Wald"],
		"Wald",
		"dem",
		"Definite",
		"Dat",
		"Sing",
		"Masc",
		true,
		"ins",
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
		null,
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
			).resolveGrammar(fixture.encounter),
		),
	).rejects.toThrow("Unresolved noun article attachment");
});

test("Fusion morphology determines Case before any independent Case judgment", async () => {
	const fixture = example(
		"Wir gehen zur Schule",
		["Schule"],
		"Schule",
		"der",
		"Definite",
		"Dat",
		"Sing",
		"Fem",
		true,
		"zur",
	);
	const options = grammarFixture(fixture.golden, {
		"surface.inflectionalFeatures.case": "Gen",
	});
	const result = await Effect.runPromise(
		createDumgen(options).resolveGrammar(fixture.encounter),
	);
	expect(result.surface).toHaveProperty("inflectionalFeatures.case", "Dat");
	expect(deriveNounArticle(result.surface)).toHaveProperty(
		"surface.inflectionalFeatures.case",
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
			}).resolveGrammar(fixture.encounter),
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
			}).resolveGrammar(fixture.encounter),
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

for (const [form, caseValue, number, gender, owner] of [
	["der", "Dat", "Sing", "Fem", "die"],
	["der", "Gen", "Sing", "Fem", "die"],
	["dem", "Dat", "Sing", "Neut", "das"],
	["den", "Acc", "Sing", "Masc", "der"],
	["der", "Gen", "Plur", "Masc", "die"],
] as const) {
	test(`${form} (${gender} ${number} ${caseValue}) belongs to authored ${owner}`, () => {
		const reference = nounArticleReference({
			article: "Definite",
			case: caseValue,
			number,
			gender,
			spelled: form,
		});
		expect(reference.surface.lemma.canonicalForm).toBe(owner);
		expect(reference.reading.lemma).toEqual(reference.surface.lemma);
		expect(reference.surface.inflectionalFeatures).toMatchObject({
			case: caseValue,
			number,
			gender,
		});
	});
}
