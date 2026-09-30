import { expect, test } from "bun:test";
import {
	applyKnowledgeChange,
	germanPluralPattern,
	parseReadingKnowledge,
	selectKnowledge,
} from "dumrel";
import type * as Dumrel from "dumrel/types";
import { houseLemma, houseReading, wartenReading } from "./fixtures.js";

test("a German noun's plural derives its Plural Pattern from the singular", () => {
	for (const [singular, plural, pattern] of [
		["Lehrer", "Lehrer", "NoEnding"],
		["Mutter", "Mütter", "UmlautOnly"],
		["Apfel", "Äpfel", "UmlautOnly"],
		["Tag", "Tage", "E"],
		["Kenntnis", "Kenntnisse", "E"],
		["Bus", "Busse", "E"],
		["Bank", "Bänke", "UmlautE"],
		["Saal", "Säle", "UmlautE"],
		["Kind", "Kinder", "Er"],
		["Haus", "Häuser", "UmlautEr"],
		["Mutter", "Muttern", "En"],
		["Bank", "Banken", "En"],
		["Frau", "Frauen", "En"],
		["Blume", "Blumen", "En"],
		["Lehrerin", "Lehrerinnen", "En"],
		["Pizza", "Pizzen", "En"],
		["Museum", "Museen", "En"],
		["Virus", "Viren", "En"],
		["Pizza", "Pizzas", "S"],
		["Auto", "Autos", "S"],
		["Visum", "Visa", "Other"],
		["Komma", "Kommata", "Other"],
		["Mutter", "MÜTTER", "UmlautOnly"],
	] as const)
		expect([
			singular,
			plural,
			germanPluralPattern(singular, plural),
		]).toEqual([singular, plural, pattern]);
});

test("only a German NOUN Reading has a plural, each form listed once", () => {
	for (const plural of [
		["Häuser"],
		"NoPlural",
		"PluralOnly",
	] satisfies Dumrel.NounPlural[])
		expect(
			parseReadingKnowledge({
				source: houseReading,
				knowledge: { plural },
			}),
		).toEqual({ success: true, value: { plural } });
	for (const [source, plural] of [
		[houseReading, []],
		[houseReading, ["Häuser", "Häuser"]],
		[houseReading, [" "]],
		[houseReading, "Uncountable"],
		[wartenReading, ["Häuser"]],
		[
			{ ...houseReading, lemma: { ...houseLemma, language: "en" } },
			["houses"],
		],
	] as const)
		expect(
			parseReadingKnowledge({
				source: source as typeof houseReading,
				knowledge: { plural } as never,
			}).success,
		).toBe(false);
});

test("the stored forms, not a pattern, give back the plural: En covers Pizzen and Lehrerinnen", () => {
	for (const [singular, plural, patterns] of [
		["Pizza", ["Pizzen", "Pizzas"], ["En", "S"]],
		["Lehrerin", ["Lehrerinnen"], ["En"]],
		["Visum", ["Visa"], ["Other"]],
	] satisfies [string, Dumrel.NonEmptyStrings, Dumrel.PluralPattern[]][]) {
		const stored = parseReadingKnowledge({
			source: {
				...houseReading,
				lemma: { ...houseLemma, canonicalForm: singular },
			},
			knowledge: { plural },
		});
		expect(stored).toEqual({ success: true, value: { plural } });
		expect(
			plural.map((form) => germanPluralPattern(singular, form)),
		).toEqual(patterns);
	}
});

test("Contribute adds the plural forms a Reading lacks, in the order they arrive", () => {
	expect(
		applyKnowledgeChange({
			source: houseReading,
			knowledge: { plural: ["Pizzen"] },
			change: {
				kind: "Contribute",
				aspect: "plural",
				value: ["Pizzas", "Pizzen"],
			},
		}),
	).toEqual({ success: true, value: { plural: ["Pizzen", "Pizzas"] } });
	expect(
		applyKnowledgeChange({
			source: houseReading,
			knowledge: {},
			change: { kind: "Contribute", aspect: "plural", value: "NoPlural" },
		}),
	).toEqual({ success: true, value: { plural: "NoPlural" } });
	expect(
		applyKnowledgeChange({
			source: houseReading,
			knowledge: { plural: ["Pizzen"] },
			change: { kind: "Correct", aspect: "plural", value: ["Pizzas"] },
		}),
	).toEqual({ success: true, value: { plural: ["Pizzas"] } });
});

test("a plural marker is atomic: Contribute conflicts, Correct replaces, Retract removes", () => {
	for (const [stored, value] of [
		["NoPlural", ["Häuser"]],
		[["Häuser"], "PluralOnly"],
		["NoPlural", "PluralOnly"],
	] satisfies [Dumrel.NounPlural, Dumrel.NounPlural][])
		expect(
			applyKnowledgeChange({
				source: houseReading,
				knowledge: { plural: stored },
				change: { kind: "Contribute", aspect: "plural", value },
			}).success,
		).toBe(false);
	expect(
		applyKnowledgeChange({
			source: houseReading,
			knowledge: { plural: "NoPlural" },
			change: { kind: "Contribute", aspect: "plural", value: "NoPlural" },
		}),
	).toEqual({ success: true, value: { plural: "NoPlural" } });
	expect(
		applyKnowledgeChange({
			source: houseReading,
			knowledge: { plural: "NoPlural" },
			change: { kind: "Correct", aspect: "plural", value: ["Häuser"] },
		}),
	).toEqual({ success: true, value: { plural: ["Häuser"] } });
	expect(
		applyKnowledgeChange({
			source: houseReading,
			knowledge: { plural: ["Häuser"] },
			change: { kind: "Retract", aspect: "plural" },
		}),
	).toEqual({ success: true, value: {} });
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: {},
			change: { kind: "Contribute", aspect: "plural", value: ["Häuser"] },
		}).success,
	).toBe(false);
});

test("German nouns request their plural and no other route does", () => {
	const noun = selectKnowledge({
		route: { language: "de", family: "Lexeme", kind: "NOUN" },
	});
	const verb = selectKnowledge({
		route: { language: "de", family: "Lexeme", kind: "VERB" },
	});
	expect(noun.success && noun.value.plural).toBeNull();
	expect(verb.success && "plural" in verb.value).toBe(false);
});
