import type { ValidationOperation, ValidationOperations } from "common-utils";
import {
	emojiDescriptionError,
	englishValencyAttestationError,
	fusedMemberError,
	fusionError,
	germanAdpositionAttestationError,
	germanClosedClassSurfaceError,
	germanDeterminerCoreError,
	germanNounSurfaceError,
	germanPronounCoreError,
	germanValencyAttestationError,
	germanVerbalAttestationError,
	germanVerbalSurfaceError,
	hasMarkedFeature,
	hebrewValencyAttestationError,
	isEmojiDescription,
	isEnglishValencyAttestation,
	isFusedMember,
	isFusion,
	isGermanAdpositionAttestation,
	isGermanClosedClassSurface,
	isGermanDeterminerCore,
	isGermanNounSurface,
	isGermanPronounCore,
	isGermanValencyAttestation,
	isGermanVerbalAttestation,
	isGermanVerbalSurface,
	isHebrewValencyAttestation,
	isNounArticleAttestation,
	isSayingCanonicalForm,
	nonEmptyFeatureBagError,
	normalizeEmojiDescription,
	normalizeForm,
	nounArticleAttestationError,
	sayingCanonicalFormError,
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
	"dumling.de-adposition.attestation": check(
		isGermanAdpositionAttestation,
		germanAdpositionAttestationError,
	),
	"dumling.de-valency.attestation": check(
		isGermanValencyAttestation,
		germanValencyAttestationError,
	),
	"dumling.he-valency.attestation": check(
		isHebrewValencyAttestation,
		hebrewValencyAttestationError,
	),
	"dumling.en-valency.attestation": check(
		isEnglishValencyAttestation,
		englishValencyAttestationError,
	),
	"dumling.de-noun.surface": check(
		isGermanNounSurface,
		germanNounSurfaceError,
	),
	"dumling.noun-article.attestation": check(
		isNounArticleAttestation,
		nounArticleAttestationError,
	),
	"dumling.fusion": check(isFusion, fusionError),
	"dumling.fused-member": check(isFusedMember, fusedMemberError),
	"dumling.de-pronoun.core": check(
		isGermanPronounCore,
		germanPronounCoreError,
	),
	"dumling.de-determiner.core": check(
		isGermanDeterminerCore,
		germanDeterminerCoreError,
	),
	"dumling.de-closed-class.surface": check(
		isGermanClosedClassSurface,
		germanClosedClassSurfaceError,
	),
	"dumling.feature-bag.marked": check(
		hasMarkedFeature,
		nonEmptyFeatureBagError,
	),
	"dumling.saying.canonical-form": check(
		isSayingCanonicalForm,
		sayingCanonicalFormError,
	),
	"dumling.emoji-description": check(
		isEmojiDescription,
		emojiDescriptionError,
	),
	"dumling.normalize-form": (value) => ({
		value: normalizeForm(value as string),
	}),
	"dumling.normalize-emoji-description": (value) => ({
		value: normalizeEmojiDescription(value as string),
	}),
};
