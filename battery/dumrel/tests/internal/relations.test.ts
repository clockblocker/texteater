import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
	inverseRelationFor,
	isKnownRelation,
	lexicalRelationsSchemaFor,
	proposedRelationSchemaFor,
	relationFamilyFor,
} from "../../src";
import type { LexicalRelation, MorphologicalRelation } from "../../src/types";

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

describe("relation registry", () => {
	test("covers every relation with a family-preserving inverse pair", () => {
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

describe("relation schemas", () => {
	test("validate relation maps without owning endpoint schemas", () => {
		const schema = lexicalRelationsSchemaFor(z.object({ id: z.string() }));
		expect(schema.parse({ synonym: [{ id: "reading-1" }] })).toEqual({
			synonym: [{ id: "reading-1" }],
		});
		expect(schema.safeParse({ unrelated: [] }).success).toBe(false);
	});

	test("correlate relation families with their endpoint shapes", () => {
		const schema = proposedRelationSchemaFor({
			reading: z.object({ id: z.string() }),
			lemma: z.object({ canonicalForm: z.string() }),
			pendingRef: z.object({ canonicalForm: z.string() }),
		});

		expect(
			schema.safeParse({
				relationFamily: "lexical",
				relation: "synonym",
				target: { kind: "existing", reading: { id: "reading-1" } },
			}).success,
		).toBe(true);
		expect(
			schema.safeParse({
				relationFamily: "lexical",
				relation: "derivedFrom",
				target: { kind: "existing", reading: { id: "reading-1" } },
			}).success,
		).toBe(false);
	});
});
