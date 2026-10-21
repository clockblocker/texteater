import { describe, expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import {
	applyParadigmChanges,
	isFree,
	licensed,
	paradigmDimensions,
	parseLemmaParadigm,
	parseParadigmChange,
	pruneParadigm,
	selectKnowledge,
	variantIdOf,
} from "dumrel";
import type * as Dumrel from "dumrel/types";
import { keyOf, noun, produced, reading, verb } from "./paradigm-fixtures.js";

describe("Paradigm Changes", () => {
	const bank = noun("Bank", "Fem");
	const bench = reading(bank, "🪑");
	const money = reading(bank, "🏦");
	const readings = [bench, money];
	const base = produced(bank, readings, [
		[bench, "plural", ["Bänke"]],
		[money, "plural", ["Banken"]],
	]);
	const apply = (changes: unknown[], paradigm: unknown = base) =>
		applyParadigmChanges({ lemma: bank, readings, paradigm, changes });

	test("Contribute keys a variant by its content, so a second writer adds nothing", () => {
		const result = apply([
			{
				kind: "Contribute",
				dimension: "plural",
				value: "banken",
				provenance: "Attested",
			},
			{
				kind: "License",
				dimension: "plural",
				reading: bench,
				variants: ["banken"],
			},
		]);
		if (!result.success) throw result.error;
		expect(result.value.dimensions.plural?.variants).toEqual(
			base.dimensions.plural?.variants,
		);
		expect(licensed(result.value, "plural", keyOf(bench))).toEqual([
			"banken",
			"bänke",
		]);
	});

	test("a contributed variant no Reading licenses is removed after the list", () => {
		const result = apply([
			{
				kind: "Contribute",
				dimension: "plural",
				value: "Bankes",
				provenance: "Produced",
			},
		]);
		expect(result).toEqual({ success: true, value: base });
	});

	test("Correct re-keys a variant and rewrites the Licences that name it", () => {
		const result = apply([
			{
				kind: "Correct",
				dimension: "plural",
				variant: "banken",
				value: "Bankn",
			},
		]);
		if (!result.success) throw result.error;
		expect(
			result.value.dimensions.plural?.variants.map((v) => v.id),
		).toEqual(["bankn", "bänke"]);
		expect(licensed(result.value, "plural", keyOf(money))).toEqual([
			"bankn",
		]);
	});

	test("Correct onto another variant's key merges the two", () => {
		const result = apply([
			{
				kind: "Correct",
				dimension: "plural",
				variant: "banken",
				value: "Bänke",
			},
		]);
		if (!result.success) throw result.error;
		expect(
			result.value.dimensions.plural?.variants.map((v) => v.id),
		).toEqual(["bänke"]);
		expect(isFree(result.value, readings.map(keyOf))).toBe(true);
	});

	test("Unlicense takes a variant from a Licence that keeps another; Retract removes it everywhere", () => {
		const both = apply([
			{
				kind: "License",
				dimension: "plural",
				reading: bench,
				variants: ["banken"],
			},
		]);
		if (!both.success) throw both.error;
		const unlicensed = apply(
			[
				{
					kind: "Unlicense",
					dimension: "plural",
					reading: bench,
					variants: ["banken"],
				},
			],
			both.value,
		);
		expect(unlicensed).toEqual({ success: true, value: base });
		const retracted = apply(
			[{ kind: "Retract", dimension: "plural", variant: "banken" }],
			both.value,
		);
		expect(
			retracted.success
				? retracted.value.dimensions.plural?.licences
				: null,
		).toBeNull();
		expect(
			retracted.success ? null : retracted.error.issues[0]?.message,
		).toContain("Retract would leave a Reading's Licence empty");
	});

	test("Unlicense never empties a Licence, and Retracting a dimension's last variant drops it", () => {
		const emptied = apply([
			{
				kind: "Unlicense",
				dimension: "plural",
				reading: bench,
				variants: ["bänke"],
			},
		]);
		expect(emptied.success).toBe(false);
		const pizza = noun("Pizza", "Fem");
		const food = reading(pizza, "🍕");
		const single = produced(pizza, [food], [[food, "plural", ["Pizzen"]]]);
		expect(
			applyParadigmChanges({
				lemma: pizza,
				readings: [food],
				paradigm: single,
				changes: [
					{ kind: "Retract", dimension: "plural", variant: "pizzen" },
				],
			}),
		).toEqual({ success: true, value: { dimensions: {} } });
	});

	test("License on an Unstated Reading gives it a Licence of just those variants", () => {
		const third = reading(bank, "🎲");
		const result = applyParadigmChanges({
			lemma: bank,
			readings: [...readings, third],
			paradigm: base,
			changes: [
				{
					kind: "License",
					dimension: "plural",
					reading: third,
					variants: ["banken"],
				},
			],
		});
		if (!result.success) throw result.error;
		expect(licensed(result.value, "plural", keyOf(third))).toEqual([
			"banken",
		]);
		expect(licensed(base, "plural", keyOf(third))).toEqual([
			"banken",
			"bänke",
		]);
	});

	test("a list applies atomically: its first failure answers, with the failing change's index", () => {
		const result = apply([
			{
				kind: "License",
				dimension: "plural",
				reading: bench,
				variants: ["banken"],
			},
			{ kind: "Retract", dimension: "plural", variant: "bankes" },
		]);
		expect(result.success).toBe(false);
		if (!result.success)
			expect(result.error.issues[0]).toMatchObject({
				path: ["changes", 1, "variant"],
				message: 'The plural dimension has no variant "bankes"',
			});
	});

	test("changes are checked against the Lemma", () => {
		for (const change of [
			{
				kind: "Contribute",
				dimension: "preterite",
				value: "bankte",
				provenance: "Produced",
			},
			{
				kind: "License",
				dimension: "plural",
				reading: reading(noun("Bank", "Masc"), "🪑"),
				variants: ["bänke"],
			},
			{
				kind: "License",
				dimension: "plural",
				reading: reading(bank, "🎲"),
				variants: ["bänke"],
			},
			{
				kind: "Contribute",
				dimension: "plural",
				value: "Bänke",
				provenance: "Guessed",
			},
		])
			expect([change, apply([change]).success]).toEqual([change, false]);
		expect(
			parseParadigmChange({
				lemma: bank,
				change: {
					kind: "Contribute",
					dimension: "plural",
					value: " Bänke ",
					provenance: "Produced",
				},
			}),
		).toEqual({
			success: true,
			value: {
				kind: "Contribute",
				dimension: "plural",
				value: "Bänke",
				provenance: "Produced",
			},
		});
	});

	test("nothing is mutated", () => {
		const before = structuredClone(base);
		apply([{ kind: "Retract", dimension: "plural", variant: "banken" }]);
		expect(base).toEqual(before);
	});
});

describe("parseLemmaParadigm", () => {
	const bank = noun("Bank", "Fem");
	const bench = reading(bank, "🪑");
	const valid = {
		dimensions: {
			plural: {
				variants: [
					{ id: "bänke", value: "Bänke", provenance: "Produced" },
					{ id: "banken", value: "Banken", provenance: "Produced" },
				],
				licences: { [keyOf(bench)]: ["bänke", "banken"] },
			},
		},
	};

	test("answers the Paradigm in canonical order", () => {
		expect(parseLemmaParadigm({ lemma: bank, paradigm: valid })).toEqual({
			success: true,
			value: {
				dimensions: {
					plural: {
						variants: [
							{
								id: "banken",
								value: "Banken",
								provenance: "Produced",
							},
							{
								id: "bänke",
								value: "Bänke",
								provenance: "Produced",
							},
						],
						licences: { [keyOf(bench)]: ["banken", "bänke"] },
					},
				},
			},
		});
	});

	test("refuses Paradigms that break an invariant", () => {
		const plural = valid.dimensions.plural;
		const broken = [
			{ dimensions: { preterite: plural } },
			{ dimensions: { plural: { ...plural, variants: [] } } },
			{
				dimensions: {
					plural: { ...plural, licences: { [keyOf(bench)]: [] } },
				},
			},
			{
				dimensions: {
					plural: {
						...plural,
						licences: { [keyOf(bench)]: ["bankes"] },
					},
				},
			},
			{
				dimensions: {
					plural: {
						...plural,
						licences: { [keyOf(bench)]: ["bänke", "bänke"] },
					},
				},
			},
			{
				dimensions: {
					plural: {
						...plural,
						variants: [
							{
								id: "Bänke",
								value: "Bänke",
								provenance: "Produced",
							},
						],
						licences: {},
					},
				},
			},
			{
				dimensions: {
					plural: {
						variants: [
							{
								id: "NoPlural",
								value: "NoPlural",
								provenance: "Produced",
							},
							{
								id: "wässer",
								value: "Wässer",
								provenance: "Produced",
							},
						],
						licences: { [keyOf(bench)]: ["NoPlural", "wässer"] },
					},
				},
			},
		];
		for (const paradigm of broken)
			expect([
				paradigm,
				parseLemmaParadigm({ lemma: bank, paradigm }).success,
			]).toEqual([paradigm, false]);
	});

	test("given the Lemma's Readings, every Licence is theirs and every variant licensed", () => {
		const money = reading(bank, "🏦");
		expect(
			parseLemmaParadigm({
				lemma: bank,
				paradigm: valid,
				readings: [money],
			}).success,
		).toBe(false);
		const narrow = {
			dimensions: {
				plural: {
					...valid.dimensions.plural,
					licences: { [keyOf(bench)]: ["bänke"] },
				},
			},
		};
		expect(
			parseLemmaParadigm({
				lemma: bank,
				paradigm: narrow,
				readings: [bench],
			}).success,
		).toBe(false);
		expect(
			parseLemmaParadigm({
				lemma: bank,
				paradigm: narrow,
				readings: [bench, money],
			}).success,
		).toBe(true);
	});

	test("pruneParadigm drops a removed Reading's Licences and the variants only it licensed", () => {
		const money = reading(bank, "🏦");
		const paradigm = produced(
			bank,
			[bench, money],
			[
				[bench, "plural", ["Bänke"]],
				[money, "plural", ["Banken"]],
			],
		);
		expect(pruneParadigm(paradigm, [keyOf(bench)])).toEqual({
			dimensions: {
				plural: {
					variants: [
						{ id: "bänke", value: "Bänke", provenance: "Produced" },
					],
					licences: { [keyOf(bench)]: ["bänke"] },
				},
			},
		});
		expect(pruneParadigm(paradigm, [])).toEqual({ dimensions: {} });
	});
});

describe("the Paradigm Policy", () => {
	test("German nouns have a plural and German verbs their principal parts; no other route has any", () => {
		expect(
			paradigmDimensions({
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
			}),
		).toEqual(["plural"]);
		expect(
			paradigmDimensions({
				language: "de",
				family: "Lexeme",
				kind: "VERB",
			}),
		).toEqual([
			"preterite",
			"present1",
			"present2",
			"present3",
			"pastParticiple",
			"subjunctivePast",
		]);
		for (const route of [
			{ language: "de", family: "Lexeme", kind: "ADJ" },
			{ language: "de", family: "Locution", kind: "VERB" },
			{ language: "en", family: "Lexeme", kind: "NOUN" },
		] as const)
			expect(paradigmDimensions(route)).toEqual([]);
	});

	test("principal parts are no Reading Knowledge aspect a route requests", () => {
		for (const kind of ["NOUN", "VERB"] as const) {
			const selected = selectKnowledge({
				route: { language: "de", family: "Lexeme", kind },
			});
			expect(selected.success).toBe(true);
			if (selected.success)
				for (const aspect of [
					"plural",
					"conjugationClass",
					"preterite",
					"presentSingular",
					"pastParticiple",
					"subjunctivePast",
				])
					expect(Object.hasOwn(selected.value, aspect)).toBe(false);
		}
	});

	test("a variant id folds letter case, and a marker is its own id", () => {
		const bank = noun("Bank", "Fem");
		expect(variantIdOf(bank, "plural", " BÄNKE")).toBe("bänke");
		expect(variantIdOf(bank, "plural", "NoPlural")).toBe("NoPlural");
		expect(variantIdOf(bank, "plural", "noplural")).toBe("noplural");
	});
});

describe("variant values, checked as a dictionary cites them (ADR 0038)", () => {
	const fahren = verb("fahren");
	const abfahren = verb("abfahren", "ab");
	const aufstehen = verb("aufstehen", "auf");
	const contribute = (
		lemma: Dumling.Lemma,
		dimension: Dumrel.DimensionId,
		value: string,
	) =>
		parseParadigmChange({
			lemma,
			change: {
				kind: "Contribute",
				dimension,
				value,
				provenance: "Produced",
			},
		}).success;

	test("accepts the forms a dictionary cites", () => {
		for (const [lemma, dimension, value] of [
			[fahren, "preterite", "fuhr"],
			[aufstehen, "preterite", "stand auf"],
			[verb("sich erinnern"), "preterite", "erinnerte"],
			[fahren, "present1", "fahre"],
			[fahren, "present2", "fährst"],
			[fahren, "present3", "fährt"],
			[abfahren, "present3", "fährt ab"],
			[verb("können"), "present1", "kann"],
			[fahren, "pastParticiple", "gefahren"],
			[abfahren, "pastParticiple", "abgefahren"],
			[verb("trompeten"), "pastParticiple", "trompetet"],
			[verb("bringen"), "subjunctivePast", "brächte"],
			[abfahren, "subjunctivePast", "führe ab"],
			[noun("Leute", "Masc"), "plural", "PluralOnly"],
		] as const)
			expect([value, contribute(lemma, dimension, value)]).toEqual([
				value,
				true,
			]);
	});

	test("refuses forms a dictionary never cites", () => {
		for (const [lemma, dimension, value] of [
			[fahren, "preterite", "fuhr ab"],
			[aufstehen, "preterite", "aufstand"],
			[aufstehen, "preterite", "stand"],
			[aufstehen, "preterite", "stand  auf"],
			[verb("sich erinnern"), "preterite", "erinnerte sich"],
			[verb("sich einmischen", "ein"), "preterite", "sich ein"],
			[fahren, "present2", "fährs"],
			[abfahren, "present3", "abfährt"],
			[fahren, "pastParticiple", "ist gefahren"],
			[fahren, "pastParticiple", "fahrend"],
			[abfahren, "pastParticiple", "gefahren"],
			[abfahren, "pastParticiple", "ab"],
			[fahren, "subjunctivePast", "fuhr"],
			[fahren, "subjunctivePast", "würde fahren"],
			[abfahren, "subjunctivePast", "abführe"],
			[noun("Haus", "Neut"), "preterite", "hauste"],
			[fahren, "plural", "Fahren"],
		] as const)
			expect([value, contribute(lemma, dimension, value)]).toEqual([
				value,
				false,
			]);
	});
});
