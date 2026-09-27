import { expect, test } from "bun:test";
import {
	applyKnowledgeChange,
	germanConjugationClass,
	parseReadingKnowledge,
	selectKnowledge,
} from "dumrel";
import { houseReading, wartenReading } from "./fixtures.js";

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
		["sich freuen", "freute sich", "Weak"],
		["sich gewöhnen", "gewöhnte", "Weak"],
		["Wiegen", "WOG", "Strong"],
	] as const)
		expect([
			infinitive,
			praeteritum,
			germanConjugationClass(infinitive, praeteritum),
		]).toEqual([infinitive, praeteritum, conjugationClass]);
});

test("only a German VERB Reading has a conjugation class, each class listed once", () => {
	expect(
		parseReadingKnowledge({
			source: wartenReading,
			knowledge: { conjugationClass: ["Weak", "Mixed"] },
		}),
	).toEqual({
		success: true,
		value: { conjugationClass: ["Weak", "Mixed"] },
	});
	for (const [source, conjugationClass] of [
		[wartenReading, []],
		[wartenReading, ["Weak", "Weak"]],
		[wartenReading, ["Irregular"]],
		[houseReading, ["Strong"]],
		[
			{
				...wartenReading,
				lemma: { ...wartenReading.lemma, language: "en" },
			},
			["Weak"],
		],
	] as const)
		expect(
			parseReadingKnowledge({
				source: source as typeof wartenReading,
				knowledge: { conjugationClass } as never,
			}).success,
		).toBe(false);
});

test("Contribute adds the classes a Reading lacks, in vocabulary order", () => {
	// A Full `senden` Reading with `sandte` gains Weak from `sendete`.
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { conjugationClass: ["Mixed"] },
			change: {
				kind: "Contribute",
				aspect: "conjugationClass",
				value: ["Weak"],
			},
		}),
	).toEqual({
		success: true,
		value: { conjugationClass: ["Weak", "Mixed"] },
	});
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { conjugationClass: ["Weak"] },
			change: {
				kind: "Contribute",
				aspect: "conjugationClass",
				value: ["Weak"],
			},
		}),
	).toEqual({ success: true, value: { conjugationClass: ["Weak"] } });
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { conjugationClass: ["Weak", "Mixed"] },
			change: {
				kind: "Correct",
				aspect: "conjugationClass",
				value: ["Strong"],
			},
		}),
	).toEqual({ success: true, value: { conjugationClass: ["Strong"] } });
	expect(
		applyKnowledgeChange({
			source: wartenReading,
			knowledge: { conjugationClass: ["Strong"] },
			change: { kind: "Retract", aspect: "conjugationClass" },
		}),
	).toEqual({ success: true, value: {} });
	expect(
		applyKnowledgeChange({
			source: houseReading,
			knowledge: {},
			change: {
				kind: "Contribute",
				aspect: "conjugationClass",
				value: ["Strong"],
			},
		}).success,
	).toBe(false);
});

test("German Lexeme verbs request their conjugation class and no other route does", () => {
	const request = (family: string, kind: string) => {
		const selected = selectKnowledge({
			route: { language: "de", family, kind } as never,
		});
		return selected.success && selected.value.conjugationClass;
	};
	expect(request("Lexeme", "VERB")).toBeNull();
	expect(request("Lexeme", "NOUN")).toBeUndefined();
	expect(request("Locution", "VERB")).toBeUndefined();
});
