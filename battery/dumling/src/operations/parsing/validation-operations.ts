import type {
	ParsingIssue,
	ValidationOperation,
	ValidationOperations,
} from "common-utils";
import {
	hasDistinctPair,
	hasGermanVerbInflectionSignal,
	hasMarkedInflectionFeature,
	hasMarkedSurfaceFeature,
	inflectionalFeaturesNonEmptyError,
	isCompactEmojiSequence,
	normalizeNfc,
	normalizeReadingLemma,
	surfaceFeaturesNonEmptyError,
	trimString,
} from "../../validation-semantics.js";

function customCheck(
	predicate: (value: never) => boolean,
	message: string,
): ValidationOperation {
	return (value) => ({
		issues: predicate(value as never)
			? []
			: [
					{
						code: "custom",
						message,
						path: [],
					} satisfies ParsingIssue,
				],
		value,
	});
}

export const dumlingValidationOperations = {
	"dumling.distinct-pair": customCheck(hasDistinctPair, "Invalid input"),
	"dumling.emoji.compact-sequence": customCheck(
		isCompactEmojiSequence,
		"Invalid input",
	),
	"dumling.german-verb-inflection.non-empty": customCheck(
		hasGermanVerbInflectionSignal,
		inflectionalFeaturesNonEmptyError(),
	),
	"dumling.inflectional-features.non-empty": customCheck(
		hasMarkedInflectionFeature,
		inflectionalFeaturesNonEmptyError(),
	),
	"dumling.normalize-nfc": (value) => ({
		value: normalizeNfc(value as string),
	}),
	"dumling.normalize-reading-lemma": (value) => ({
		value: normalizeReadingLemma(value),
	}),
	"dumling.surface-features.non-empty": customCheck(
		hasMarkedSurfaceFeature,
		surfaceFeaturesNonEmptyError(),
	),
	"dumling.trim-string": (value) => ({
		value: trimString(value as string),
	}),
} as const satisfies ValidationOperations;
