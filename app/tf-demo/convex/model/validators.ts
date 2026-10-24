import { type Infer, v } from "convex/values";
import type * as Dumling from "dumling/types";
import {
	directSemanticRelationValues,
	translationLanguageValues,
} from "dumrel";

const memberOrthographyValues = [
	"Standard",
	"Typo",
	"Fused",
	"Shorthand",
] as const;
const realizationCoverageValues = ["Full", "Partial"] as const;
const variantTagValues = [
	"Licensed",
	"Historical",
	"Regional",
	"Expressive",
] as const;
/** Dumrel stores the direct relations and projects each inverse. */
const semanticRelationValues = [
	...directSemanticRelationValues,
	"hyponym",
	"meronym",
	"exonym",
] as const;

import { READING_BLOCK_KIND_VALUES } from "../../shared/reading-block-layout";
import {
	SCROLL_LANGUAGE_VALUES,
	SUPPORTED_TARGET_LANGUAGE_VALUES,
} from "../../shared/supported-target-language";

import { literalUnion } from "./literalUnion";
import {
	familyValidator,
	type SameMembers,
	unitRouteValidator,
} from "./routeValidators";
import {
	segmentInputValidator,
	storedSegmentInputValidator,
} from "./segmentValidators";

export { literalUnion } from "./literalUnion";
export {
	familyValidator,
	isLemmaRoute,
	kindValidator,
} from "./routeValidators";
export {
	segmentInputValidator,
	segmentKindValidator,
	segmentResolutionStateValidator,
	storedSegmentInputValidator,
	storedSegmentValidator,
} from "./segmentValidators";

export const languageValidator = literalUnion(SCROLL_LANGUAGE_VALUES);

/**
 * A Sentence's Detected Language: a Scroll language, or `other` for any
 * language Intake does not name. An undetermined Sentence stores none.
 */
export const detectedLanguageValidator = literalUnion([
	...SCROLL_LANGUAGE_VALUES,
	"other",
]);

true satisfies SameMembers<
	(typeof variantTagValues)[number],
	Dumling.VariantTag
>;

export const grammaticalLanguageValidator = literalUnion(
	SUPPORTED_TARGET_LANGUAGE_VALUES,
);

/**
 * The Knowledge aspect a structural Shadow reference sits in. A Breakdown
 * piece or a Source refers to its part's Shadow until a Lemma with that
 * identity is stored (ADR 0050).
 */
export const structuralShadowAspectValidator = v.union(
	v.literal("breakdown"),
	v.literal("source"),
);
export type StructuralShadowAspect = Infer<
	typeof structuralShadowAspectValidator
>;

/**
 * Where a Section or Scroll sits in its Section's Codex: that Section, and
 * its order among the Section's Sections and Scrolls together. Absent at
 * the top of the Library.
 */
export const codexPlacementValidator = v.object({
	sectionId: v.id("sections"),
	order: v.number(),
});

/** A hidden Scroll that holds one Reading's Knowledge definition as a Sentence. */
export const scrollOriginValidator = v.object({
	kind: v.literal("Definition"),
	readingKey: v.string(),
});

export const definitionTextStateValidator = v.union(
	v.literal("Scheduled"),
	v.literal("Running"),
	v.literal("Ready"),
	v.literal("Failed"),
);

export const orthographyValidator = literalUnion(memberOrthographyValues);

/**
 * A written word holding several words (ADR 0035): its spelling and the
 * ordered components it stands for, each spelling its letters of the word.
 */
export const fusionValidator = v.object({
	spelling: v.string(),
	components: v.array(v.object({ span: v.string(), surface: v.string() })),
});

/**
 * One Attestation member. A `Fused` member is one piece of a fused word and
 * names the Fusion component it realizes; the other orthographies carry
 * nothing else (ADR 0035).
 */
export const attestationMemberValidator = v.union(
	v.object({
		attested: v.string(),
		orthography: v.union(
			v.literal("Standard"),
			v.literal("Typo"),
			v.literal("Shorthand"),
		),
	}),
	v.object({
		attested: v.string(),
		orthography: v.literal("Fused"),
		fusion: fusionValidator,
		component: v.number(),
	}),
);

/**
 * Where a noun's article is attested (ADR 0035): an owned member, a shared
 * article the noun does not own, or a Fusion component with no letters.
 */
