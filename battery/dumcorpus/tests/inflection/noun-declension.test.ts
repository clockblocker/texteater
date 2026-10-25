import { describe, expect, it } from "bun:test";

import type { Gender } from "../../src/inflection/de/articles.js";
import { nDeclensionUnknown } from "../../src/inflection/de/noun-declension.js";
import {
	cellsOf,
	lines,
	noun,
	type Parts,
	pack,
	selectionOf,
} from "./support.js";

/**
 * The 5 Flexion tables of the dev vault's generated entries (filler-de#62),
 * as filler-de#75 tested them. Each holds 8 cells.
 */
const VAULT_TABLES: readonly {
	readonly lemma: string;
	readonly gender: Gender;
	readonly plural: string;
	readonly flexion: string;
}[] = [
	{
		flexion: `N: der Tag, die Tage
A: den Tag, die Tage
G: des Tages, der Tage
D: dem Tag, den Tagen`,
		gender: "Masc",
		lemma: "Tag",
		plural: "Tage",
	},
	{
		flexion: `N: das Team, die Teams
A: das Team, die Teams
G: des Teams, der Teams
D: dem Team, den Teams`,
		gender: "Neut",
		lemma: "Team",
		plural: "Teams",
	},
	{
		flexion: `N: das Formular, die Formulare
A: das Formular, die Formulare
G: des Formulars, der Formulare
D: dem Formular, den Formularen`,
		gender: "Neut",
		lemma: "Formular",
		plural: "Formulare",
	},
	{
		flexion: `N: der Fahrer, die Fahrer
A: den Fahrer, die Fahrer
G: des Fahrers, der Fahrer
D: dem Fahrer, den Fahrern`,
		gender: "Masc",
		lemma: "Fahrer",
		plural: "Fahrer",
	},
	{
		flexion: `N: die Fahrkarte, die Fahrkarten
A: die Fahrkarte, die Fahrkarten
G: der Fahrkarte, der Fahrkarten
D: der Fahrkarte, den Fahrkarten`,
		gender: "Fem",
		lemma: "Fahrkarte",
		plural: "Fahrkarten",
	},
];

/** The derived cells as `Nom Sing: der Tag`, the singular before the plurals. */
function cellList(
	lemma: string,
	genders: readonly Gender[],
	plural: Parts["plural"],
) {
	const gender = genders.length > 1 ? { mixed: genders } : genders[0];
	return cellsOf(
		noun(lemma, gender as Gender),
		plural === undefined ? {} : { plural },
	).flatMap(({ row, column, forms }) =>
		forms === "Absent"
			? []
			: forms.map(
					(form) =>
						`${row.bundle.case} ${column.bundle.number}: ${form}`,
				),
	);
}

const form = (cells: readonly string[], at: string) =>
	cells
		.find((cell) => cell.startsWith(`${at}: `))
		?.split(": ")[1]
		?.split(" ")[1];

describe("the dev vault's Flexion tables", () => {
	it("holds 40 cells", () => {
		const total = VAULT_TABLES.flatMap(({ flexion }) =>
			flexion
				.split("\n")
				.flatMap((line) => line.split(": ")[1]?.split(", ")),
		).length;
		expect(total).toBe(40);
	});

	for (const { flexion, gender, lemma, plural } of VAULT_TABLES)
		it(`derives all 8 cells of ${lemma}, as the vault shows them`, () => {
			expect(lines(noun(lemma, gender), { plural: [plural] })).toBe(
				flexion,
			);
			expect(cellList(lemma, [gender], [plural])).toHaveLength(8);
		});
});

