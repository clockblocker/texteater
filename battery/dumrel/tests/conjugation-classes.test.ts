import { expect, test } from "bun:test";
import { germanConjugationClass } from "dumrel";

test("a Präteritum form derives the verb's conjugation class from its stem", () => {
	for (const [infinitive, praeteritum, conjugationClass] of [
		["wiegen", "wog", "Strong"],
		["wiegen", "wiegte", "Weak"],
		["gehen", "ging", "Strong"],
		["werden", "wurde", "Strong"],
		["arbeiten", "arbeitete", "Weak"],
		["wandern", "wanderte", "Weak"],
		["atmen", "atmete", "Weak"],
		["bringen", "brachte", "Mixed"],
		["kennen", "kannte", "Mixed"],
		["denken", "dachte", "Mixed"],
		["senden", "sandte", "Mixed"],
		["senden", "sendete", "Weak"],
		["aufstehen", "stand auf", "Strong"],
		["aufstehen", "aufstand", "Strong"],
		["abholen", "holte ab", "Weak"],
		["abholen", "holte", "Weak"],
		["abholen", "abholte", "Weak"],
		["anerkennen", "erkannte an", "Mixed"],
		["freuen", "freute", "Weak"],
		["gewöhnen", "gewöhnte", "Weak"],
		["Wiegen", "WOG", "Strong"],
	] as const)
		expect([
			infinitive,
			praeteritum,
			germanConjugationClass(infinitive, praeteritum),
		]).toEqual([infinitive, praeteritum, conjugationClass]);
});