export const articleEvidenceValidator = v.union(
	v.object({ kind: v.literal("Owned"), member: v.number() }),
	v.object({
		kind: v.literal("Shared"),
		article: attestationMemberValidator,
	}),
	v.object({
		kind: v.literal("Hidden"),
		fusion: fusionValidator,
		component: v.number(),
	}),
);

export const realizationCoverageValidator = literalUnion(
	realizationCoverageValues,
);

/** A Canonical spelling, or a Variant with the tags that license it. */
export const surfaceSpellingValidator = v.union(
	v.object({ kind: v.literal("Canonical") }),
	v.object({
		kind: v.literal("Variant"),
		variantTags: v.array(literalUnion(variantTagValues)),
	}),
);
export type StoredSurfaceSpelling = Infer<typeof surfaceSpellingValidator>;

export const translationLanguageValidator = literalUnion(
	translationLanguageValues,
);

export const grundformValidator = v.union(v.boolean(), v.null());

export const lemmaValueValidator = v.object({
	unitKind: v.literal("Lemma"),
	language: languageValidator,
	family: v.string(),
	kind: v.string(),
	canonicalForm: v.string(),
	coreFeatures: v.any(),
});

const surfaceValueValidator = v.object({
	unitKind: v.literal("Surface"),
	language: languageValidator,
	normalizedSurface: v.string(),
	spelling: surfaceSpellingValidator,

	surfaceFeatures: v.any(),
	inflectionalFeatures: v.optional(v.any()),
	lemma: lemmaValueValidator,
});

const attestationValueValidator = v.object({
	articleEvidence: v.optional(v.union(v.null(), articleEvidenceValidator)),
	expletiveEvidence: v.optional(v.any()),
	valencyEvidence: v.optional(v.any()),
	unitKind: v.literal("Attestation"),
	members: v.array(attestationMemberValidator),
	realizationCoverage: realizationCoverageValidator,
	surface: surfaceValueValidator,
});

/**
 * One biggest unit intake stores with its Sentence (Dumgen ADR 0007): the
 * indices of its Segments in the Sentence, ascending (#767), its route or
 * `Unresolved`, and any route variants, its route first.
 */
/**
 * The authored DET or PRON identity intake's route judge picked for a
 * one-piece unit (#864); a click builds the unit's Lemma from it.
 */
const closedClassIdentityValidator = v.object({
	kind: v.union(v.literal("DET"), v.literal("PRON")),
	canonicalForm: v.string(),
	pronType: v.union(v.string(), v.null()),
	poss: v.optional(v.literal("Yes")),
});

export const storedUnitValidator = v.object({
	segments: v.array(v.number()),
	route: v.union(v.literal("Unresolved"), unitRouteValidator),
	variants: v.optional(v.array(unitRouteValidator)),
	identity: v.optional(closedClassIdentityValidator),
});

export const sentenceInputValidator = v.object({
	segmentedSentenceId: v.string(),
	position: v.number(),
	paragraph: v.number(),
	/**
	 * The Detected Language, absent when undetermined. A Sentence in any but
	 * the Scroll's target language is a Plain Sentence: no Segments, no units.
	 */
	language: v.optional(detectedLanguageValidator),
	/** The Sentence's normalized text; its Segments concatenate to it. */
	stitchedText: v.string(),
	segments: v.array(storedSegmentInputValidator),
	/**
	 * Every ResolvableText Segment belongs to exactly one unit, unless the
	 * Sentence's segmentation failed, when there are none.
	 */
	units: v.array(storedUnitValidator),
	segmentationFailed: v.optional(v.literal(true)),
});

export const semanticRelationValidator = literalUnion(semanticRelationValues);
export const directSemanticRelationValidator = literalUnion(
	directSemanticRelationValues,
);

export const relationPublicationFingerprintsValidator = v.object({
	prompt: v.string(),
	schema: v.string(),
	evaluator: v.string(),
	model: v.string(),
	policy: v.string(),
});

export const relationTargetShadowValidator = v.object({
	language: grammaticalLanguageValidator,
	canonicalForm: v.string(),
	family: familyValidator,
	kind: v.string(),
});

export const relationProposalOutcomeValidator = v.union(
	v.literal("PendingShadow"),
	v.literal("DirectMatch"),
	v.literal("PublicationFailed"),
);

export const relationReviewStatusValidator = v.union(
	v.literal("NotSampled"),
	v.literal("Pending"),
	v.literal("Accepted"),
	v.literal("Rejected"),
);

