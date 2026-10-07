import { expect, test } from "bun:test";
import {
	germanInseparablePrefixes,
	germanSeparablePrefixes,
} from "../src/inventories.js";

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
