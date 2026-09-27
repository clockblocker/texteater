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

test("only a German NOUN Reading has a plural, each Plural Pattern listed once", () => {
	for (const pluralPattern of [
		["UmlautEr"],
		"NoPlural",
		"PluralOnly",
	] satisfies Dumrel.NounPlural[])
		expect(
			parseReadingKnowledge({
				source: houseReading,
				knowledge: { pluralPattern },
			}),
		).toEqual({ success: true, value: { pluralPattern } });
	for (const [source, pluralPattern] of [
		[houseReading, []],
		[houseReading, ["En", "En"]],
		[houseReading, ["Umlaut"]],
		[houseReading, "Uncountable"],
		[wartenReading, ["En"]],
		[{ ...houseReading, lemma: { ...houseLemma, language: "en" } }, ["S"]],
	] as const)
		expect(
			parseReadingKnowledge({
				source: source as typeof houseReading,
				knowledge: { pluralPattern } as never,
			}).success,
		).toBe(false);
});

test("Contribute accumulates Plural Patterns in vocabulary order", () => {
	const pizzas = applyKnowledgeChange({
		source: houseReading,
		knowledge: { pluralPattern: ["S"] },
		change: {
			kind: "Contribute",
			aspect: "pluralPattern",
			value: ["En", "S"],
		},
	});
	expect(pizzas).toEqual({
		success: true,
		value: { pluralPattern: ["En", "S"] },
	});
	const first = applyKnowledgeChange({
		source: houseReading,
		knowledge: {},
		change: {
			kind: "Contribute",
			aspect: "pluralPattern",
			value: "NoPlural",
		},
	});
	expect(first).toEqual({
		success: true,
		value: { pluralPattern: "NoPlural" },
	});
	expect(
		applyKnowledgeChange({
			source: houseReading,
			knowledge: {},
			change: {
				kind: "Correct",
				aspect: "pluralPattern",
				value: ["S", "En"],
			},
		}),
	).toEqual({ success: true, value: { pluralPattern: ["En", "S"] } });
});

test("a plural marker is atomic: Contribute conflicts, Correct replaces, Retract removes", () => {
	for (const [stored, value] of [
		["NoPlural", ["En"]],
		[["En"], "PluralOnly"],
		["NoPlural", "PluralOnly"],
	] satisfies [Dumrel.NounPlural, Dumrel.NounPlural][])
		expect(
			applyKnowledgeChange({
				source: houseReading,
				knowledge: { pluralPattern: stored },
				change: { kind: "Contribute", aspect: "pluralPattern", value },
			}).success,
		).toBe(false);
	expect(
		applyKnowledgeChange({
			source: houseReading,
			knowledge: { pluralPattern: "NoPlural" },
			change: {
				kind: "Contribute",
				aspect: "pluralPattern",
				value: "NoPlural",
			},
		}),
	).toEqual({ success: true, value: { pluralPattern: "NoPlural" } });
	expect(
		applyKnowledgeChange({
			source: houseReading,
			knowledge: { pluralPattern: "NoPlural" },
			change: {
				kind: "Correct",
				aspect: "pluralPattern",
				value: ["UmlautEr"],
			},
		}),
	).toEqual({ success: true, value: { pluralPattern: ["UmlautEr"] } });
	expect(
		applyKnowledgeChange({
			source: houseReading,
			knowledge: { pluralPattern: ["UmlautEr"] },
			change: { kind: "Retract", aspect: "pluralPattern" },
		}),
	).toEqual({ success: true, value: {} });
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: {},
			change: {
				kind: "Contribute",
				aspect: "pluralPattern",
				value: ["En"],
			},
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
	expect(noun.success && noun.value.pluralPattern).toBeNull();
	expect(verb.success && "pluralPattern" in verb.value).toBe(false);
});
