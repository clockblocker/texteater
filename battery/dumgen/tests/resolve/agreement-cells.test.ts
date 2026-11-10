import { expect, test } from "bun:test";
import {
	determinerCells,
	endingCells,
} from "../../src/resolve/de/open-route/paradigm.js";
import type { JevAsk } from "../../src/segment/jev.js";
import {
	attested,
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	unitOf,
	writes,
} from "./support.js";

// The phrase's paradigm read both ways (#1339): the cells a phrase allows
// narrow its case question, and turn jev's number and gender into a case,
// or its case into a number, when the triple jev answered is no cell.

const cell = (cells: ReturnType<typeof endingCells>) =>
	(cells ?? []).map(
		({ case: grammaticalCase, number, gender }) =>
			`${grammaticalCase}.${number}${gender ? `.${gender}` : ""}`,
	);

test("a determiner's authored cells and an attributive ending are cells, not cases", () => {
	expect(cell(determinerCells("den"))).toEqual(["Acc.Sing.Masc", "Dat.Plur"]);
	expect(cell(determinerCells("des"))).toEqual([
		"Gen.Sing.Masc",
		"Gen.Sing.Neut",
	]);
	expect(cell(endingCells("getrocknetem"))).toEqual([
		"Dat.Sing.Masc",
		"Dat.Sing.Neut",
	]);
	// -en is no nominative singular in any declension.
	expect(
		cell(endingCells("kleinen")).filter((one) => one.startsWith("Nom")),
	).toEqual(["Nom.Plur"]);
});

/** A jev that answers `answers` and gives `weights` to the Choices it names. */
function weightedJev(
	answers: Readonly<Record<string, string>>,
	weights: Readonly<Record<string, Readonly<Record<string, number>>>>,
) {
	const fake = fakeJev(answers);
	const ask: JevAsk = async (request, context) => {
		const response = await fake.ask(request, context);
		const weighted = { ...response.answers };
		for (const [id, probabilities] of Object.entries(weights))
			if (id in weighted)
				weighted[id] = {
					type: "choice",
					choice: answers[id] ?? "",
					confidence: probabilities[answers[id] ?? ""] ?? 0,
					probabilities,
				};
		return { ...response, answers: weighted };
	};
	return { ...fake, ask };
}

const adjective = { comparable: "No", attributive: "Yes" } as const;

test("den with a plural noun is Dat, whatever case jev answered", async () => {
	// in0 _1 den2 _3 großen4 _5 Gärten6 .7
	const units = [
		unitOf([0], "Lexeme/ADP"),
		unitOf([2, 6], "Lexeme/NOUN"),
		unitOf([4], "Lexeme/ADJ"),
	];
	const jev = weightedJev(
		{
			...adjective,
			"agreement.case": "Acc",
			"agreement.gender": "Unmarked",
			"agreement.number": "Plur",
		},
		{ "agreement.case": { Acc: 0.7, Dat: 0.3 } },
	);
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("groß").ask },
		{
			sentence: { ...sentenceOf("in den großen Gärten."), units },
			unit: unitOf([4], "Lexeme/ADJ"),
		},
	);
	expect(attested(result).surface).toMatchObject({
		inflectionalFeatures: { case: "Dat", gender: null, number: "Plur" },
	});
});

test("des is singular, so a plural answer gives way to the gender jev weighed likeliest", async () => {
	// trotz0 _1 des2 _3 starken4 _5 Regens6 .7
	const units = [
		unitOf([0], "Lexeme/ADP"),
		unitOf([2, 6], "Lexeme/NOUN"),
		unitOf([4], "Lexeme/ADJ"),
	];
	const jev = weightedJev(
		{
			...adjective,
			"agreement.gender": "Unmarked",
			"agreement.number": "Plur",
		},
		{
			"agreement.gender": { Unmarked: 0.6, Masc: 0.3, Neut: 0.1 },
			"agreement.number": { Plur: 0.6, Sing: 0.4 },
		},
	);
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("stark").ask },
		{
			sentence: { ...sentenceOf("trotz des starken Regens."), units },
			unit: unitOf([4], "Lexeme/ADJ"),
		},
	);
	expect(attested(result).surface).toMatchObject({
		inflectionalFeatures: { case: "Gen", gender: "Masc", number: "Sing" },
	});
	// des leaves Gen alone: no case question.
	expect(jev.questions("grammar")).not.toContain("agreement.case");
});

