import { expect, test } from "bun:test";
import { germanPluralPattern } from "dumrel";
import type * as Dumrel from "dumrel/types";

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

test("the stored forms, not a pattern, give back the plural: En covers Pizzen and Lehrerinnen", () => {
	for (const [singular, plural, patterns] of [
		["Pizza", ["Pizzen", "Pizzas"], ["En", "S"]],
		["Lehrerin", ["Lehrerinnen"], ["En"]],
		["Frau", ["Frauen"], ["En"]],
		["Visum", ["Visa"], ["Other"]],
	] satisfies [string, string[], Dumrel.PluralPattern[]][])
		expect(
			plural.map((form) => germanPluralPattern(singular, form)),
		).toEqual(patterns);
});
