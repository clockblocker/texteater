import { expect, test } from "bun:test";
import { readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import { licenceGroups, licensed, migratePrincipalParts } from "dumrel";

const lemma = (
	kind: "NOUN" | "VERB",
	canonicalForm: string,
	coreFeatures: Record<string, unknown>,
) =>
	({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind,
		canonicalForm,
		coreFeatures,
	}) as Dumling.Lemma;
const reading = (source: Dumling.Lemma, emojiDescription: string) =>
	({
		unitKind: "Reading",
		lemma: source,
		emojiDescription,
	}) as Dumling.Reading;

const bank = lemma("NOUN", "Bank", { gender: "Fem" });
const bench = reading(bank, "🪑");
const money = reading(bank, "🏦");
const game = reading(bank, "🎲");

test("each Reading's stored forms pool into variants it licenses explicitly; one that stored none is Unstated", () => {
	const migrated = migratePrincipalParts({
		lemma: bank,
		readings: [
			{
				reading: bench,
				knowledge: { plural: ["Bänke"], definition: "Sitz" },
			},
			{ reading: money, knowledge: { plural: ["Banken"] } },
			{ reading: game, knowledge: {} },
		],
	});
	if (!migrated.success) throw migrated.error;
	const { paradigm, readings } = migrated.value;
	expect(paradigm).toEqual({
		dimensions: {
			plural: {
				variants: [
					{ id: "banken", value: "Banken", provenance: "Migrated" },
					{ id: "bänke", value: "Bänke", provenance: "Migrated" },
				],
				licences: {
					[readingIdentityKey(bench)]: ["bänke"],
					[readingIdentityKey(money)]: ["banken"],
				},
			},
		},
	});
	expect(licensed(paradigm, "plural", readingIdentityKey(game))).toEqual([
		"banken",
		"bänke",
	]);
	expect(readings).toEqual([
		{ reading: bench, knowledge: { definition: "Sitz" } },
		{ reading: money, knowledge: {} },
		{ reading: game, knowledge: {} },
	]);
	expect(
		licenceGroups(paradigm, [bench, money, game].map(readingIdentityKey)),
	).toHaveLength(3);
});

test("a verb's Präsens singular splits by person, and a conjugation class without forms is dropped", () => {
	const fahren = lemma("VERB", "abfahren", {
		hasSepPrefix: "ab",
		lexicallyReflexive: null,
	});
	const leave = reading(fahren, "🚉");
	const migrated = migratePrincipalParts({
		lemma: fahren,
		readings: [
			{
				reading: leave,
				knowledge: {
					conjugationClass: ["Strong"],
					preterite: ["fuhr ab"],
					presentSingular: {
						first: ["fahre ab"],
						second: ["fährst ab"],
						third: ["fährt ab"],
					},
					pastParticiple: ["abgefahren"],
					subjunctivePast: ["führe ab"],
				},
			},
		],
	});
	if (!migrated.success) throw migrated.error;
	const key = readingIdentityKey(leave);
	expect(
		Object.fromEntries(
			Object.entries(migrated.value.paradigm.dimensions).map(
				([dimension, stored]) => [dimension, stored?.licences[key]],
			),
		),
	).toEqual({
		preterite: ["fuhr ab"],
		present1: ["fahre ab"],
		present2: ["fährst ab"],
		present3: ["fährt ab"],
		pastParticiple: ["abgefahren"],
		subjunctivePast: ["führe ab"],
	});
	const classOnly = migratePrincipalParts({
		lemma: fahren,
		readings: [
			{ reading: leave, knowledge: { conjugationClass: ["Strong"] } },
		],
	});
	expect(classOnly).toEqual({
		success: true,
		value: {
			paradigm: { dimensions: {} },
			readings: [{ reading: leave, knowledge: {} }],
		},
	});
});

test("a marker migrates as a variant: Wasser 💧 NoPlural, 🧴 Wässer", () => {
	const wasser = lemma("NOUN", "Wasser", { gender: "Neut" });
	const drink = reading(wasser, "💧");
	const sorts = reading(wasser, "🧴");
	const migrated = migratePrincipalParts({
		lemma: wasser,
		readings: [
			{ reading: drink, knowledge: { plural: "NoPlural" } },
			{ reading: sorts, knowledge: { plural: ["Wässer"] } },
		],
	});
	expect(
		migrated.success &&
			migrated.value.paradigm.dimensions.plural?.licences[
				readingIdentityKey(drink)
			],
	).toEqual(["NoPlural"]);
});

test("the result is deterministic whatever the Readings' order", () => {
	const pizza = lemma("NOUN", "Pizza", { gender: "Fem" });
	const food = reading(pizza, "🍕");
	const slice = reading(pizza, "🫓");
	const entries = [
		{ reading: food, knowledge: { plural: ["Pizzen"] } },
		{ reading: slice, knowledge: { plural: ["PIZZEN", "Pizzas"] } },
	];
	const forward = migratePrincipalParts({ lemma: pizza, readings: entries });
	const backward = migratePrincipalParts({
		lemma: pizza,
		readings: [...entries].reverse(),
	});
	if (!forward.success || !backward.success) throw Error("Expected success");
	expect(forward.value.paradigm).toEqual(backward.value.paradigm);
});

test("a form the Paradigm refuses, or Knowledge that fails to parse, fails the whole migration", () => {
	const fahren = lemma("VERB", "fahren", {
		hasSepPrefix: null,
		lexicallyReflexive: null,
	});
	const drive = reading(fahren, "🚗");
	for (const knowledge of [
		{ subjunctivePast: ["fuhr"] },
		{ preterite: "fuhr" },
		{ definition: 3 },
	])
		expect(
			migratePrincipalParts({
				lemma: fahren,
				readings: [{ reading: drive, knowledge }],
			}).success,
		).toBe(false);
});
