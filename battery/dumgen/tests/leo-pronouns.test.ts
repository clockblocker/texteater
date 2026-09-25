import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { Effect } from "effect";
import { authoredMembers } from "../src/concrete-lang/de/authored-closed-sets/inventory.js";
import { locateAuthoredIdentity } from "../src/concrete-lang/de/authored-closed-sets/realizations.js";
import { targetCriteria } from "../src/concrete-lang/de/target-classification/judgments.js";
import { grammarFixture } from "../src/testing.js";
import type { OperationTrace } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { validateEncounter } from "../src/universal/validation.js";

type Core = Dumling.Lemma<"de", "Lexeme", "PRON">["coreFeatures"];
const core = (features: Partial<Core>): Core => ({
	case: null,
	number: null,
	gender: null,
	extPos: null,
	foreign: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
	...features,
});
const possessive: Partial<Core> = {
	pronType: "Prs",
	poss: "Yes",
	person: "1",
};
type Cell = Pick<Core, "case" | "number"> & {
	gender: "Masc" | "Neut" | "Fem" | null;
	"gender[psor]": readonly string[] | null;
	"number[psor]": "Sing" | "Plur" | null;
};
const lookup = (spelled: string, features: Partial<Core>) =>
	locateAuthoredIdentity({
		kind: "PRON",
		spelled,
		core: core(features),
		inflection: null,
	});
/** A stem pronoun's cell is Surface inflection (system ADR 0032). */
const surfaceBag = (cell: Partial<Cell>) => ({
	case: null,
	gender: null,
	number: null,
	"gender[psor]": null,
	"number[psor]": null,
	reflex: null,
	...cell,
});
const lookupStem = (
	spelled: string,
	features: Partial<Core>,
	cell: Partial<Cell>,
) =>
	locateAuthoredIdentity({
		kind: "PRON",
		spelled,
		core: core(features),
		inflection: surfaceBag(cell),
	});