/** The 18 other measured vault nouns (filler-de#62): gender, plural, Gen Sg, Dat Pl. */
const VAULT_NOUNS: readonly (readonly [
	string,
	Gender,
	string,
	string,
	string,
])[] = [
	["Abend", "Masc", "Abende", "Abends", "Abenden"],
	["Antrag", "Masc", "Anträge", "Antrags", "Anträgen"],
	["Kopf", "Masc", "Köpfe", "Kopfes", "Köpfen"],
	["Nachweis", "Masc", "Nachweise", "Nachweises", "Nachweisen"],
	["Preis", "Masc", "Preise", "Preises", "Preisen"],
	["Ticket", "Neut", "Tickets", "Tickets", "Tickets"],
	[
		"Gültigkeitsdatum",
		"Neut",
		"Gültigkeitsdaten",
		"Gültigkeitsdatums",
		"Gültigkeitsdaten",
	],
	["Nacht", "Fem", "Nächte", "Nacht", "Nächten"],
	["Person", "Fem", "Personen", "Person", "Personen"],
	["Arm", "Masc", "Arme", "Armes", "Armen"],
	["Bein", "Neut", "Beine", "Beines", "Beinen"],
	["Dokument", "Neut", "Dokumente", "Dokuments", "Dokumenten"],
	["Gruppe", "Fem", "Gruppen", "Gruppe", "Gruppen"],
	["Mitglied", "Neut", "Mitglieder", "Mitglieds", "Mitgliedern"],
	["Papier", "Neut", "Papiere", "Papiers", "Papieren"],
	["Pass", "Masc", "Pässe", "Passes", "Pässen"],
	["Mietvertrag", "Masc", "Mietverträge", "Mietvertrags", "Mietverträgen"],
	["Zeitraum", "Masc", "Zeiträume", "Zeitraums", "Zeiträumen"],
];

describe("the 18 other vault nouns", () => {
	it("covers 18 nouns", () => expect(VAULT_NOUNS.length).toBe(18));

	for (const [lemma, gender, plural, genitive, dative] of VAULT_NOUNS)
		it(`${lemma}: des/der ${genitive}, den ${dative}`, () => {
			const cells = cellList(lemma, [gender], [plural]);
			expect(form(cells, "Gen Sing")).toBe(genitive);
			expect(form(cells, "Dat Plur")).toBe(dative);
		});
});

describe("n-Deklination the data cannot tell", () => {
	for (const [lemma, plural] of [
		["Mensch", "Menschen"],
		["Kollege", "Kollegen"],
		["Name", "Namen"],
	] as const)
		it(`leaves ${lemma}'s oblique singular cells Unknown`, () => {
			expect(nDeclensionUnknown(lemma, ["Masc"], [plural])).toBe(true);
			const cells = cellList(lemma, ["Masc"], [plural]);
			expect(cells.filter((cell) => cell.includes("Sing:"))).toEqual([
				`Nom Sing: der ${lemma}`,
			]);
			expect(cells.filter((cell) => cell.includes("Plur:"))).toHaveLength(
				4,
			);
		});

	it("flags a masculine -e noun with no plural, and Herz whatever its plural", () => {
		for (const [lemma, gender, plural] of [
			["Glaube", "Masc", ["NoPlural"]],
			["Wille", "Masc", ["NoPlural"]],
			["Herz", "Neut", ["Herzen"]],
			["Herz", "Neut", ["NoPlural"]],
		] as const) {
			const stored = plural.filter((value) => value !== "NoPlural");
			expect(nDeclensionUnknown(lemma, [gender], stored)).toBe(true);
			expect(
				cellList(lemma, [gender], plural).filter((cell) =>
					cell.includes("Sing:"),
				),
			).toEqual([
				`Nom Sing: ${gender === "Masc" ? "der" : "das"} ${lemma}`,
			]);
		}
	});

	it("cannot tell Staat either, so derives no weak form for it", () => {
		expect(nDeclensionUnknown("Staat", ["Masc"], ["Staaten"])).toBe(true);
		// Every cell shown is a form Staat has: no *den Staaten* singular.
		expect(
			lines(noun("Staat", "Masc"), { plural: ["Staaten"] }),
		).toBe(`N: der Staat, die Staaten
A: die Staaten
G: der Staaten
D: den Staaten`);
	});
});

