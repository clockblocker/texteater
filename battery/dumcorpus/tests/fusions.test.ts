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