// Independently stated grammatical expectations, including syncretism and defective cells.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/index.xml?lang=de
// A pillar names its cell in Core features; a stem (dieser, keiner, meiner)
// names it in `cell` and cites one Lemma for every form.
const examples: readonly {
	text: string;
	canonical: string;
	context: string;
	features: Partial<Core>;
	cell?: Partial<Cell>;
	/** A licensed alternate spelling of the cell, not inflection alone. */
	variant?: boolean;
}[] = [
	{
		text: "diesem",
		canonical: "dieser",
		context: "Von den beiden Entwürfen vertraue ich diesem.",
		features: {
			pronType: "Dem",
		},
		cell: { case: "Dat", number: "Sing", gender: "Masc" },
	},
	{
		text: "denselben",
		canonical: "derselbe",
		context:
			"Die Leute von gestern? Mit denselben habe ich heute gesprochen.",
		features: { pronType: "Dem" },
		cell: { case: "Dat", number: "Plur" },
	},
	{
		text: "denjenigen",
		canonical: "derjenige",
		context: "Denjenigen, die warten, gebe ich Bescheid.",
		features: { pronType: "Dem" },
		cell: { case: "Dat", number: "Plur" },
	},
	{
		text: "welchen",
		canonical: "welcher",
		context: "Zwei Männer warten. Welchen kennst du?",
		features: {
			pronType: "Int",
		},
		cell: { case: "Acc", number: "Sing", gender: "Masc" },
	},
	{
		text: "welchen",
		canonical: "welcher",
		context: "Die Männer, welchen ich half, gingen.",
		features: { pronType: "Rel" },
		cell: { case: "Dat", number: "Plur" },
	},
	{
		text: "wer",
		canonical: "wer",
		context: "Wer helfen will, kommt mit.",
		features: { pronType: "Rel", case: "Nom", gender: "Masc" },
	},
	{
		text: "was",
		canonical: "was",
		context: "Nimm, was du brauchst.",
		features: { pronType: "Rel", case: "Acc", gender: "Neut" },
	},
	{
		text: "was",
		canonical: "was",
		context: "Was brauchst du?",
		features: { pronType: "Int", case: "Acc", gender: "Neut" },
	},
	{
		text: "derer",
		canonical: "derer",
		context: "Die Namen derer, die warten, fehlen.",
		features: { pronType: "Dem", case: "Gen", number: "Plur" },
	},
	{
		text: "derer",
		canonical: "deren",
		context: "Die Opfer, derer wir gedenken, sind unvergessen.",
		features: { pronType: "Rel", case: "Gen", number: "Plur" },
	},
	{
		text: "dessen",
		canonical: "dessen",
		context: "Der Mann, dessen Kinder ich kenne, wartet.",
		features: {
			pronType: "Rel",
			extPos: "DET",
			case: "Gen",
			number: "Sing",
			gender: "Masc",
		},
	},
	{
		text: "deren",
		canonical: "deren",
		context: "Die Frau, deren Kinder ich kenne, wartet.",
		features: {
			pronType: "Rel",
			extPos: "DET",
			case: "Gen",
			number: "Sing",
			gender: "Fem",
		},
	},
	{
		text: "wessen",
		canonical: "wessen",
		context: "Wessen Kinder kennst du?",
		features: {
			pronType: "Int",
			extPos: "DET",
			case: "Gen",
			gender: "Masc",
		},
	},
	{
		text: "manche",
		canonical: "mancher",
		context: "Manche kamen zu spät.",
		features: { pronType: "Ind" },
		cell: { case: "Nom", number: "Plur" },
	},
	{
		text: "mehreren",
		canonical: "mehrere",
		context: "Ich helfe mehreren.",
		features: { pronType: "Ind" },
		cell: { case: "Dat", number: "Plur" },
	},
	{
		text: "einigen",
		canonical: "einige",
		context: "Ich helfe einigen.",
		features: { pronType: "Ind" },
		cell: { case: "Dat", number: "Plur" },
	},
	{
		text: "keins",
		canonical: "keiner",
		context: "Von diesen Büchern kenne ich keins.",
		features: {
			pronType: "Neg",
		},
		cell: { case: "Acc", number: "Sing", gender: "Neut" },
		variant: true,
	},
	{
		text: "irgendeins",
		canonical: "irgendeiner",
		context: "Von diesen Büchern brauche ich irgendeins.",
		features: {
			pronType: "Ind",
		},
		cell: { case: "Acc", number: "Sing", gender: "Neut" },
		variant: true,
	},
	{
		text: "jemands",
		canonical: "jemandes",
		context: "Das ist jemands Tasche.",
		features: { pronType: "Ind", case: "Gen", number: "Sing" },
	},
	{
		text: "niemands",
		canonical: "niemandes",
		context: "Das ist niemands Schuld.",
		features: { pronType: "Neg", case: "Gen", number: "Sing" },
	},
	{
		text: "irgendjemand",
		canonical: "irgendjemand",
		context: "Ich muss mit irgendjemand sprechen.",
		features: { pronType: "Ind" },
		cell: { case: "Dat", number: "Sing" },
		variant: true,
	},
	{
		text: "man",
		canonical: "man",
		context: "Hier kann man warten.",
		features: { pronType: "Ind", number: "Sing" },
	},
	{
		text: "etwas",
		canonical: "etwas",
		context: "Ich brauche etwas.",
		features: { pronType: "Ind" },
	},
	{
		text: "jedermanns",
		canonical: "jedermanns",
		context: "Das ist jedermanns Recht.",
		features: { pronType: "Tot", case: "Gen", number: "Sing" },
	},
	{
		text: "beidem",
		canonical: "beide",
		context: "Mit beidem bin ich zufrieden.",
		features: {
			pronType: "Tot",
		},
		cell: { case: "Dat", number: "Sing", gender: "Neut" },
	},
	{
		text: "meins",
		canonical: "meiner",
		context: "Dieses Buch ist meins.",
		features: {
			...possessive,
		},
		cell: {
			case: "Nom",
			number: "Sing",
			gender: "Neut",
			"number[psor]": "Sing",
		},
		variant: true,
	},
	{
		text: "meine",
		canonical: "meiner",
		context: "Dein Wagen und der meine stehen draußen.",
		features: {
			...possessive,
		},
		cell: {
			case: "Nom",
			number: "Sing",
			gender: "Masc",
			"number[psor]": "Sing",
		},
	},
	{
		text: "meinige",
		canonical: "meinige",
		context: "Dein Wagen und der meinige stehen draußen.",
		features: {
			...possessive,
		},
		cell: {
			case: "Nom",
			number: "Sing",
			gender: "Masc",
			"number[psor]": "Sing",
		},
	},
	{
		text: "unsrem",
		canonical: "unserer",
		context: "Du fährst mit deinem Wagen, ich mit unsrem.",
		features: {
			...possessive,
		},
		cell: {
			case: "Dat",
			number: "Sing",
			gender: "Masc",
			"number[psor]": "Plur",
		},
		variant: true,
	},
	{
		text: "euerem",
		canonical: "eurer",
		context: "Wir fahren mit unserem Wagen, ihr mit euerem.",
		features: {
			pronType: "Prs",
			poss: "Yes",
			person: "2",
			polite: "Infm",
		},
		cell: {
			case: "Dat",
			number: "Sing",
			gender: "Masc",
			"number[psor]": "Plur",
		},
		variant: true,
	},
	{
		text: "Ihres",
		canonical: "Ihrer",
		context: "Frau Meier, dieses Buch ist Ihres.",
		features: {
			pronType: "Prs",
			poss: "Yes",
			person: "2",
			polite: "Form",
		},
		cell: { case: "Nom", number: "Sing", gender: "Neut" },
	},
	{
		text: "was für welche",
		canonical: "was für einer",
		context: "Du suchst Bücher. Was für welche brauchst du?",
		features: { pronType: "Int" },
		cell: { case: "Acc", number: "Plur" },
	},
];