describe("cells left out rather than guessed", () => {
	const singular = (
		lemma: string,
		gender: Gender,
		plural: readonly string[],
	) =>
		Object.fromEntries(
			cellList(lemma, [gender], plural)
				.filter((cell) => cell.includes("Sing:"))
				.map((cell) => [cell.split(" ")[0], cell.split(" ").at(-1)]),
		);

	it("doubles the s of -nis", () => {
		expect(singular("Verständnis", "Neut", ["NoPlural"]).Gen).toBe(
			"Verständnisses",
		);
		expect(singular("Ergebnis", "Neut", ["Ergebnisse"]).Gen).toBe(
			"Ergebnisses",
		);
	});

	it("gives a final single s -es only where a plural shows it", () => {
		for (const [lemma, gender, plural] of [
			["Chaos", "Neut", ["NoPlural"]],
			["Kosmos", "Masc", ["Kosmen"]],
			["Atlas", "Masc", ["Atlanten"]],
			["Tennis", "Neut", ["NoPlural"]],
			["Applaus", "Masc", ["NoPlural"]],
		] as const)
			expect(singular(lemma, gender, plural)).toEqual({
				Acc: lemma,
				Dat: lemma,
				Nom: lemma,
			});
		expect(singular("Atlas", "Masc", ["Atlanten", "Atlasse"]).Gen).toBe(
			"Atlasses",
		);
		expect(singular("Gas", "Neut", ["Gase"]).Gen).toBe("Gases");
	});

	it("gives another sibilant -es only in a monosyllable or where a plural shows it", () => {
		expect(singular("Business", "Neut", ["NoPlural"]).Gen).toBeUndefined();
		expect(singular("Jazz", "Masc", ["NoPlural"]).Gen).toBeUndefined();
		expect(singular("Kommerz", "Masc", ["NoPlural"]).Gen).toBeUndefined();
		expect(singular("Quiz", "Neut", ["Quiz"]).Gen).toBe("Quiz");
		expect(singular("Stress", "Masc", ["NoPlural"]).Gen).toBe("Stresses");
		expect(singular("Prozess", "Masc", ["Prozesse"]).Gen).toBe("Prozesses");
	});

	it("gives a monosyllable with no plural no genitive", () => {
		expect(singular("Rock", "Masc", ["NoPlural"]).Gen).toBeUndefined();
		expect(singular("Golf", "Neut", ["NoPlural"]).Gen).toBeUndefined();
		expect(singular("Rock", "Masc", ["Röcke"]).Gen).toBe("Rockes");
	});

	it("gives Gen no genitive, never des Genes, unless an S-plural shows it", () => {
		expect(lines(noun("Gen", "Neut"), { plural: ["Gene"] })).toBe(
			`N: das Gen, die Gene
A: das Gen, die Gene
G: der Gene
D: dem Gen, den Genen`,
		);
		expect(singular("Ren", "Neut", ["Rene", "Rens"]).Gen).toBe("Rens");
		for (const [lemma, gender, plural] of [
			["Gel", "Neut", ["Gele"]],
			["Pol", "Masc", ["Pole"]],
			["Ton", "Masc", ["Töne"]],
		] as const)
			expect(singular(lemma, gender, plural).Gen).toBeUndefined();
		// Other monosyllables keep their -es (filler-de#62).
		expect(singular("Weg", "Masc", ["Wege"]).Gen).toBe("Weges");
		expect(singular("Arm", "Masc", ["Arme"]).Gen).toBe("Armes");
		expect(singular("Bein", "Neut", ["Beine"]).Gen).toBe("Beines");
	});

	it("leaves out the genitive and dative of a neuter that may be an adjective", () => {
		expect(lines(noun("Böse", "Neut"), { plural: ["NoPlural"] })).toBe(
			"N: das Böse\nA: das Böse",
		);
		expect(singular("Auge", "Neut", ["Augen"])).toEqual({
			Acc: "Auge",
			Dat: "Auge",
			Gen: "Auges",
			Nom: "Auge",
		});
	});
});

