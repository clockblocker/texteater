import { expect, test } from "bun:test";
import { checkIfGrundform, parseUnit } from "dumling";
import { Effect } from "effect";
import { nounArticleReference } from "../src/concrete-lang/de/grammatical-resolution/noun-article.js";
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
	const reference = article
		? nounArticleReference({
				article,
				case: caseValue,
				number,
				gender,
				spelled: form,
			})
		: null;
	const golden = {
		lemma: { canonicalForm: noun, coreFeatures: { gender, hyph: null } },
		surface: {
			spelling: "Canonical",
			surfaceFeatures: null,
			inflectionalFeatures: { case: caseValue, number, article },
			articleReference: reference,
		},
		normalizedMembers: members,
		memberOrthographies: members.map(() => "Standard"),
		realizationCoverage: shared ? "Partial" : "Full",
		articleEvidence: article
			? { attested: form, orthography: "Standard" }
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
	expect(second.surface).toHaveProperty(
		"articleReference",
		"articleReference" in first.surface
			? first.surface.articleReference
			: undefined,
	);
});

for (const determiner of ["mein", "dieser", "kein", "im", "zum", "ins"])
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
		expect(result.surface).toHaveProperty("articleReference", null);
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
	const surface = structuredClone(result.surface);
	if (!("articleReference" in surface) || !surface.articleReference)
		throw Error("Missing noun reference");
	surface.articleReference.reading.lemma.canonicalForm = "die";
	expect(parseUnit(surface).success).toBe(false);
	const missing = { ...result.surface } as Record<string, unknown>;
	delete missing.articleReference;
	expect(parseUnit(missing).success).toBe(false);
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
