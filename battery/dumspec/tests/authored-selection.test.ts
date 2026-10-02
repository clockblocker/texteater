import { describe, expect, test } from "bun:test";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import {
	type AuthoredMember,
	authoredComponent,
	authoredFor,
	authoredMembers,
	authoredReading,
	closedRoute,
	deriveGrammaticalComponent,
	selectAuthoredArticle,
	selectGrammaticalAlternatives,
	subjectExpletiveEs,
} from "../src/inventories.js";

type Core = Readonly<Record<string, unknown>>;
type NavigableLemma = Dumling.Lemma<"de", "Lexeme", "DET" | "PRON">;

/** The one authored Lexeme of this Kind and Canonical Form whose Core has these values. */
function member(kind: string, form: string, core: Core = {}): AuthoredMember {
	const found = authoredMembers.filter(
		({ lemma }) =>
			lemma.family === "Lexeme" &&
			lemma.kind === kind &&
			lemma.canonicalForm === form &&
			Object.entries(core).every(
				([name, value]) => (lemma.coreFeatures as Core)[name] === value,
			),
	);
	const [first] = found;
	if (!first || found.some(({ lemma }) => lemma !== first.lemma))
		throw Error(`Expected one authored ${kind} ${form} Lemma`);
	return first;
}
const navigable = (found: AuthoredMember) => found.lemma as NavigableLemma;
const article = (form: string, core: Core) =>
	member("DET", form, { pronType: "Art", ...core });
const forms = (readings: readonly Dumling.Reading<"de">[]) =>
	readings.map(({ lemma }) => lemma.canonicalForm);

/** Whether a Lemma marks its cell in Core, as a pillar's Paradigm Cell does. */
const isParadigmCell = ({ coreFeatures }: Dumling.Lemma) =>
	["case", "number", "gender"].some(
		(coordinate) => ((coreFeatures as Core)[coordinate] ?? null) !== null,
	);

/** A German Surface Dumling accepts. */
function surface(input: Record<string, unknown>): Dumling.Surface {
	const parsed = parseUnit({
		unitKind: "Surface",
		language: "de",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		...input,
	});
	if (!parsed.success || parsed.chain.unitKind !== "Surface")
		throw Error(`Dumling rejects ${JSON.stringify(input)}`);
	return parsed.chain.value;
}
const name = (
	canonicalForm: string,
	core: { article: "Definite" | null; gender: string | null },
	bag: Record<string, unknown> | null,
	normalizedSurface = canonicalForm,
) =>
	surface({
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "PROPN",
			canonicalForm,
			coreFeatures: core,
		},
		normalizedSurface,
		inflectionalFeatures: bag && { gender: null, ...bag },
	});
const geben = (expletive: "Subject" | null) =>
	surface({
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "geben",
			coreFeatures: { hasSepPrefix: null, lexicallyReflexive: null },
		},
		normalizedSurface: expletive ? "es gab" : "gab",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
			expletive,
			perfect: null,
			future: null,
			voice: null,
			passive: null,
		},
	});

describe("authored members by Reading and Lemma", () => {
	test("every authored Reading and Lemma finds its member", () => {
		for (const found of authoredMembers) {
			expect(authoredReading(structuredClone(found.reading))).toBe(found);
			expect(authoredFor(structuredClone(found.lemma))).toContain(found);
		}
	});

	test("a Lemma finds each of its Readings, and nothing else finds one", () => {
		const es = subjectExpletiveEs.lemma;
		expect(authoredFor(es).map(({ reading }) => reading)).toContainEqual(
			subjectExpletiveEs.reading,
		);
		expect(authoredFor(es).length).toBeGreaterThan(1);
		expect(
			authoredReading({
				...subjectExpletiveEs.reading,
				emojiDescription: "🦄",
			}),
		).toBeUndefined();
		expect(authoredFor({ ...es, canonicalForm: "Es" })).toEqual([]);
	});

	test("an article Reading selects its cell, and any other Reading none", () => {
		const der = article("der", {
			case: "Nom",
			number: "Sing",
			gender: "Masc",
		});
		expect(selectAuthoredArticle(der.reading)).toBe(der);
		expect(selectAuthoredArticle(subjectExpletiveEs.reading)).toBeNull();
		expect(
			selectAuthoredArticle({ ...der.reading, emojiDescription: "🦄" }),
		).toBeNull();
	});

	test("German Lexeme AUX, DET and PRON are the Closed Routes", () => {
		const route = (language: string, family: string, kind: string) =>
			closedRoute({ language, family, kind });
		for (const kind of ["AUX", "DET", "PRON"])
			expect(route("de", "Lexeme", kind)).toBe(true);
		expect(route("de", "Lexeme", "NOUN")).toBe(false);
		expect(route("de", "Lexeme", "ADV")).toBe(false);
		expect(route("de", "Locution", "PRON")).toBe(false);
		expect(route("en", "Lexeme", "DET")).toBe(false);
	});
});

