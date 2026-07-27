import { describe, expect, test } from "bun:test";
import {
	inverseRelationFor,
	isKnownRelation,
	relationFamilyFor,
} from "../../../src/core/relations/rules";
import type { LexicalRelation, MorphologicalRelation } from "../../../src/dto";

const lexicalRelations = [
	"synonym",
	"nearSynonym",
	"antonym",
	"hypernym",
	"hyponym",
	"meronym",
	"holonym",
] satisfies LexicalRelation[];

const morphologicalRelations = [
	"consistsOf",
	"usedIn",
	"derivedFrom",
	"sourceFor",
] satisfies MorphologicalRelation[];

describe("relation rules", () => {
	test("cover every relation with a family-preserving inverse pair", () => {
		for (const relation of lexicalRelations) {
			expect(isKnownRelation(relation)).toBe(true);
			expect(relationFamilyFor(relation)).toBe("lexical");
			const inverse = inverseRelationFor("lexical", relation);
			expect(inverseRelationFor("lexical", inverse)).toBe(relation);
		}

		for (const relation of morphologicalRelations) {
			expect(isKnownRelation(relation)).toBe(true);
			expect(relationFamilyFor(relation)).toBe("morphological");
			const inverse = inverseRelationFor("morphological", relation);
			expect(inverseRelationFor("morphological", inverse)).toBe(relation);
		}
	});

	test("rejects relation names outside the registry", () => {
		expect(isKnownRelation("unrelated")).toBe(false);
	});
});
