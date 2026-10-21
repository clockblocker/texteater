import { describe, expect, test } from "bun:test";

import { projectLemmaTables } from "../../../src/inflection";
import {
	key,
	lemmaOf,
	nounSurface,
	paradigmOf,
	readingOf,
	sliceOf,
	verbSurface,
} from "../../support/inflection-fixtures";
import { cellAt, lettersAt } from "../../support/inflection-views";
import { toyPack } from "../../support/toy-inflection-pack";

const PLUR = 1;
const DAT = 3;
const THIRD = 2;
const SING = 0;

describe("Free dimensions: one table, several forms in a cell", () => {
	const melken = lemmaOf("VERB", "melken");
	const milk = readingOf(melken, "🐄");
	const paradigm = paradigmOf(melken, {
		preterite: { variants: ["molk", "melkte"] },
		pastParticiple: { variants: ["gemolken", "gemelkt"] },
	});

	test("melken has one table with molk / melkte and gemolken / gemelkt", () => {
		const view = projectLemmaTables(
			toyPack(),
			sliceOf({ lemma: melken, paradigm, readings: [milk] }),
		);
		expect(view.free).toBe(true);
		expect(view.groups).toHaveLength(1);
		expect(view.groups[0]?.readings).toEqual([milk]);
		expect(lettersAt(view, 0, "preterite", THIRD, SING)).toEqual([
			"melkte",
			"molk",
		]);
		expect(lettersAt(view, 0, "participle", 0, 0)).toEqual([
			"gemelkt",
			"gemolken",
		]);
		expect(
			cellAt(view, 0, "preterite", THIRD, SING).forms.map(
				(form) => form.derived,
			),
		).toEqual([
			[
				{
					provenance: "Variant",
					variant: { dimension: "preterite", id: "melkte" },
				},
			],
			[
				{
					provenance: "Variant",
					variant: { dimension: "preterite", id: "molk" },
				},
			],
		]);
	});

	test("two Readings that both take every variant share the one table", () => {
		const second = readingOf(melken, "🤲");
		const view = projectLemmaTables(
			toyPack(),
			sliceOf({ lemma: melken, paradigm, readings: [second, milk] }),
		);
		expect(view.groups).toHaveLength(1);
		expect(view.groups[0]?.readingKeys).toEqual(
			[key(milk), key(second)].sort(),
		);
	});
});

describe("Conditioned dimensions: one table per Licence Group", () => {
	const bank = lemmaOf("NOUN", "Bank");
	const bench = readingOf(bank, "🪑");
	const money = readingOf(bank, "🏦");
	const paradigm = paradigmOf(bank, {
		plural: {
			variants: ["Bänke", "Banken"],
			licences: [
				[bench, ["Bänke"]],
				[money, ["Banken"]],
			],
		},
	});

	test("Bank gives 🪑 Bänke and 🏦 Banken", () => {
		const view = projectLemmaTables(
			toyPack(),
			sliceOf({ lemma: bank, paradigm, readings: [money, bench] }),
		);
		expect(view.free).toBe(false);
		const byReading = view.groups.map((group, index) => [
			group.readingKeys,
			lettersAt(view, index, "declension", DAT, PLUR),
		]);
		// Groups come in code-unit order of their smallest Reading key.
		const expected: [string, string[][]][] = [
			[key(bench), [[key(bench)], ["Bänken"]]],
			[key(money), [[key(money)], ["Banken"]]],
		];
		expect(byReading).toEqual(
			expected
				.sort(([left], [right]) => (left < right ? -1 : 1))
				.map(([, group]) => group),
		);
		expect(view.groups.map((group) => group.selection)).toContainEqual({
			plural: ["bänke"],
		});
	});

	test("a met form shows in the table whose variant derives it, and only there", () => {
		const view = projectLemmaTables(
			toyPack(),
			sliceOf({
				lemma: bank,
				paradigm,
				readings: [bench, money],
				occurrences: [
					["r1", money, nounSurface(bank, "Banken", "Nom", "Plur")],
				],
			}),
		);
		const moneyGroup = view.groups.findIndex((group) =>
			group.readingKeys.includes(key(money)),
		);
		const benchGroup = 1 - moneyGroup;
		expect(
			cellAt(view, moneyGroup, "declension", 0, PLUR).forms[0]?.attested,
		).toHaveLength(1);
		expect(
			cellAt(view, benchGroup, "declension", 0, PLUR).forms[0]?.attested,
		).toEqual([]);
		expect(view.surfaces[0]?.groups).toEqual([
			view.groups[moneyGroup]?.selectionKey as string,
		]);
		expect(view.conflicts).toEqual([]);
	});

	test("a NoPlural variant leaves its group's plural cells Absent", () => {
		const wasser = lemmaOf("NOUN", "Wasser");
		const water = readingOf(wasser, "💧");
		const sorts = readingOf(wasser, "🧴");
		const view = projectLemmaTables(
			toyPack(),
			sliceOf({
				lemma: wasser,
				paradigm: paradigmOf(wasser, {
					plural: {
						variants: ["Wässer", "NoPlural"],
						licences: [
							[water, ["NoPlural"]],
							[sorts, ["Wässer"]],
						],
					},
				}),
				readings: [water, sorts],
			}),
		);
		const statuses = view.groups.map(
			(_, index) => cellAt(view, index, "declension", 0, PLUR).status,
		);
		expect(statuses.sort()).toEqual(["Absent", "Filled"]);
	});
});

