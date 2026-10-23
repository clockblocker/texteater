import { expect, test } from "bun:test";
import { germanSeparableLexemeParts } from "../src/inventories/de/verb-prefixes.js";
import {
	germanInseparablePrefixes,
	germanSeparableParticles,
	germanSeparablePrefixes,
} from "../src/inventories.js";
import { loadBreakdownRecords, loadSpecRecords } from "../src/load.js";

const lists = { germanSeparablePrefixes, germanInseparablePrefixes };

test("no prefix is both separable and inseparable", () => {
	expect(
		[...germanInseparablePrefixes].filter((prefix) =>
			germanSeparablePrefixes.has(prefix),
		),
	).toEqual([]);
});

test("no separable prefix is both a true particle and a Lexeme first part", () => {
	expect(
		[...germanSeparableParticles].filter((prefix) =>
			germanSeparableLexemeParts.has(prefix),
		),
	).toEqual([]);
});

test("the separable prefixes are the true particles and the Lexeme first parts", () => {
	expect(germanSeparablePrefixes.size).toBe(
		germanSeparableParticles.size + germanSeparableLexemeParts.size,
	);
	for (const prefix of germanSeparablePrefixes)
		expect(
			germanSeparableParticles.has(prefix) ||
				germanSeparableLexemeParts.has(prefix),
		).toBe(true);
});

test("the true particles include the compound particles and the ADR's examples", () => {
	for (const particle of ["ab", "an", "auf", "aus", "ein", "hinaus", "dar"])
		expect(germanSeparableParticles.has(particle)).toBe(true);
	for (const part of [
		"teil",
		"kennen",
		"fest",
		"bekannt",
		"bereit",
		"flach",
		"groß",
	])
		expect(germanSeparableLexemeParts.has(part)).toBe(true);
});

test("every verb prefix is lowercase NFC", () => {
	for (const [name, list] of Object.entries(lists))
		for (const prefix of list)
			expect(`${name}: ${prefix}`).toBe(
				`${name}: ${prefix.normalize("NFC").toLocaleLowerCase("de")}`,
			);
});

/** Every hasSepPrefix value anywhere in a value: Lemmas, relation targets. */
function sepPrefixesIn(value: unknown): string[] {
	if (Array.isArray(value)) return value.flatMap(sepPrefixesIn);
	if (typeof value !== "object" || value === null) return [];
	return Object.entries(value).flatMap(([key, inner]) =>
		key === "hasSepPrefix" && typeof inner === "string"
			? [inner]
			: sepPrefixesIn(inner),
	);
}

test("every German gold hasSepPrefix is a separable prefix", () => {
	const german = [...loadSpecRecords(), ...loadBreakdownRecords()].filter(
		(record) => record.language === "de",
	);
	const named = new Set(german.flatMap(sepPrefixesIn));
	expect(named.size).toBeGreaterThan(40);
	expect(
		[...named].filter((prefix) => !germanSeparablePrefixes.has(prefix)),
	).toEqual([]);
});