describe("other plural shapes", () => {
	it("gives a NoPlural noun its singular cells, and Absent plural ones", () => {
		expect(cellList("Schnee", ["Masc"], ["NoPlural"])).toEqual([
			"Nom Sing: der Schnee",
			"Acc Sing: den Schnee",
			"Gen Sing: des Schnees",
			"Dat Sing: dem Schnee",
		]);
		expect(
			cellsOf(noun("Schnee", "Masc"), { plural: ["NoPlural"] })
				.filter(({ column }) => column.bundle.number === "Plur")
				.map(({ forms }) => forms),
		).toEqual(["Absent", "Absent", "Absent", "Absent"]);
	});

	it("gives a PluralOnly noun its plural cells from the Canonical Form, and Absent singular ones", () => {
		const leute = cellsOf(noun("Leute", null as unknown as Gender), {
			plural: ["PluralOnly"],
		});
		expect(leute.map(({ forms }) => forms)).toEqual([
			"Absent",
			["die Leute"],
			"Absent",
			["die Leute"],
			"Absent",
			["der Leute"],
			"Absent",
			["den Leuten"],
		]);
	});

	it("lists every licensed plural, each from its variant", () => {
		expect(
			cellList("Komma", ["Neut"], ["Kommas", "Kommata"]).filter((cell) =>
				cell.startsWith("Dat"),
			),
		).toEqual([
			"Dat Sing: dem Komma",
			"Dat Plur: den Kommas",
			"Dat Plur: den Kommata",
		]);
		const lemma = noun("Tag", "Masc");
		const schema = pack.schemaFor(lemma);
		if (schema === undefined) throw new Error("Expected a schema");
		const table = pack.derive({
			lemma,
			schema,
			selection: selectionOf(lemma, { plural: ["Tage"] }),
			readings: [],
		});
		expect(table["case=Nom|number=Plur"]).toEqual([
			{
				form: { kind: "Word", article: "die", word: "Tage" },
				provenance: "Variant",
				variant: { dimension: "plural", id: "tage" },
			},
		]);
		expect(table["case=Dat|number=Plur"]).toEqual([
			{
				form: { kind: "Word", article: "den", word: "Tagen" },
				provenance: "Rule",
				variant: { dimension: "plural", id: "tage" },
			},
		]);
		expect(table["case=Gen|number=Sing"]).toEqual([
			{
				form: { kind: "Word", article: "des", word: "Tages" },
				provenance: "Rule",
			},
		]);
	});

	it("doubles a plural's doubled s and keeps a replaced -us", () => {
		expect(form(cellList("Bus", ["Masc"], ["Busse"]), "Gen Sing")).toBe(
			"Busses",
		);
		expect(
			form(cellList("Rhythmus", ["Masc"], ["Rhythmen"]), "Gen Sing"),
		).toBe("Rhythmus");
	});

	it("folds umlauts before comparing a plural with its singular", () => {
		expect(form(cellList("Haus", ["Neut"], ["Häuser"]), "Gen Sing")).toBe(
			"Hauses",
		);
		expect(
			form(
				cellList("Krankenhaus", ["Neut"], ["Krankenhäuser"]),
				"Gen Sing",
			),
		).toBe("Krankenhauses");
	});

	it("keeps a foreign -us with no plural or the same plural", () => {
		expect(
			form(cellList("Tourismus", ["Masc"], ["NoPlural"]), "Gen Sing"),
		).toBe("Tourismus");
		expect(form(cellList("Status", ["Masc"], ["Status"]), "Gen Sing")).toBe(
			"Status",
		);
	});

	it("joins the articles of a mixed gender and drops cells its genders disagree on", () => {
		expect(
			cellList("Balg", ["Masc", "Neut"], ["Bälger"]).filter((cell) =>
				cell.includes("Sing"),
			),
		).toEqual([
			"Nom Sing: der/das Balg",
			"Acc Sing: den/das Balg",
			"Gen Sing: des Balges",
			"Dat Sing: dem Balg",
		]);
		expect(
			cellList("Joghurt", ["Masc", "Fem"], ["Joghurts"]).filter((cell) =>
				cell.startsWith("Gen Sing"),
			),
		).toEqual([]);
	});

	it("derives nothing without a plural dimension or a gender", () => {
		expect(lines(noun("Tag", "Masc"))).toBeUndefined();
		expect(cellList("Reisende", [], ["Reisende"])).toEqual([]);
	});
});
