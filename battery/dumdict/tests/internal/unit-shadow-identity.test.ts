import { describe, expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import { shadowMatchesLemma } from "../../src/core/identity";
import { derivePendingEntryId } from "../../src/core/pending";

const circumposition = {
	unitKind: "Lemma",
	language: "de",
	family: "Locution",
	kind: "ADP",
	canonicalForm: "um … willen",
	coreFeatures: {},
} satisfies Dumling.Lemma<"de", "Locution", "ADP">;
const shadow = (canonicalForm: string) =>
	({
		language: "de",
		family: "Locution",
		kind: "ADP",
		canonicalForm,
	}) as Dumrel.UnitShadow & { language: "de" };

describe("Unit Shadow identity normalizes as Lemma identity does", () => {
	test("the Shadow um ... willen matches the Lemma um … willen", () => {
		expect(
			shadowMatchesLemma(shadow("um ... willen"), circumposition),
		).toBe(true);
		expect(shadowMatchesLemma(shadow("Um … willen"), circumposition)).toBe(
			true,
		);
	});

	test("the Shadows um ... willen and um … willen name one Pending Entry", () => {
		expect(derivePendingEntryId(shadow("um ... willen"))).toBe(
			derivePendingEntryId(shadow("um … willen")),
		);
	});
});
