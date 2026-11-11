import { expect, test } from "bun:test";
import {
	germanAbbreviations,
	germanClitics,
	germanFusions,
} from "../src/inventories.js";

const surfaces = (surface: string | readonly string[]) =>
	typeof surface === "string" ? [surface] : surface;

test("no fusion, clitic or abbreviation spelling is listed twice", () => {
	const spellings = [
		...germanFusions.map(({ form }) => form),
		...germanClitics.map(({ clitic }) => clitic),
		...germanAbbreviations.map(({ text }) => text),
	];
	expect(
		spellings.filter(
			(spelling, index) => spellings.indexOf(spelling) !== index,
		),
	).toEqual([]);
});

test("every spelling, span and surface is NFC and trimmed", () => {
	const texts = [
		...germanFusions.flatMap(({ form, components, oneLiner }) => [
			form,
			oneLiner,
			...components.flatMap(({ span, surface }) => [span, surface]),
		]),
		...germanClitics.flatMap(({ clitic, surface, oneLiner }) => [
			clitic,
			oneLiner,
			...surfaces(surface),
		]),
		...germanAbbreviations.flatMap(({ text, surface, oneLiner }) => [
			text,
			oneLiner,
			...surfaces(surface),
		]),
	];
	for (const text of texts) {
		expect(text).toBe(text.normalize("NFC"));
		expect(text).toBe(text.trim());
		expect(text.length).toBeGreaterThan(0);
	}
});

test("a fusion's spans spell its form", () => {
	for (const { form, components } of germanFusions)
		expect(components.map(({ span }) => span).join("")).toBe(form);
});

test("a clitic carries its apostrophe, and an abbreviation ends with a dot", () => {
	for (const { clitic } of germanClitics) expect(clitic).toStartWith("'");
	for (const { text } of germanAbbreviations) expect(text).toEndWith(".");
});

const duFusions = germanFusions.filter(({ components }) =>
	components.some(({ role }) => role === "Pronoun"),
);

test("a verb + du fusion is its verb's du form without the final t, then te for du (#1338)", () => {
	expect(duFusions.map(({ form }) => form)).toContain("kannste");
	for (const { form, components } of duFusions) {
		const [verb, pronoun] = components;
		expect(verb?.role).toBe("Verb");
		expect(verb?.surface).toMatch(/st$/u);
		expect(verb?.span).toBe(verb?.surface.slice(0, -1));
		expect(pronoun).toEqual({ span: "te", surface: "du", role: "Pronoun" });
		expect(form).toBe(`${verb?.span}te`);
	}
});

test("no spelling a -te past tense or another word makes is listed as a verb + du fusion (#1338)", () => {
	const forms = new Set(germanFusions.map(({ form }) => form));
	for (const taken of [
		"musste",
		"sollte",
		"hasste",
		"küsste",
		"reiste",
		"wusste",
		"weißte",
		"haste",
		"machte",
		"hörte",
		"meinte",
	])
		expect(forms.has(taken)).toBe(false);
});