for (const example of examples) {
	test(`${example.context} — reviewed ${example.canonical}`, async () => {
		const located = example.cell
			? lookupStem(example.text, example.features, example.cell)
			: lookup(example.text, example.features);
		expect(located.status).toBe("Hit");
		expect(located.matches).toHaveLength(1);
		const member = located.matches[0];
		if (!member) throw Error("Expected reviewed member");
		expect(member.lemma.canonicalForm).toBe(example.canonical);
		expect(parseUnit(member.lemma).success).toBe(true);
		const normalizedMembers = example.text.split(" ");
		const targetOffset = example.context
			.toLocaleLowerCase("de")
			.indexOf(example.text.toLocaleLowerCase("de"));
		expect(targetOffset).toBeGreaterThanOrEqual(0);
		// Use normalized target casing so this fixture isolates authored identity lookup.
		const prefix = example.context.slice(0, targetOffset);
		const suffix = example.context.slice(
			targetOffset + example.text.length,
		);
		const expected = {
			lemma: {
				canonicalForm: example.canonical,
				coreFeatures: core(example.features),
			},
			surface: {
				spelling:
					example.variant ||
					(!example.cell && example.text !== example.canonical)
						? ("Variant" as const)
						: ("Canonical" as const),
				surfaceFeatures: null,
				inflectionalFeatures: example.cell
					? surfaceBag(example.cell)
					: null,
			},
			normalizedMembers,
			memberOrthographies: normalizedMembers.map(() => "Standard"),
			realizationCoverage: "Full",
		};
		const traces: OperationTrace[] = [];
		const dumgen = createDumgen({
			...grammarFixture(expected),
			onOperation: (trace) => traces.push(trace),
			execute: async () => {
				throw Error("Reviewed forms must not need text generation");
			},
		});
		const result = await Effect.runPromise(
			dumgen.resolveGrammar(
				validateEncounter({
					sentence: {
						id: example.context,
						language: "de",
						segments: [
							...(prefix
								? [{ kind: "OpaqueText", text: prefix }]
								: []),
							...normalizedMembers.flatMap((text, index) => [
								{ kind: "ResolvableText", text },
								{
									kind: "OpaqueText",
									text:
										index < normalizedMembers.length - 1
											? " "
											: suffix,
								},
							]),
						],
					},
					target: {
						family: "Lexeme",
						kind: "PRON",
						memberSegmentIndices: normalizedMembers.map(
							(_, index) => index * 2 + (prefix ? 1 : 0),
						),
					},
				}),
			),
		);
		expect(result.surface.lemma).toEqual(member.lemma);
		expect(
			"inflectionalFeatures" in result.surface
				? result.surface.inflectionalFeatures
				: undefined,
		).toEqual(expected.surface.inflectionalFeatures);
		expect(result.surface.spelling).toBe(expected.surface.spelling);
		expect(
			traces
				.flatMap((trace) => trace.events)
				.some((event) => event.kind === "AuthoredPopulationMiss"),
		).toBe(false);
	});
}