export const relationPublicationRunValidator = v.object({
	runNumber: v.number(),
	requestedKinds: v.array(directSemanticRelationValidator),
	artifactPath: v.union(v.string(), v.null()),
	fingerprints: relationPublicationFingerprintsValidator,
	proposals: v.array(
		v.object({
			relation: directSemanticRelationValidator,
			targetShadow: relationTargetShadowValidator,
		}),
	),
});

export const knowledgeStatusValidator = v.union(
	v.literal("Partial"),
	v.literal("Full"),
);

export const knowledgeGenerationAttemptStateValidator = v.union(
	v.literal("Waiting"),
	v.literal("Scheduled"),
	v.literal("Running"),
	v.literal("Failed"),
	v.literal("Committed"),
	v.literal("LostRace"),
);

export const knowledgeSettingsValidator = v.object({
	transcription: v.boolean(),
	definition: v.boolean(),
	translations: v.object({ en: v.boolean(), ru: v.boolean() }),
	semanticRelations: v.object({
		synonym: v.boolean(),
		nearSynonym: v.boolean(),
		antonym: v.boolean(),
		nearAntonym: v.boolean(),
		hypernym: v.boolean(),
		holonym: v.boolean(),
		endonym: v.boolean(),
	}),
});

export const readingBlockKindValidator = literalUnion(
	READING_BLOCK_KIND_VALUES,
);

export const readingBlockRouteValidator = v.object({
	targetLanguage: grammaticalLanguageValidator,
	family: v.string(),
	kind: v.string(),
});

export const readingBlockLayoutValidator = v.object({
	order: v.array(readingBlockKindValidator),
	hidden: v.array(readingBlockKindValidator),
});

export const occurrenceAttestationInputValidator = v.object({
	memberSegmentIndices: v.array(v.number()),
	attestation: attestationValueValidator,
	surfaceKey: v.string(),
	lemmaKey: v.string(),
});

/** A Foreign Reading has no Emoji Description (ADR 0045). */
export const readingValueValidator = v.object({
	unitKind: v.literal("Reading"),
	lemma: lemmaValueValidator,
	emojiDescription: v.optional(v.string()),
});

export const catalogMissStageValidator = v.string();
export const catalogMissValidator = v.object({
	decision: v.literal("CatalogMiss"),
	stage: catalogMissStageValidator,
	route: v.string(),
	message: v.string(),
});

export const resolutionRouteProjectionValidator = v.object({
	scrollId: v.id("scrolls"),
	sentenceId: v.id("sentences"),
	stitchedText: v.string(),
	clickedSegmentIndex: v.number(),
	selectedSegment: v.string(),
});

export const resolutionGrammarProjectionValidator = v.object({
	language: v.optional(languageValidator),
	grundform: grundformValidator,
	members: v.array(attestationMemberValidator),
	/** Members realizing a valency marker, such as a governed preposition. */
	valencyMembers: v.array(v.number()),
	realizationCoverage: realizationCoverageValidator,
	normalizedSurface: v.string(),
	spelling: surfaceSpellingValidator,

	canonicalForm: v.string(),
	family: v.string(),
	kind: v.string(),
	/** Lets the resolving Reading Note take its headword tone before commit. */
	coreFeatures: v.any(),
});

export const resolutionReadingProjectionValidator = v.object({
	/** A Foreign Reading has none (ADR 0045). */
	emojiDescription: v.optional(v.string()),
	canonicalForm: v.string(),
	family: v.string(),
	kind: v.string(),
});

export const resolutionSessionGuardValidator = v.object({
	requestId: v.string(),
	runToken: v.string(),
	segmentId: v.id("segments"),
});

// The persistence envelope is intentionally structural. Domain validation happens
// before this internal plan reaches storage; the transaction enforces DB invariants.
export const dumdictPlannedChangeValidator = v.union(
	v.object({
		type: v.literal("createLemma"),
		record: v.any(),
		preconditions: v.array(v.any()),
	}),
	v.object({
		type: v.literal("createReading"),
		entry: v.any(),
		preconditions: v.array(v.any()),
	}),
	v.object({
		type: v.literal("patchReading"),
		reading: v.any(),
		ops: v.array(v.any()),
		preconditions: v.array(v.any()),
	}),
	v.object({
		type: v.literal("createOwnedSurface"),
		entry: v.any(),
		preconditions: v.array(v.any()),
	}),
	v.object({
		type: v.literal("createPendingSemanticRelation"),
		record: v.any(),
		preconditions: v.array(v.any()),
	}),
	v.object({
		type: v.literal("deletePendingSemanticRelation"),
		record: v.any(),
		preconditions: v.array(v.any()),
	}),
);

