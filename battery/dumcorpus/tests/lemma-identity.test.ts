import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { lemmaIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import { reflexivityUnit } from "../src/inventories/de/drill-down.js";
import { authoredMembers, authoredRealizations } from "../src/inventories.js";

interface FoundLemma {
	lemma: Dumling.Lemma;
	where: string;
}

/** Every Lemma `value` holds at any depth, and the path it was found at. */
function lemmasIn(value: unknown, where: string): FoundLemma[] {
	if (Array.isArray(value))
		return value.flatMap((item, index) =>
			lemmasIn(item, `${where}.${index}`),
		);
	if (value === null || typeof value !== "object") return [];
	const nested = Object.entries(value).flatMap(([key, item]) =>
		lemmasIn(item, `${where}.${key}`),
	);
	return "unitKind" in value && value.unitKind === "Lemma"
		? [{ lemma: value as Dumling.Lemma, where }, ...nested]
		: nested;
}

// Lemma identity ignores letter case, and the Canonical Form keeps one
// display casing, so one identity is never spelled two ways: LOL and lol are
// one INTJ, cited LOL (system ADR 0002).
test("no two Lemmas share Family, Kind, Core and case-folded Canonical Form but differ in spelling", () => {
	const directory = new URL("../records/", import.meta.url);
	const found = [
		...readdirSync(directory, { recursive: true, encoding: "utf8" })
			.filter((file) => file.endsWith(".json"))
			.flatMap((file) =>
				lemmasIn(
					JSON.parse(readFileSync(new URL(file, directory), "utf8")),
					file,
				),
			),
		...lemmasIn(authoredMembers, "authoredMembers"),
		...lemmasIn(authoredRealizations, "authoredRealizations"),
		...lemmasIn(reflexivityUnit, "reflexivityUnit"),
	];
	expect(found.length).toBeGreaterThan(1000);
	const spellings = new Map<string, Map<string, string>>();
	for (const { lemma, where } of found) {
		const identity = lemmaIdentityKey(lemma);
		const forms = spellings.get(identity) ?? new Map<string, string>();
		spellings.set(identity, forms);
		if (!forms.has(lemma.canonicalForm))
			forms.set(lemma.canonicalForm, where);
	}
	expect(
		[...spellings.values()]
			.filter((forms) => forms.size > 1)
			.map((forms) => Object.fromEntries(forms)),
	).toEqual([]);
});
