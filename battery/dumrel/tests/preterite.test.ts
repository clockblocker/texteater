import { expect, test } from "bun:test";
import {
	applyKnowledgeChange,
	parseReadingKnowledge,
	selectKnowledge,
} from "dumrel";
import { houseReading, wartenReading } from "./fixtures.js";

const verbReading = (
	canonicalForm: string,
	hasSepPrefix: string | null = null,
) => ({
	...wartenReading,
	lemma: {
		...wartenReading.lemma,
		canonicalForm,
		coreFeatures: { hasSepPrefix, lexicallyReflexive: null },
	},
});
const wiegen = verbReading("wiegen");
const senden = verbReading("senden");
const aufstehen = verbReading("aufstehen", "auf");
const parse = (source: unknown, knowledge: unknown) =>
	parseReadingKnowledge({
		source: source as typeof wartenReading,
		knowledge: knowledge as never,
	});

test("a German VERB Reading stores its Präteritum forms, each once and as a dictionary cites it", () => {
	expect(parse(senden, { preterite: [" sandte", "sendete"] })).toEqual({
		success: true,
		value: { preterite: ["sandte", "sendete"] },
	});
	expect(parse(aufstehen, { preterite: ["stand auf"] }).success).toBe(true);
	for (const [source, preterite] of [
		[wiegen, []],
		[wiegen, ["wog", "wog"]],
		[wiegen, ["wog ab"]],
		[verbReading("sich erinnern"), ["erinnerte sich"]],
		[aufstehen, ["aufstand"]],
		[aufstehen, ["stand"]],
		[aufstehen, ["stand ab"]],
		[aufstehen, ["stand  auf"]],
		[aufstehen, ["stand\u00a0auf"]],
		[wiegen, ["wog\tab"]],
		[wiegen, ["wog", "Wog"]],
		[verbReading("sich erinnern"), ["sich"]],
		[verbReading("sich einmischen", "ein"), ["sich ein"]],
		[houseReading, ["wog"]],
		[{ ...wiegen, lemma: { ...wiegen.lemma, language: "en" } }, ["wog"]],
	] as const)
		expect([preterite, parse(source, { preterite }).success]).toEqual([
			preterite,
			false,
		]);
});

test("the Präteritum and the conjugation classes are checked apart (ADR 0038)", () => {
	// Forms kept after the classes were stored may attest another class.
	expect(
		parse(wiegen, { preterite: ["wog"], conjugationClass: ["Weak"] }),
	).toEqual({
		success: true,
		value: { preterite: ["wog"], conjugationClass: ["Weak"] },
	});
	expect(
		applyKnowledgeChange({
			source: senden,
			knowledge: { conjugationClass: ["Weak"] },
			change: {
				kind: "Contribute",
				aspect: "preterite",
				value: ["sandte"],
			},
		}).success,
	).toBe(true);
});

test("Contribute adds the forms a Reading lacks; Correct and Retract replace and remove them", () => {
	const apply = (knowledge: unknown, change: unknown) =>
		applyKnowledgeChange({
			source: senden,
			knowledge: knowledge as never,
			change,
		});
	expect(
		apply(
			{ preterite: ["sandte"] },
			{
				kind: "Contribute",
				aspect: "preterite",
				value: ["sendete", "sandte"],
			},
		),
	).toEqual({ success: true, value: { preterite: ["sandte", "sendete"] } });
	expect(
		apply(
			{ preterite: ["sandte", "sendete"] },
			{ kind: "Correct", aspect: "preterite", value: ["sendete"] },
		),
	).toEqual({ success: true, value: { preterite: ["sendete"] } });
	expect(
		apply(
			{ preterite: ["sandte"] },
			{ kind: "Retract", aspect: "preterite" },
		),
	).toEqual({ success: true, value: {} });
	expect(
		applyKnowledgeChange({
			source: houseReading,
			knowledge: {},
			change: { kind: "Contribute", aspect: "preterite", value: ["wog"] },
		}).success,
	).toBe(false);
});

test("German Lexeme verbs request their Präteritum and no other route does", () => {
	const request = (family: string, kind: string) => {
		const selected = selectKnowledge({
			route: { language: "de", family, kind } as never,
		});
		return selected.success && selected.value.preterite;
	};
	expect(request("Lexeme", "VERB")).toBeNull();
	expect(request("Lexeme", "NOUN")).toBeUndefined();
	expect(request("Locution", "VERB")).toBeUndefined();
});
