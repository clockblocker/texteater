import type { Reading } from "dumling/types";
import {
	parseAsReadingKnowledge,
	type ReadingKnowledge,
	type TranslationLanguage,
} from "dumrel";

import {
	parseGermanReading,
	unwrapOperationalParse,
} from "../../../server/operationalParsing";

export { isUnitReadingFamily } from "./unitReadingFamilies";

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
): Reading<"de"> {
	return parseGermanReading({
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
): ReadingKnowledge<TranslationLanguage> {
	const knowledge = unwrapOperationalParse<ReadingKnowledge>(
		parseAsReadingKnowledge(value ?? {}),
	);
	if (
		knowledge.translations &&
		Object.keys(knowledge.translations).some(
			(language) => language !== "en" && language !== "ru",
		)
	) {
		throw new Error(
			"tf-demo Reading Knowledge only supports English and Russian translations.",
		);
	}
	return knowledge as ReadingKnowledge<TranslationLanguage>;
}