describe("grammatical navigation", () => {
	test("a pillar cell varies one coordinate and keeps the rest", () => {
		const er = navigable(member("PRON", "er", { pronType: "Prs" }));
		expect(
			forms(
				selectGrammaticalAlternatives({ source: er, vary: ["case"] }),
			),
		).toEqual(["ihn", "ihm", "seiner"]);
		const wer = navigable(member("PRON", "wer", { pronType: "Int" }));
		expect(
			forms(
				selectGrammaticalAlternatives({
					source: wer,
					vary: ["gender"],
				}),
			),
		).toEqual(["was"]);
	});

	test("a gender-null cell is reached from the gender it serves, never from another", () => {
		const es = navigable(
			member("PRON", "es", { pronType: "Prs", case: "Nom" }),
		);
		expect(
			forms(
				selectGrammaticalAlternatives({ source: es, vary: ["case"] }),
			),
		).toContain("ihm");
		const die = navigable(
			article("die", { case: "Nom", number: "Sing", gender: "Fem" }),
		);
		const dative = forms(
			selectGrammaticalAlternatives({ source: die, vary: ["case"] }),
		);
		expect(dative).toContain("der");
		expect(dative).not.toContain("dem");
	});

	test("a stem, an unmarked coordinate and an unauthored Lemma reach nothing", () => {
		for (const kind of ["DET", "PRON"]) {
			const dieser = navigable(member(kind, "dieser"));
			expect(
				selectGrammaticalAlternatives({
					source: dieser,
					vary: ["case", "number", "gender"],
				}),
			).toEqual([]);
		}
		const man = navigable(member("PRON", "man"));
		expect(man.coreFeatures).toMatchObject({ case: null });
		expect(
			selectGrammaticalAlternatives({ source: man, vary: ["case"] }),
		).toEqual([]);
		const er = navigable(member("PRON", "er", { pronType: "Prs" }));
		expect(
			selectGrammaticalAlternatives({
				source: { ...er, canonicalForm: "err" },
				vary: ["case"],
			}),
		).toEqual([]);
	});

	test("pillar navigation never lands on a stem Lemma", () => {
		for (const { lemma } of authoredMembers) {
			if (lemma.kind !== "DET" && lemma.kind !== "PRON") continue;
			if (!isParadigmCell(lemma)) continue;
			for (const reading of selectGrammaticalAlternatives({
				source: lemma as NavigableLemma,
				vary: ["case", "number"],
			}))
				expect(
					isParadigmCell(reading.lemma),
					reading.lemma.canonicalForm,
				).toBe(true);
		}
	});

	test("a coordinate the source's Core lacks throws", () => {
		const der = navigable(
			article("der", { case: "Nom", number: "Sing", gender: "Masc" }),
		);
		expect(() =>
			selectGrammaticalAlternatives({
				source: der,
				vary: ["reflex" as "case"],
			}),
		).toThrow("Unknown feature coordinate.");
	});
});

describe("grammatical components", () => {
	test("every article cell and es is a component Dumling parses unchanged", () => {
		const components = authoredMembers.filter(
			({ lemma }) =>
				lemma.kind === "DET" &&
				(lemma.coreFeatures as Core).pronType === "Art",
		);
		expect(components.length).toBeGreaterThan(20);
		for (const found of [...components, subjectExpletiveEs]) {
			const component = authoredComponent(found);
			expect(found.reading).toEqual(component.reading);
			expect(found.lemma).toEqual(component.surface.lemma);
			expect(component.surface.lemma).not.toBe(found.lemma);
			for (const unit of [component.surface, component.reading]) {
				const parsed = parseUnit(unit);
				expect(parsed.success && parsed.chain.value).toEqual(unit);
			}
		}
	});

	test("only a DET or PRON Lexeme is a component", () => {
		const auxiliary = authoredMembers.find(
			({ lemma }) => lemma.kind === "AUX",
		);
		if (!auxiliary) throw Error("Expected an authored AUX");
		expect(() => authoredComponent(auxiliary)).toThrow(
			"A grammatical component is a DET or PRON Lexeme.",
		);
	});

	test("a name cited with its article brings the der cell of its case", () => {
		const schweiz = { article: "Definite", gender: "Fem" } as const;
		const dative = deriveGrammaticalComponent(
			name("Schweiz", schweiz, { case: "Dat", number: "Sing" }),
		);
		expect(authoredReading(dative?.reading)).toBe(
			article("der", { case: "Dat", number: "Sing", gender: "Fem" }),
		);
		expect(dative?.surface.normalizedSurface).toBe("der");
		const plural = deriveGrammaticalComponent(
			name(
				"Niederlande",
				{ article: "Definite", gender: null },
				{ case: "Dat", number: "Plur" },
				"Niederlanden",
			),
		);
		expect(authoredReading(plural?.reading)).toBe(
			article("den", { case: "Dat", number: "Plur" }),
		);
	});

	test("every case, number and gender of a name has a reviewed der cell", () => {
		const cells = [
			...["Masc", "Fem", "Neut"].map((gender) => ({
				number: "Sing",
				gender,
			})),
			{ number: "Plur", gender: null },
		];
		for (const grammaticalCase of ["Nom", "Acc", "Dat", "Gen"])
			for (const { number, gender } of cells)
				expect(
					deriveGrammaticalComponent(
						name(
							"Schweiz",
							{ article: "Definite", gender },
							{ case: grammaticalCase, number },
						),
					)?.reading.lemma.coreFeatures,
				).toMatchObject({
					case: grammaticalCase,
					number,
					pronType: "Art",
				});
	});

	test("a name without its article or case, and a name without number, bring none or throw", () => {
		expect(
			deriveGrammaticalComponent(
				name(
					"Anna",
					{ article: null, gender: "Fem" },
					{ case: "Dat", number: "Sing" },
				),
			),
		).toBeNull();
		expect(
			deriveGrammaticalComponent(
				name("Schweiz", { article: "Definite", gender: "Fem" }, null),
			),
		).toBeNull();
		expect(() =>
			deriveGrammaticalComponent(
				name(
					"Schweiz",
					{ article: "Definite", gender: "Fem" },
					{ case: "Dat", number: null },
				),
			),
		).toThrow("An article needs its name's number.");
	});

	test("a verb with a subject expletive brings nonreferential es", () => {
		const component = deriveGrammaticalComponent(geben("Subject"));
		expect(authoredReading(component?.reading)).toBe(subjectExpletiveEs);
		expect(component?.surface.normalizedSurface).toBe("es");
		expect(deriveGrammaticalComponent(geben(null))).toBeNull();
	});
});