describe("partial overlap: senden", () => {
	const senden = lemmaOf("VERB", "senden");
	const mail = readingOf(senden, "📨");
	const radio = readingOf(senden, "📡");
	const paradigm = paradigmOf(senden, {
		preterite: {
			variants: ["sandte", "sendete"],
			licences: [
				[mail, ["sandte", "sendete"]],
				[radio, ["sendete"]],
			],
		},
	});
	const sendete = verbSurface(senden, "sendete", {
		person: "3",
		number: "Sing",
	});
	const sandte = verbSurface(senden, "sandte", {
		person: "3",
		number: "Sing",
	});

	test("📨 embeds one table with sandte / sendete, 📡 one with sendete", () => {
		const view = projectLemmaTables(
			toyPack(),
			sliceOf({
				lemma: senden,
				paradigm,
				readings: [mail, radio],
				occurrences: [
					["r1", radio, sendete],
					["r2", mail, sandte],
				],
			}),
		);
		const mailGroup = view.groups.findIndex((group) =>
			group.readingKeys.includes(key(mail)),
		);
		const radioGroup = 1 - mailGroup;
		expect(lettersAt(view, mailGroup, "preterite", THIRD, SING)).toEqual([
			"sandte",
			"sendete",
		]);
		expect(lettersAt(view, radioGroup, "preterite", THIRD, SING)).toEqual([
			"sendete",
		]);
		const line = (letters: string) =>
			view.surfaces.find((each) => each.form.letters === letters);
		expect(line("sendete")?.groups).toHaveLength(2);
		expect(line("sandte")?.groups).toEqual([
			view.groups[mailGroup]?.selectionKey as string,
		]);
		expect(line("sandte")?.inCore).toBe(true);
		expect(view.conflicts).toEqual([]);
	});
});

describe("rules alone, Unknown cells and core panels", () => {
	const frau = lemmaOf("NOUN", "Frau");
	const woman = readingOf(frau, "👩");

	test("a Lemma with no Paradigm derives from rules, and a met form fills an Unknown cell", () => {
		const view = projectLemmaTables(
			toyPack(),
			sliceOf({
				lemma: frau,
				readings: [woman],
				occurrences: [
					["r1", woman, nounSurface(frau, "Frauen", "Nom", "Plur")],
				],
			}),
		);
		expect(view.free).toBe(true);
		expect(view.groups[0]?.selectionKey).toBe("[]");
		expect(lettersAt(view, 0, "declension", 0, SING)).toEqual(["Frau"]);
		expect(cellAt(view, 0, "declension", 2, SING).status).toBe("Unknown");
		const plural = cellAt(view, 0, "declension", 0, PLUR);
		expect(plural.status).toBe("Filled");
		expect(plural.forms).toEqual([
			{
				form: { letters: "Frauen" },
				key: "frauen",
				derived: [],
				attested: [
					{
						surfaceId: view.surfaces[0]?.surfaceId as never,
						refs: ["r1"],
						uncertain: false,
					},
				],
			},
		]);
		expect(view.surfaces[0]?.inCore).toBe(true);
		expect(view.surfaces[0]?.undescribed).toBe(false);
	});

	test("only core panels are drawn; a met form in a non-core panel is listed", () => {
		const senden = lemmaOf("VERB", "senden");
		const mail = readingOf(senden, "📨");
		const view = projectLemmaTables(
			toyPack(),
			sliceOf({
				lemma: senden,
				readings: [mail],
				occurrences: [
					[
						"r1",
						mail,
						verbSurface(senden, "sendete", {
							person: "1",
							number: "Sing",
							mood: "Sub",
						}),
					],
				],
			}),
		);
		expect(view.groups[0]?.panels.map((panel) => panel.id)).toEqual([
			"present",
			"preterite",
			"imperative",
			"participle",
		]);
		expect(cellAt(view, 0, "imperative", 0, 0).status).toBe("Absent");
		expect(view.surfaces[0]).toMatchObject({
			inCore: false,
			undescribed: false,
			axes: { placement: { kind: "Covers" } },
		});
	});

	test("a Lemma with no schema has no panels and lists its Surfaces", () => {
		const pack = { ...toyPack(), schemaFor: () => undefined };
		const view = projectLemmaTables(
			pack,
			sliceOf({
				lemma: frau,
				readings: [woman],
				occurrences: [
					["r1", woman, nounSurface(frau, "Frau", "Nom", "Sing")],
				],
			}),
		);
		expect(view.schema).toBeUndefined();
		expect(view.groups[0]?.panels).toEqual([]);
		expect(view.surfaces[0]?.axes.placement).toEqual({ kind: "Unplaced" });
	});
});
