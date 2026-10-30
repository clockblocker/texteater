import { describe, expect, it } from "bun:test";
import { type GermanForm, inflectionPacks } from "dumcorpus/inflection";
import type * as Dumling from "dumling/types";

import {
	type InflectionPack,
	type LemmaTablesView,
	projectLemmaTables,
} from "../../../src/inflection";
import {
	type Occurrence,
	paradigmOf,
	readingOf,
	sliceOf,
	nounSurface as surfaceOf,
	verbSurface,
} from "../../support/inflection-fixtures";

/** The German pack, checked to be a `dumdict/inflection` pack. */
const pack: InflectionPack<"de", GermanForm> = inflectionPacks.de;

type View = LemmaTablesView<"de", GermanForm>;
type Gender = "Masc" | "Fem" | "Neut";

const noun = (canonicalForm: string, gender: Gender) =>
	({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm,
		coreFeatures: { gender },
	}) as Dumling.Lemma<"de", "Lexeme", "NOUN">;

const shown = (form: GermanForm) =>
	pack
		.display(form)
		.map(({ text }) => text)
		.join("");

/** Each row of a group's panel as `label: form, form`, the vault's Flexion lines. */
function lines(view: View, group = 0, panel = "declension"): string {
	const found = view.groups[group]?.panels.find(({ id }) => id === panel);
	if (!found) throw Error(`No ${panel} panel in group ${group}`);
	return found.rows
		.map((row, index) => {
			const forms = (found.cells[index] ?? []).flatMap((cell) =>
				cell.forms.map(({ form }) => shown(form)),
			);
			return forms.length === 0
				? undefined
				: `${pack.labels.axis(row)}: ${forms.join(", ")}`;
		})
		.filter((line) => line !== undefined)
		.join("\n");
}

/**
 * The 5 Flexion tables of the plugin's dev vault (filler-de#62 and #75),
 * 8 cells each.
 */
const VAULT_TABLES: readonly (readonly [string, Gender, string, string])[] = [
	[
		"Tag",
		"Masc",
		"Tage",
		"N: der Tag, die Tage\nA: den Tag, die Tage\nG: des Tages, der Tage\nD: dem Tag, den Tagen",
	],
	[
		"Team",
		"Neut",
		"Teams",
		"N: das Team, die Teams\nA: das Team, die Teams\nG: des Teams, der Teams\nD: dem Team, den Teams",
	],
	[
		"Formular",
		"Neut",
		"Formulare",
		"N: das Formular, die Formulare\nA: das Formular, die Formulare\nG: des Formulars, der Formulare\nD: dem Formular, den Formularen",
	],
	[
		"Fahrer",
		"Masc",
		"Fahrer",
		"N: der Fahrer, die Fahrer\nA: den Fahrer, die Fahrer\nG: des Fahrers, der Fahrer\nD: dem Fahrer, den Fahrern",
	],
	[
		"Fahrkarte",
		"Fem",
		"Fahrkarten",
		"N: die Fahrkarte, die Fahrkarten\nA: die Fahrkarte, die Fahrkarten\nG: der Fahrkarte, der Fahrkarten\nD: der Fahrkarte, den Fahrkarten",
	],
];

function nounView(
	lemma: Dumling.Lemma<"de">,
	plural: readonly string[],
	occurrences: (
		reading: Dumling.Reading<"de">,
	) => readonly Occurrence[] = () => [],
): View {
	const reading = readingOf(lemma, "📅");
	return projectLemmaTables(
		pack,
		sliceOf({
			lemma,
			paradigm: paradigmOf(lemma, { plural: { variants: plural } }),
			readings: [reading],
			occurrences: occurrences(reading),
		}),
	);
}

