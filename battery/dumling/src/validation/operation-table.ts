import {
	caselessValencyAttestationError,
	isCaselessValencyAttestation,
} from "./evidence-semantics.js";
import { languageValidationOperations } from "./languages/index.js";
import type { ValidationOperationEntry } from "./languages/types.js";
import {
	articleAttestationError,
	comparabilitySurfaceError,
	emojiDescriptionError,
	featureValueSetError,
	foreignSurfaceError,
	fusedMemberError,
	fusionError,
	hasMarkedFeature,
	isArticleAttestation,
	isComparabilitySurface,
	isEmojiDescription,
	isFeatureValueSet,
	isForeignSurface,
	isFusedMember,
	isFusion,
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
	isSurfaceSyncretism,
	isSurfaceSyncretismView,
	isSyncretismView,
	lemmaSyncretismError,
	surfaceSyncretismError,
	surfaceSyncretismViewError,
	syncretismViewError,
} from "./syncretism.js";

const universalOperations = [
	{
		construct: "custom",
		implementation: isComparabilitySurface,
		error: comparabilitySurfaceError,
		name: "dumling.comparability.surface",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isCaselessValencyAttestation,
		error: caselessValencyAttestationError,
		name: "dumling.caseless-valency.attestation",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isFeatureValueSet,
		error: featureValueSetError,
		name: "dumling.feature-value-set",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isArticleAttestation,
		error: articleAttestationError,
		name: "dumling.article.attestation",
		version: 2,
	},
	{
		construct: "custom",
		implementation: isForeignSurface,
		error: foreignSurfaceError,
		name: "dumling.foreign.surface",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isFusion,
		error: fusionError,
		name: "dumling.fusion",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isFusedMember,
		error: fusedMemberError,
		name: "dumling.fused-member",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isSyncretismView,
		error: syncretismViewError,
		name: "dumling.syncretism.view",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isLemmaSyncretism,
		error: lemmaSyncretismError,
		name: "dumling.syncretism.lemma",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isSurfaceSyncretismView,
		error: surfaceSyncretismViewError,
		name: "dumling.syncretism.surface-view",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isSurfaceSyncretism,
		error: surfaceSyncretismError,
		name: "dumling.syncretism.surface",
		version: 1,
	},
	{
		construct: "custom",
		implementation: hasMarkedFeature,
		error: nonEmptyFeatureBagError,
		name: "dumling.feature-bag.marked",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isSayingCanonicalForm,
		error: sayingCanonicalFormError,
		name: "dumling.saying.canonical-form",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isEmojiDescription,
		error: emojiDescriptionError,
		name: "dumling.emoji-description",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isVariantTagList,
		error: variantTagListError,
		name: "dumling.variant-tags.order",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isVariantTagCombination,
		error: variantTagCombinationError,
		name: "dumling.variant-tags.combination",
		version: 1,
	},
	{
		construct: "overwrite",
		implementation: normalizeForm,
		name: "dumling.normalize-form",
		version: 2,
	},
	{
		construct: "overwrite",
		implementation: normalizeEmojiDescription,
		name: "dumling.normalize-emoji-description",
		version: 1,
	},
] as const satisfies readonly ValidationOperationEntry[];

/**
 * Every Dumling validation operation, once: universal operations composed with
 * each language's registered validation operations. The runtime derives its
 * operation map from this table, and codegen registers it with the Zod
 * compiler (`codegen/operations.ts`) and names it in the emitted types.
 */
export const operationTable: readonly ValidationOperationEntry[] = [
	...universalOperations,
	...Object.values(languageValidationOperations).flat(),
];
