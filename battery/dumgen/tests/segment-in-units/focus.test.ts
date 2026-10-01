import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
	type FocusSet,
	focusPath,
	type LabSet,
	loadFocus,
} from "../../src/segment-in-units/lab/corpus.js";

const focus = JSON.parse(readFileSync(focusPath, "utf8")) as FocusSet;

test("the membership focus set lists each case its units name, once", () => {
	const cases = new Set(focus.units.map((unit) => unit.caseId));
	expect([...cases].sort()).toEqual([...focus.cases]);
	const keys = focus.units.map((unit) => `${unit.caseId}#${unit.unit}`);
	expect(new Set(keys).size).toBe(keys.length);
	expect(
		focus.units.every((unit) => unit.wrongByMajority || unit.flips),
	).toBe(true);
});

test("the focus set refuses a set it was not taken from", () => {
	const set = (hash: string): LabSet =>
		({
			name: focus.set.name,
			hash,
			cases: [],
		}) as unknown as LabSet;
	expect(loadFocus(set(focus.set.hash)).units.length).toBe(
		focus.units.length,
	);
	expect(() => loadFocus(set("0000000000000000"))).toThrow(
		"The membership focus set was taken from",
	);
});
