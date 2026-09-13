import type * as Dumling from "dumling/types";
import { parseReadingKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";

import { parseGermanReading } from "../../../server/operationalParsing";

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
): Dumling.Reading<"de"> {
	return parseGermanReading({
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
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
	source: Dumling.Reading<"de">,
	value: unknown,
): Dumrel.ReadingKnowledge<Dumling.Reading<"de">> {
	const parsed = parseReadingKnowledge({ source, knowledge: value ?? {} });
	if (!parsed.success) throw parsed.error;
	return parsed.value;
}
