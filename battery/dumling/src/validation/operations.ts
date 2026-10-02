import type { ValidationOperation, ValidationOperations } from "common-utils";
import {
	articleAttestationError,
	comparabilitySurfaceError,
	emojiDescriptionError,
	englishValencyAttestationError,
	foreignSurfaceError,
	fusedMemberError,
	fusionError,
	germanAdpositionAttestationError,
	germanClosedClassSurfaceError,
	germanDeterminerCoreError,
	germanNounSurfaceError,
	germanParticleCoreError,
	germanPronounCoreError,
	germanProperNounSurfaceError,
	germanValencyAttestationError,
	germanVerbalAttestationError,
	germanVerbalSurfaceError,
	hasMarkedFeature,
	hebrewValencyAttestationError,
	isArticleAttestation,
	isComparabilitySurface,
	isEmojiDescription,
	isEnglishValencyAttestation,
	isForeignSurface,
	isFusedMember,
	isFusion,
	isGermanAdpositionAttestation,
	isGermanClosedClassSurface,
	isGermanDeterminerCore,
	isGermanNounSurface,
	isGermanParticleCore,
	isGermanPronounCore,
	isGermanProperNounSurface,
	isGermanValencyAttestation,
	isGermanVerbalAttestation,
	isGermanVerbalSurface,
	isHebrewValencyAttestation,
	isSayingCanonicalForm,
	isVariantTagCombination,
	isVariantTagList,
	nonEmptyFeatureBagError,
	normalizeEmojiDescription,
	normalizeForm,
	sayingCanonicalFormError,
	variantTagCombinationError,
	variantTagListError,
} from "./semantics.js";
import {
	isLemmaSyncretism,
	isSyncretismView,
	lemmaSyncretismError,
	syncretismViewError,
} from "./syncretism.js";

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
	"dumling.comparability.surface": check(
		isComparabilitySurface,
		comparabilitySurfaceError,
	),
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
	"dumling.de-proper-noun.surface": check(
		isGermanProperNounSurface,
		germanProperNounSurfaceError,
	),
	"dumling.article.attestation": check(
		isArticleAttestation,
		articleAttestationError,
	),
	"dumling.foreign.surface": check(isForeignSurface, foreignSurfaceError),
	"dumling.fusion": check(isFusion, fusionError),
	"dumling.fused-member": check(isFusedMember, fusedMemberError),
	"dumling.de-pronoun.core": check(
		isGermanPronounCore,
		germanPronounCoreError,
	),
	"dumling.syncretism.view": check(isSyncretismView, syncretismViewError),
	"dumling.syncretism.lemma": check(isLemmaSyncretism, lemmaSyncretismError),
	"dumling.de-determiner.core": check(
		isGermanDeterminerCore,
		germanDeterminerCoreError,
	),
	"dumling.de-particle.core": check(
		isGermanParticleCore,
		germanParticleCoreError,
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
	"dumling.variant-tags.order": check(isVariantTagList, variantTagListError),
	"dumling.variant-tags.combination": check(
		isVariantTagCombination,
		variantTagCombinationError,
	),
	"dumling.normalize-form": (value) => ({
		value: normalizeForm(value as string),
	}),
	"dumling.normalize-emoji-description": (value) => ({
		value: normalizeEmojiDescription(value as string),
	}),
};