describe("the German pack through projectLemmaTables", () => {
	it("projects all 40 cells of the vault's Flexion tables", () => {
		let filled = 0;
		for (const [lemma, gender, plural, flexion] of VAULT_TABLES) {
			const view = nounView(noun(lemma, gender), [plural]);
			expect(view.schema).toEqual({ id: "de/Lexeme/NOUN", version: 1 });
			expect(lines(view)).toBe(flexion);
			for (const row of view.groups[0]?.panels[0]?.cells ?? [])
				filled += row.filter(
					({ status }) => status === "Filled",
				).length;
		}
		expect(filled).toBe(40);
	});

	it("fills a cell a met form attests, and only that cell", () => {
		const staat = noun("Staat", "Masc");
		expect(
			lines(
				nounView(staat, ["Staaten"], (reading) => [
					["r1", reading, surfaceOf(staat, "Staates", "Gen", "Sing")],
				]),
			),
		).toBe(
			"N: der Staat, die Staaten\nA: die Staaten\nG: des Staates, der Staaten\nD: den Staaten",
		);
		const mensch = noun("Mensch", "Masc");
		expect(
			lines(
				nounView(mensch, ["Menschen"], (reading) => [
					[
						"r1",
						reading,
						surfaceOf(mensch, "Menschen", "Acc", "Sing"),
					],
					[
						"r2",
						reading,
						surfaceOf(mensch, "Menschen", "Dat", "Sing"),
					],
					[
						"r3",
						reading,
						surfaceOf(mensch, "Menschen", "Gen", "Plur"),
					],
				]),
			),
		).toBe(
			"N: der Mensch, die Menschen\nA: den Menschen, die Menschen\nG: der Menschen\nD: dem Menschen, den Menschen",
		);
	});

	it("gives each Licence Group of Bank its own plural", () => {
		const bank = noun("Bank", "Fem");
		const seat = readingOf(bank, "🪑");
		const money = readingOf(bank, "🏦");
		const view = projectLemmaTables(
			pack,
			sliceOf({
				lemma: bank,
				paradigm: paradigmOf(bank, {
					plural: {
						variants: ["Bänke", "Banken"],
						licences: [
							[seat, ["Bänke"]],
							[money, ["Banken"]],
						],
					},
				}),
				readings: [seat, money],
			}),
		);
		expect(view.free).toBe(false);
		expect(
			view.groups.map((group) => [
				group.readings.map((reading) =>
					"emojiDescription" in reading
						? reading.emojiDescription
						: "",
				),
				lines(view, view.groups.indexOf(group)).split("\n")[3],
			]),
		).toEqual(
			expect.arrayContaining([
				[["🪑"], "D: der Bank, den Bänken"],
				[["🏦"], "D: der Bank, den Banken"],
			]),
		);
	});

	it("shows a separable verb's met form in its cell, displayed with a Gap", () => {
		const abfahren = {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "abfahren",
			coreFeatures: { hasSepPrefix: "ab" },
		} as Dumling.Lemma<"de", "Lexeme", "VERB">;
		const reading = readingOf(abfahren, "🚆");
		const view = projectLemmaTables(
			pack,
			sliceOf({
				lemma: abfahren,
				paradigm: paradigmOf(abfahren, {
					present3: { variants: ["fährt ab"] },
					preterite: { variants: ["fuhr ab"] },
				}),
				readings: [reading],
				occurrences: [
					[
						"r1",
						reading,
						verbSurface(abfahren, "abfährt", {
							tense: "Pres",
							person: "3",
							number: "Sing",
						}),
					],
				],
			}),
		);
		const present = view.groups[0]?.panels.find(
			({ id }) => id === "present",
		);
		const er = present?.cells[2]?.[0];
		expect(er?.forms.map(({ form }) => shown(form))).toEqual([
			"er fährt … ab",
		]);
		expect(
			er?.forms[0]?.derived.map(({ provenance }) => provenance),
		).toEqual(["Variant"]);
		expect(er?.forms[0]?.attested.map(({ refs }) => refs)).toEqual([
			["r1"],
		]);
		expect(view.surfaces.map(({ inCore }) => inCore)).toEqual([true]);
		expect(view.groups[0]?.panels.map(({ id }) => id)).toEqual([
			"present",
			"preterite",
			"subjunctive2",
			"participle",
		]);
	});

	it("shows a met form bare, even when the Reading has a Required Reflexive Slot (ADR 0052)", () => {
		const erinnern = {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "erinnern",
			coreFeatures: { hasSepPrefix: null },
		} as Dumling.Lemma<"de", "Lexeme", "VERB">;
		const reading = readingOf(erinnern, "🪞🧠");
		const slice = sliceOf({
			lemma: erinnern,
			paradigm: paradigmOf(erinnern, {
				present3: { variants: ["erinnert"] },
			}),
			readings: [reading],
			occurrences: [
				[
					"r1",
					reading,
					verbSurface(erinnern, "erinnert", {
						tense: "Pres",
						person: "3",
						number: "Sing",
					}),
				],
			],
		});
		const er = (view: View) =>
			view.groups[0]?.panels
				.find(({ id }) => id === "present")
				?.cells[2]?.[0]?.forms.map(({ form, attested }) => [
					shown(form),
					attested.length,
				]);
		expect(er(projectLemmaTables(pack, slice))).toEqual([
			["er erinnert", 1],
		]);
		const [entry] = slice.readingEntries;
		if (!entry) throw Error("Expected a Reading Entry");
		entry.knowledge = {
			valency: [
				{
					status: "Required",
					complements: [{ kind: "Reflexive", governedCase: "Acc" }],
				},
			],
		};
		expect(er(projectLemmaTables(pack, slice))).toEqual([
			["er erinnert", 1],
		]);
	});
});
