import { readingSchema } from "dumling/schema";
import type { Reading } from "dumling/types";
import { type ReadingKnowledge, readingKnowledgeSchema } from "dumrel";

const unitReadingFamilies = new Set(["Lexeme", "Phraseme", "Morpheme"]);

export function isUnitReadingFamily(family: string): boolean {
	return unitReadingFamilies.has(family);
}

/** Reconstructs and validates the foundational Reading value at the database seam. */
export function projectReadingValue(
	reading: { readonly emojiDescription: string },
	lemma: {
		readonly language: string;
		readonly family: string;
		readonly kind: string;
		readonly canonicalForm: string;
		readonly coreFeatures: unknown;
	},
): Reading {
	return readingSchema.parse({
		lemma: {
			language: lemma.language,
			family: lemma.family,
			kind: lemma.kind,
			canonicalForm: lemma.canonicalForm,
			coreFeatures: lemma.coreFeatures,
		},
		emojiDescription: reading.emojiDescription,
	});
}

/** Validates stored identityless Knowledge without applying presentation policy. */
export function projectReadingKnowledge(
	value: unknown,
): ReadingKnowledge<"en"> {
	const knowledge = readingKnowledgeSchema.parse(value ?? {});
	if (
		knowledge.translations &&
		Object.keys(knowledge.translations).some(
			(language) => language !== "en",
		)
	) {
		throw new Error(
			"tf-demo Reading Knowledge only supports English translations.",
		);
	}
	return knowledge as ReadingKnowledge<"en">;
}