const encounterValidator = v.object({
	sentence: v.object({
		id: v.string(),
		language: grammaticalLanguageValidator,
		segments: v.array(segmentInputValidator),
	}),
	target: v.object({
		family: v.string(),
		kind: v.string(),
		memberSegmentIndices: v.array(v.number()),
	}),
});
export const resolvedGrammaticalValidator = v.object({
	decision: v.literal("Resolved"),
	language: grammaticalLanguageValidator,
	encounter: encounterValidator,
	attestation: attestationValueValidator,
});

/** Storage compatibility only; incoming proposals use the strict current contract. */
export const storedGrammaticalCheckpointValidator =
	resolvedGrammaticalValidator.extend({
		attestation: attestationValueValidator.extend({
			surface: surfaceValueValidator.extend({
				articleReference: v.optional(v.any()),
			}),
		}),
	});

export const readingCheckpointValidator = v.object({
	resolution: v.object({
		decision: v.union(v.literal("Reuse"), v.literal("New")),
		/** A Foreign Reading has none (ADR 0045). */
		emojiDescription: v.optional(v.string()),
		/** For a New: the stored Emoji Descriptions its judge saw (ADR 0031). */
		candidates: v.optional(v.array(v.string())),
	}),
	reading: readingValueValidator,
});

export const reusableAttestationValidator = v.object({
	attestationId: v.id("attestations"),
	grammatical: resolvedGrammaticalValidator,
	reading: readingValueValidator,
});

export const unresolvedClickCommitValidator = v.object({
	status: v.literal("Unresolved"),
	encounterId: v.id("visitorEncounters"),
	deduplicated: v.boolean(),
});

export const reusedResolvedClickCommitValidator = v.object({
	status: v.literal("Reused"),
	encounterId: v.id("visitorEncounters"),
	readingId: v.id("readings"),
	attestationId: v.id("attestations"),
	deduplicated: v.boolean(),
});

export const dictionaryPlanValidator = v.object({
	changes: v.array(dumdictPlannedChangeValidator),
});

const committedOccurrenceValidator = v.object({
	status: v.union(v.literal("Committed"), v.literal("Reused")),
	encounterId: v.id("visitorEncounters"),
	readingId: v.id("readings"),
	attestationId: v.id("attestations"),
	deduplicated: v.boolean(),
	occurrence: reusableAttestationValidator,
});

const lateResolvedClickCommitValidator = v.object({
	status: v.literal("Reused"),
	encounterId: v.id("visitorEncounters"),
	readingId: v.id("readings"),
	attestationId: v.id("attestations"),
	deduplicated: v.boolean(),
	occurrence: reusableAttestationValidator,
});

export const unresolvedClickPersistenceResultValidator = v.union(
	unresolvedClickCommitValidator,
	lateResolvedClickCommitValidator,
);

const membershipConflictValidator = v.object({
	status: v.literal("MembershipConflict"),
	code: v.literal("partialOverlap"),
	message: v.string(),
	conflictingAttestationIds: v.array(v.id("attestations")),
});

const dictionaryConflictValidator = v.object({
	status: v.literal("DictionaryConflict"),
	code: v.literal("semanticPreconditionFailed"),
	message: v.string(),
});

/**
 * A New refused because the Lemma gained a Reading its judge never saw;
 * nothing was written, and the click judges again over `candidates`, the
 * Lemma's stored Emoji Descriptions now (ADR 0031).
 */
const staleReadingValidator = v.object({
	status: v.literal("StaleReading"),
	candidates: v.array(v.string()),
});

const resolvedClickConflictValidator = v.union(
	membershipConflictValidator,
	dictionaryConflictValidator,
	staleReadingValidator,
);

export const resolvedClickCommitValidator = v.union(
	committedOccurrenceValidator,
	resolvedClickConflictValidator,
);

export const readingDecisionValidator = v.union(
	v.literal("Reuse"),
	v.literal("New"),
);

export const knowledgeProductionEvidenceValidator = v.object({
	request: v.any(),
	failures: v.array(
		v.object({
			aspect: v.string(),
			leaf: v.optional(v.string()),
			candidate: v.optional(v.string()),
			code: v.string(),
			message: v.string(),
		}),
	),
	operationTraces: v.array(v.string()),
});

export { type VisitorErrorData, visitorError } from "./visitorError";
