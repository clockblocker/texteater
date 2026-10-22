import { describe, expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import {
	applyParadigmChanges,
	germanConjugationClass,
	isFree,
	licenceGroups,
	licensed,
} from "dumrel";
import {
	groupsOf,
	keyOf,
	noun,
	produced,
	reading,
	verb,
} from "./paradigm-fixtures.js";

describe("the worked examples of ADR 0048", () => {
	test("melken: molk and melkte, gemolken and gemelkt, unstated, is Free", () => {
		const melken = verb("melken");
		const milking = reading(melken, "✋");
		const changes = [
			{
				kind: "Contribute",
				dimension: "preterite",
				value: "molk",
				provenance: "Migrated",
			},
			{
				kind: "Contribute",
				dimension: "preterite",
				value: "melkte",
				provenance: "Migrated",
			},
			{
				kind: "Contribute",
				dimension: "pastParticiple",
				value: "gemolken",
				provenance: "Migrated",
			},
			{
				kind: "Contribute",
				dimension: "pastParticiple",
				value: "gemelkt",
				provenance: "Migrated",
			},
		];
		const result = applyParadigmChanges({
			lemma: melken,
			readings: [milking],
			paradigm: { dimensions: {} },
			changes,
		});
		if (!result.success) throw result.error;
		const paradigm = result.value;
		expect(paradigm.dimensions.preterite?.licences).toEqual({});
		expect(licensed(paradigm, "preterite", keyOf(milking))).toEqual([
			"melkte",
			"molk",
		]);
		expect(isFree(paradigm, [keyOf(milking)])).toBe(true);
		expect(groupsOf(paradigm, [milking])).toEqual([
			{
				readings: ["✋"],
				selection: {
					pastParticiple: ["gemelkt", "gemolken"],
					preterite: ["melkte", "molk"],
				},
			},
		]);
		// A Reading that licenses both explicitly is as Free.
		const explicit = produced(
			melken,
			[milking],
			[
				[milking, "preterite", ["molk", "melkte"]],
				[milking, "pastParticiple", ["gemolken", "gemelkt"]],
			],
		);
		expect(isFree(explicit, [keyOf(milking)])).toBe(true);
		expect(licenceGroups(explicit, [keyOf(milking)])[0]?.key).toBe(
			licenceGroups(paradigm, [keyOf(milking)])[0]?.key,
		);
	});

	test("Pizza: Pizzen and Pizzas, unstated, is Free", () => {
		const pizza = noun("Pizza", "Fem");
		const food = reading(pizza, "🍕");
		const result = applyParadigmChanges({
			lemma: pizza,
			readings: [food],
			paradigm: { dimensions: {} },
			changes: ["Pizzen", "Pizzas"].map((value) => ({
				kind: "Contribute",
				dimension: "plural",
				value,
				provenance: "Migrated",
			})),
		});
		if (!result.success) throw result.error;
		expect(result.value).toEqual({
			dimensions: {
				plural: {
					variants: [
						{
							id: "pizzas",
							value: "Pizzas",
							provenance: "Migrated",
						},
						{
							id: "pizzen",
							value: "Pizzen",
							provenance: "Migrated",
						},
					],
					licences: {},
				},
			},
		});
		expect(isFree(result.value, [keyOf(food)], "plural")).toBe(true);
		expect(licenceGroups(result.value, [keyOf(food)])).toHaveLength(1);
	});

	test("Bank: 🪑 Bänke and 🏦 Banken are Conditioned, one table each", () => {
		const bank = noun("Bank", "Fem");
		const bench = reading(bank, "🪑");
		const money = reading(bank, "🏦");
		const paradigm = produced(
			bank,
			[bench, money],
			[
				[bench, "plural", ["Bänke"]],
				[money, "plural", ["Banken"]],
			],
		);
		expect(isFree(paradigm, [keyOf(bench), keyOf(money)])).toBe(false);
		expect(groupsOf(paradigm, [bench, money])).toEqual(
			expect.arrayContaining([
				{ readings: ["🪑"], selection: { plural: ["bänke"] } },
				{ readings: ["🏦"], selection: { plural: ["banken"] } },
			]),
		);
	});

	test("Mutter: 👩 Mütter and 🔩 Muttern are Conditioned", () => {
		const mutter = noun("Mutter", "Fem");
		const mother = reading(mutter, "👩");
		const nut = reading(mutter, "🔩");
		const paradigm = produced(
			mutter,
			[mother, nut],
			[
				[mother, "plural", ["Mütter"]],
				[nut, "plural", ["Muttern"]],
			],
		);
		expect(paradigm.dimensions.plural?.licences).toEqual({
			[keyOf(mother)]: ["mütter"],
			[keyOf(nut)]: ["muttern"],
		});
		expect(isFree(paradigm, [keyOf(mother), keyOf(nut)], "plural")).toBe(
			false,
		);
		expect(
			licenceGroups(paradigm, [keyOf(mother), keyOf(nut)]),
		).toHaveLength(2);
	});

	test("senden: 📨 takes both and 📡 only sendete, a partial overlap with one table each", () => {
		const senden = verb("senden");
		const mail = reading(senden, "📨");
		const broadcast = reading(senden, "📡");
		const paradigm = produced(
			senden,
			[mail, broadcast],
			[
				[mail, "preterite", ["sandte", "sendete"]],
				[broadcast, "preterite", ["sendete"]],
			],
		);
		expect(
			paradigm.dimensions.preterite?.variants.map((v) => v.id),
		).toEqual(["sandte", "sendete"]);
		expect(isFree(paradigm, [keyOf(mail), keyOf(broadcast)])).toBe(false);
		expect(groupsOf(paradigm, [mail, broadcast])).toEqual(
			expect.arrayContaining([
				{
					readings: ["📨"],
					selection: { preterite: ["sandte", "sendete"] },
				},
				{ readings: ["📡"], selection: { preterite: ["sendete"] } },
			]),
		);
		// A Reading's conjugation classes are those of the variants it licenses.
		const classes = (source: Dumling.Reading) =>
			licensed(paradigm, "preterite", keyOf(source)).map((id) =>
				germanConjugationClass("senden", id),
			);
		expect(classes(mail)).toEqual(["Mixed", "Weak"]);
		expect(classes(broadcast)).toEqual(["Weak"]);
	});

	test("Wasser: 💧 NoPlural and 🧴 Wässer are Conditioned", () => {
		const wasser = noun("Wasser", "Neut");
		const drink = reading(wasser, "💧");
		const sorts = reading(wasser, "🧴");
		const paradigm = produced(
			wasser,
			[drink, sorts],
			[
				[drink, "plural", ["NoPlural"]],
				[sorts, "plural", ["Wässer"]],
			],
		);
		expect(paradigm.dimensions.plural?.variants).toEqual([
			{ id: "NoPlural", value: "NoPlural", provenance: "Produced" },
			{ id: "wässer", value: "Wässer", provenance: "Produced" },
		]);
		expect(isFree(paradigm, [keyOf(drink), keyOf(sorts)])).toBe(false);
		expect(groupsOf(paradigm, [drink, sorts])).toEqual(
			expect.arrayContaining([
				{ readings: ["💧"], selection: { plural: ["NoPlural"] } },
				{ readings: ["🧴"], selection: { plural: ["wässer"] } },
			]),
		);
	});
});