test("a singular with no gender takes the likeliest gender its ending leaves", async () => {
	// mit0 _1 getrocknetem2 _3 Schnittlauch4 .5
	const units = [
		unitOf([0], "Lexeme/ADP"),
		unitOf([2], "Lexeme/ADJ"),
		unitOf([4], "Lexeme/NOUN"),
	];
	const jev = weightedJev(
		{
			...adjective,
			"agreement.gender": "Unmarked",
			"agreement.number": "Sing",
		},
		{
			"agreement.gender": {
				Unmarked: 0.5,
				Fem: 0.3,
				Masc: 0.15,
				Neut: 0.05,
			},
		},
	);
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("getrocknet").ask },
		{
			sentence: {
				...sentenceOf("mit getrocknetem Schnittlauch."),
				units,
			},
			unit: unitOf([2], "Lexeme/ADJ"),
		},
	);
	// -em is Masc or Neut, never Fem.
	expect(attested(result).surface).toMatchObject({
		inflectionalFeatures: { case: "Dat", gender: "Masc", number: "Sing" },
	});
});

test("a phrase after und shares its case with the conjunct before it, whose preposition its governor's unit holds", async () => {
	// sehnen0 _1 sich2 _3 nach4 _5 etwas6 _7 Ruhe8 _9 und10 _11 stillen12 _13 Nächten14 .15
	const units = [
		unitOf([0, 2, 4], "Lexeme/VERB"),
		unitOf([6], "Lexeme/DET"),
		unitOf([8], "Lexeme/NOUN"),
		unitOf([10], "Lexeme/CCONJ"),
		unitOf([12], "Lexeme/ADJ"),
		unitOf([14], "Lexeme/NOUN"),
	];
	const jev = fakeJev({
		...adjective,
		"agreement.gender": "Unmarked",
		"agreement.number": "Plur",
	});
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("still").ask },
		{
			sentence: {
				...sentenceOf(
					"sehnen sich nach etwas Ruhe und stillen Nächten.",
				),
				units,
			},
			unit: unitOf([12], "Lexeme/ADJ"),
		},
	);
	expect(attested(result).surface).toMatchObject({
		inflectionalFeatures: { case: "Dat", number: "Plur" },
	});
	expect(jev.questions("grammar")).not.toContain("agreement.case");
});

test("a closed determiner's cells are the ones its phrase allows: mit den is Dat.Plur, asked nothing", async () => {
	// mit0 _1 den2 _3 Kindern4 .5
	const units = [
		unitOf([0], "Lexeme/ADP"),
		unitOf([2], "Lexeme/DET", {
			kind: "DET",
			canonicalForm: "den",
			pronType: "Art",
		}),
		unitOf([4], "Lexeme/NOUN"),
	];
	const jev = fakeJev();
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: fakeLuna().ask },
		{
			sentence: { ...sentenceOf("mit den Kindern."), units },
			unit: units[1] ?? unitOf([2], "Lexeme/DET"),
		},
	);
	expect(attested(result).surface.lemma.coreFeatures).toMatchObject({
		case: "Dat",
		number: "Plur",
	});
	expect(jev.sent).toEqual([]);
});

test("the attribute after a closed determiner narrows its cells: die kleinen is plural", async () => {
	// die0 _1 kleinen2 _3 Kinder4 _5 lachen6 .7
	const units = [
		unitOf([0], "Lexeme/DET", {
			kind: "DET",
			canonicalForm: "die",
			pronType: "Art",
		}),
		unitOf([2], "Lexeme/ADJ"),
		unitOf([4], "Lexeme/NOUN"),
		unitOf([6], "Lexeme/VERB"),
	];
	const jev = fakeJev();
	await resolveOnce(
		{ jev: jev.ask, luna: fakeLuna().ask },
		{
			sentence: { ...sentenceOf("die kleinen Kinder lachen."), units },
			unit: units[0] ?? unitOf([0], "Lexeme/DET"),
		},
	);
	const asked = jev.sent[0]?.questions.cell;
	const offered =
		asked?.type === "choice"
			? Object.values(asked.criteria)
					.map(String)
					.filter((text) => text.startsWith("die"))
			: [];
	expect(offered.length).toBe(2);
	expect(offered.every((text) => text.includes("plural"))).toBe(true);
});
