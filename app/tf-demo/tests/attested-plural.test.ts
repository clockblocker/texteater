import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import {
	attestedPluralPattern,
	uncoveredPluralPattern,
} from "../server/attestedPlural";

const mutter = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Mutter",
	coreFeatures: { gender: "Fem" },
} as const satisfies Dumling.Lemma<"de", "Lexeme", "NOUN">;

const surface = (
	normalizedSurface: string,
	grammaticalCase: "Nom" | "Acc" | "Dat" | "Gen",
	number: "Sing" | "Plur",
) =>
	({
		unitKind: "Surface",
		language: "de",
		normalizedSurface,
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: {
			case: grammaticalCase,
			gender: null,
			number,
		},
		lemma: mutter,
	}) as unknown as Dumling.Surface<"de">;

test("a plural noun Surface attests its Plural Pattern, except in the dative", () => {
	expect(attestedPluralPattern(surface("Muttern", "Acc", "Plur"))).toBe("En");
	expect(attestedPluralPattern(surface("Mütter", "Nom", "Plur"))).toBe(
		"UmlautOnly",
	);
	expect(attestedPluralPattern(surface("Müttern", "Dat", "Plur"))).toBeNull();
	expect(attestedPluralPattern(surface("Mutter", "Nom", "Sing"))).toBeNull();
});

test("an attested pattern is uncovered until the Reading's plural lists it, and never against a marker", () => {
	expect(uncoveredPluralPattern("S", {})).toBe("S");
	expect(uncoveredPluralPattern("S", { pluralPattern: ["En"] })).toBe("S");
	expect(
		uncoveredPluralPattern("S", { pluralPattern: ["En", "S"] }),
	).toBeNull();
	expect(
		uncoveredPluralPattern("S", { pluralPattern: "NoPlural" }),
	).toBeNull();
	expect(
		uncoveredPluralPattern("NoEnding", { pluralPattern: "PluralOnly" }),
	).toBeNull();
	expect(uncoveredPluralPattern(null, {})).toBeNull();
});
