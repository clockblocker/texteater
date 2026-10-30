import { describe, expect, test } from "bun:test";
import type * as Dumling from "dumling/types";

import { makeSurfaceId } from "../../../src";
import { projectLemmaTables } from "../../../src/inflection";
import {
	jedem,
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

const bank = lemmaOf("NOUN", "Bank");
const bench = readingOf(bank, "🪑");
const money = readingOf(bank, "🏦");
const bankParadigm = paradigmOf(bank, {
	plural: {
		variants: ["Bänke", "Banken"],
		licences: [
			[bench, ["Bänke"]],
			[money, ["Banken"]],
		],
	},
});
const groupOf = (
	view: ReturnType<typeof projectLemmaTables<"de", { letters: string }>>,
	reading: Dumling.Reading<"de">,
) => view.groups.findIndex((group) => group.readingKeys.includes(key(reading)));

describe("Licence Conflicts", () => {
	const banken = nounSurface(bank, "Banken", "Nom", "Plur");

	test("Banken judged 🪑 is flagged, shown in 🏦's table and never in 🪑's", () => {
		const view = projectLemmaTables(
			toyPack(),
			sliceOf({
				lemma: bank,
				paradigm: bankParadigm,
				readings: [bench, money],
				occurrences: [["r1", bench, banken]],
			}),
		);
		const moneyKey = view.groups[groupOf(view, money)]?.selectionKey;
		expect(view.conflicts).toEqual([
			{
				ref: "r1",
				reading: key(bench),
				surfaceId: makeSurfaceId("de", banken),
				fitsGroups: [moneyKey as string],
			},
		]);
		expect(
			lettersAt(view, groupOf(view, bench), "declension", 0, 1),
		).toEqual(["Bänke"]);
		expect(
			cellAt(view, groupOf(view, money), "declension", 0, 1).forms[0]
				?.attested[0]?.refs,
		).toEqual(["r1"]);
	});

	test("a form no group fits is undescribed, not a conflict", () => {
		const banke = nounSurface(bank, "Banke", "Nom", "Plur");
		const view = projectLemmaTables(
			toyPack(),
			sliceOf({
				lemma: bank,
				paradigm: bankParadigm,
				readings: [bench, money],
				occurrences: [["r1", bench, banke]],
			}),
		);
		expect(view.conflicts).toEqual([]);
		expect(view.surfaces[0]).toMatchObject({
			undescribed: true,
			inCore: false,
			groups: [],
		});
		for (const group of [0, 1]) {
			const cell = cellAt(view, group, "declension", 0, 1);
			expect(cell.undescribed).toBe(true);
			expect(cell.forms.map((form) => form.form.letters)).not.toContain(
				"Banke",
			);
		}
	});
});

describe("variant discovery", () => {
	const pizza = lemmaOf("NOUN", "Pizza");
	const food = readingOf(pizza, "🍕");

	test("Pizzas met when only Pizzen is stored flags its cell and goes to the list", () => {
		const pizzas = nounSurface(pizza, "Pizzas", "Nom", "Plur");
		const view = projectLemmaTables(
			toyPack(),
			sliceOf({
				lemma: pizza,
				paradigm: paradigmOf(pizza, {
					plural: {
						variants: ["Pizzen"],
						licences: [[food, ["Pizzen"]]],
					},
				}),
				readings: [food],
				occurrences: [["r1", food, pizzas]],
			}),
		);
		const cell = cellAt(view, 0, "declension", 0, 1);
		expect(cell.undescribed).toBe(true);
		expect(cell.forms.map((form) => form.form.letters)).toEqual(["Pizzen"]);
		expect(view.surfaces[0]).toMatchObject({
			undescribed: true,
			inCore: false,
			refs: ["r1"],
		});
	});

	test("with both variants stored the cell holds Pizzas / Pizzen and nothing is flagged", () => {
		const view = projectLemmaTables(
			toyPack(),
			sliceOf({
				lemma: pizza,
				paradigm: paradigmOf(pizza, {
					plural: { variants: ["Pizzen", "Pizzas"] },
				}),
				readings: [food],
				occurrences: [
					["r1", food, nounSurface(pizza, "pizzas", "Nom", "Plur")],
				],
			}),
		);
		const cell = cellAt(view, 0, "declension", 0, 1);
		expect(cell.undescribed).toBe(false);
		expect(
			cell.forms.map((form) => [form.form.letters, form.attested.length]),
		).toEqual([
			["Pizzas", 1],
			["Pizzen", 0],
		]);
	});
});

describe("Surfaces outside the core cells", () => {
	const senden = lemmaOf("VERB", "senden");
	const mail = readingOf(senden, "📨");

	test("a passive fits no cell and is listed with its own features", () => {
		const passive = verbSurface(senden, "gesendet wurde", {
			person: "3",
			number: "Sing",
			passive: true,
		});
		const view = projectLemmaTables(
			toyPack(),
			sliceOf({
				lemma: senden,
				readings: [mail],
				occurrences: [["r1", mail, passive]],
			}),
		);
		expect(view.surfaces[0]).toMatchObject({
			inCore: false,
			undescribed: false,
			groups: [],
			axes: { placement: { kind: "Unplaced" } },
		});
		expect(view.surfaces[0]?.axes.bundles[0]).toMatchObject({
			voice: "Pass",
			passive: "Process",
		});
	});

	test("a kept Surface with no link is unattested", () => {
		const bank = lemmaOf("NOUN", "Bank");
		const view = projectLemmaTables(
			toyPack(),
			sliceOf({
				lemma: bank,
				readings: [readingOf(bank, "🪑")],
				kept: [nounSurface(bank, "Bank", "Nom", "Sing")],
			}),
		);
		expect(view.surfaces[0]).toMatchObject({
			refs: [],
			unattested: true,
			inCore: true,
		});
	});
});

describe("syncretism", () => {
	const jeder = jedem.lemma as Dumling.Lemma<"de">;
	const everyone = readingOf(jeder, "👥");

	test("jedem is uncertain in each candidate cell and listed, never guessed", () => {
		const view = projectLemmaTables(
			toyPack(),
			sliceOf({
				lemma: jeder,
				readings: [everyone],
				occurrences: [["r1", everyone, jedem as Dumling.Surface<"de">]],
			}),
		);
		const DAT = 3;
		const [masc, neut, fem] = [0, 1, 2].map((column) =>
			cellAt(view, 0, "singular", DAT, column),
		);
		for (const cell of [masc, neut])
			expect(cell?.forms[0]?.attested).toEqual([
				{
					surfaceId: makeSurfaceId("de", jedem),
					refs: ["r1"],
					uncertain: true,
				},
			]);
		expect(fem?.status).toBe("Unknown");
		expect(view.surfaces[0]).toMatchObject({
			inCore: false,
			undescribed: false,
			axes: { placement: { kind: "OneOf" } },
		});
	});
});

describe("display and labels stay with the host", () => {
	test("the view is plain data the pack's display and labels draw", () => {
		const pack = toyPack();
		const melken = lemmaOf("VERB", "melken");
		const view = projectLemmaTables(
			pack,
			sliceOf({
				lemma: melken,
				paradigm: paradigmOf(melken, {
					preterite: { variants: ["molk", "melkte"] },
				}),
				readings: [readingOf(melken, "🐄")],
			}),
		);
		expect(JSON.parse(JSON.stringify(view))).toEqual(view);
		const panel = view.groups[0]?.panels[1];
		const drawn = panel?.cells[2]?.map((cell) =>
			cell.forms
				.map((form) =>
					pack
						.display(form.form)
						.map((run) => run.text)
						.join(""),
				)
				.join(" / "),
		);
		expect([pack.labels.panel(panel?.id ?? ""), drawn]).toEqual([
			"PRETERITE",
			["er melkte / er molk", "sie melkten / sie molken"],
		]);
		expect(view.pack).toEqual({ language: "de", version: "toy-1" });
		expect(view.schema).toEqual({ id: "toy/Lexeme/VERB", version: 1 });
	});
});
