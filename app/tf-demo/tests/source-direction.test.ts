import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import {
	backPointingBase,
	type StoredBaseKnowledge,
} from "../convex/model/sourceDirection";
import { lemmaIdentityKey } from "../server/linguisticIdentity";

const FISCH = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Fisch",
	coreFeatures: { gender: "Masc" },
} as const satisfies Dumling.Lemma<"de", "Lexeme", "NOUN">;
const FISCH_SHADOW = {
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Fisch",
} as const;
const TISCH = { ...FISCH, canonicalForm: "Tisch" } as const;

/** A stored `fischen` Reading's Knowledge row with this Source, as stored. */
function fischen(source?: { readonly target: object }): StoredBaseKnowledge {
	const target = source?.target;
	return {
		ownerReadingKey: "fischen 🎣",
		knowledge: source ? { source } : {},
		...(target && "unitKind" in target
			? { sourceLemmaKey: lemmaIdentityKey(target) }
			: {}),
	};
}

test("Fisch ← fischen is rejected when fischen ← Fisch is stored (#1279)", () => {
	const base = fischen({ target: FISCH });
	expect(backPointingBase(FISCH, [base])).toBe(base);
});

test("a stored Source naming the word as a Unit Shadow points back too", () => {
	const base = fischen({ target: FISCH_SHADOW });
	expect(backPointingBase(FISCH, [base])).toBe(base);
	// The Shadow matches without letter case, as it resolves.
	const folded = fischen({
		target: { ...FISCH_SHADOW, canonicalForm: "FISCH" },
	});
	expect(backPointingBase(FISCH, [folded])).toBe(folded);
});

test("a base with no Source or a Source pointing elsewhere is no conflict", () => {
	expect(backPointingBase(FISCH, [fischen()])).toBeUndefined();
	expect(
		backPointingBase(FISCH, [fischen({ target: TISCH })]),
	).toBeUndefined();
	expect(
		backPointingBase(FISCH, [
			fischen({ target: { ...FISCH_SHADOW, kind: "PROPN" } }),
		]),
	).toBeUndefined();
	// Same route and form, other Core Features: another Lemma.
	expect(
		backPointingBase(FISCH, [
			fischen({ target: { ...FISCH, coreFeatures: { gender: "Fem" } } }),
		]),
	).toBeUndefined();
});

test("a base that is a pending Shadow has no stored Readings, so no conflict", () => {
	expect(backPointingBase(FISCH, [])).toBeUndefined();
});