// LEO tables contain deliberate holes; a stem+ending product would get these wrong.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/RelInter/Pron-welcher3.xml?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-jeder3.html?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/e-Tilgung.html?lang=de
test("unlicensed cells and shortened genitives are absent", () => {
	for (const [text, features, cell] of [
		["welches", { pronType: "Rel" }, { case: "Gen", gender: "Neut" }],
		["mehrere", { pronType: "Ind" }, { case: "Nom", gender: "Fem" }],
		["mehrere", { pronType: "Tot" }, { case: "Nom", number: "Plur" }],
		["jedes", { pronType: "Tot" }, { case: "Gen", gender: "Masc" }],
		["beides", { pronType: "Tot" }, { case: "Gen", gender: "Neut" }],
		["meins", possessive, { case: "Gen", gender: "Neut" }],
	] satisfies [string, Partial<Core>, Partial<Cell>][])
		expect(
			lookupStem(text, features, { number: "Sing", ...cell }).matches,
			text,
		).toEqual([]);
	for (const [text, features] of [
		["der", { pronType: "Rel", case: "Gen", number: "Plur" }],
		[
			"der",
			{ pronType: "Dem", case: "Gen", number: "Sing", gender: "Fem" },
		],
		[
			"derer",
			{ pronType: "Rel", case: "Gen", number: "Plur", extPos: "DET" },
		],
		["was", { pronType: "Int", case: "Dat" }],
		["man", { pronType: "Ind", case: "Nom", number: "Sing" }],
		[
			"eins",
			{ pronType: "Ind", case: "Gen", number: "Sing", gender: "Neut" },
		],
	] satisfies [string, Partial<Core>][])
		expect(lookup(text, features).matches, text).toEqual([]);
});

test("a judged er or es gender finds the one ihm and seiner Lemma", () => {
	for (const [spelled, grammaticalCase] of [
		["ihm", "Dat"],
		["seiner", "Gen"],
	] as const)
		for (const gender of [
			"Masc",
			"Neut",
			["Masc", "Neut"],
		] satisfies Core["gender"][]) {
			const located = lookup(spelled, {
				pronType: "Prs",
				person: "3",
				number: "Sing",
				case: grammaticalCase,
				gender,
			});
			expect(located.status, `${spelled} ${String(gender)}`).toBe("Hit");
			const [hit] = located.matches;
			if (!hit) throw Error("Expected the merged Lemma");
			expect((hit.lemma.coreFeatures as Partial<Core>).gender).toEqual([
				"Masc",
				"Neut",
			]);
		}
});

test("same-spelling forms preserve case and article function, not the possessor", () => {
	// seiner serves a masculine or neuter possessor (his, its) and ihrer a
	// feminine or plural one (hers, theirs): one Lemma each.
	const nominative = { gender: "Masc", number: "Sing", case: "Nom" } as const;
	for (const spelled of ["seiner", "ihrer"])
		expect(
			lookupStem(
				spelled,
				{ pronType: "Prs", poss: "Yes", person: "3" },
				nominative,
			).matches,
			spelled,
		).toHaveLength(1);
	for (const grammaticalCase of ["Nom", "Acc"] as const)
		expect(
			lookupStem("meins", possessive, {
				case: grammaticalCase,
				gender: "Neut",
				number: "Sing",
			}).matches,
		).toHaveLength(1);
	expect(
		lookupStem("meins", possessive, { gender: "Neut", number: "Sing" })
			.matches,
	).toHaveLength(0);
	const relative = lookup("deren", {
		pronType: "Rel",
		case: "Gen",
		number: "Sing",
		gender: "Fem",
		extPos: "DET",
	}).matches[0];
	expect(relative?.lemma.coreFeatures).toMatchObject({
		case: "Gen",
		number: "Sing",
		gender: "Fem",
		poss: null,
	});
	// Boundary guidance must reach the production classifier, not only the catalog.
	expect(targetCriteria).toContain(
		"Attributive genitives dessen/deren/wessen are also PRON",
	);
	expect(targetCriteria).toContain(
		"separate DET article and PRON meine/meinige",
	);
});

test("DET reductions and plural was für are Surfaces of their stem Lemma", () => {
	for (const [canonical, spelled, cell] of [
		["unser", "unsre", { case: "Nom", number: "Sing", gender: "Fem" }],
		["unser", "unserm", { case: "Dat", number: "Sing", gender: "Masc" }],
		["euer", "euere", { case: "Nom", number: "Sing", gender: "Fem" }],
		["euer", "euerm", { case: "Dat", number: "Sing", gender: "Masc" }],
		[
			"was für ein",
			"was für",
			{ case: "Nom", number: "Plur", gender: null },
		],
	] as const) {
		const member = authoredMembers.find(
			({ lemma }) =>
				lemma.kind === "DET" && lemma.canonicalForm === canonical,
		);
		if (!member) throw Error("Missing determiner fixture");
		expect(
			locateAuthoredIdentity({
				kind: "DET",
				spelled,
				core: member.lemma.coreFeatures,
				inflection: {
					degree: null,
					"gender[psor]": null,
					"number[psor]": null,
					...cell,
				},
			}).matches,
		).toEqual([member]);
	}
});
