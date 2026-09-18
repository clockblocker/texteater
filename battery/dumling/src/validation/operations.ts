import type { ValidationOperation, ValidationOperations } from "common-utils";
import {
	emojiDescriptionError,
	germanNounAttestationError,
	germanNounSurfaceError,
	germanPronounCoreError,
	germanVerbalAttestationError,
	germanVerbalSurfaceError,
	hasMarkedFeature,
	isEmojiDescription,
	isGermanNounAttestation,
	isGermanNounSurface,
	isGermanPronounCore,
	isGermanVerbalAttestation,
	isGermanVerbalSurface,
	nonEmptyFeatureBagError,
	normalizeForm,
} from "./semantics.js";

function check(
	predicate: (value: never) => boolean,
	error: () => string,
): ValidationOperation {
	return (value) =>
		predicate(value as never)
			? { value }
			: {
					value,
					issues: [{ code: "custom", path: [], message: error() }],
				};
}
export const validationOperations: ValidationOperations = {
	"dumling.de-verbal.surface": check(
		isGermanVerbalSurface,
		germanVerbalSurfaceError,
	),
	"dumling.de-verbal.attestation": check(
		isGermanVerbalAttestation,
		germanVerbalAttestationError,
	),
	"dumling.de-noun.surface": check(
		isGermanNounSurface,
		germanNounSurfaceError,
	),
	"dumling.de-noun.attestation": check(
		isGermanNounAttestation,
		germanNounAttestationError,
	),
	"dumling.de-pronoun.core": check(
		isGermanPronounCore,
		germanPronounCoreError,
	),
	"dumling.feature-bag.marked": check(
		hasMarkedFeature,
		nonEmptyFeatureBagError,
	),
	"dumling.emoji-description": check(
		isEmojiDescription,
		emojiDescriptionError,
	),
	"dumling.normalize-form": (value) => ({
		value: normalizeForm(value as string),
	}),
};
