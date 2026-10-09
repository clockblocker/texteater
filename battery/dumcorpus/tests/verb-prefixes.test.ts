import { expect, test } from "bun:test";
import {
	germanInseparablePrefixes,
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
