import { v } from "convex/values";
import {
	directSemanticRelationValues,
	translationLanguageValues,
} from "dumrel";

const enabledSegmentationLanguageValues = ["de", "en", "he"] as const;
const grammaticalResolutionLanguageValues = ["de"] as const;
const segmentKindValues = [
	"ResolvableText",
	"OpaqueText",
	"Whitespace",
	"Punctuation",
] as const;
const memberOrthographyValues = ["Standard", "Typo"] as const;
const realizationCoverageValues = ["Full", "Partial"] as const;
const surfaceSpellingValues = ["Canonical", "Variant"] as const;
const semanticRelationValues = [
	...directSemanticRelationValues,
	"hyponym",
	"meronym",
] as const;

import { READING_BLOCK_KIND_VALUES } from "../../shared/reading-block-layout";

function literalUnion<const Value extends string>(
	values: readonly [Value, ...Value[]],
) {
	const [first, ...rest] = values;
	return v.union(v.literal(first), ...rest.map((value) => v.literal(value)));
}

export const languageValidator = literalUnion(
	enabledSegmentationLanguageValues,
);

export const grammaticalLanguageValidator = v.literal(
	grammaticalResolutionLanguageValues[0],
);

export const segmentKindValidator = literalUnion(segmentKindValues);

export const segmentResolutionStateValidator = v.union(
	v.object({
		kind: v.literal("Active"),
		activeSessionCount: v.number(),
	}),
	v.object({ kind: v.literal("Unresolved") }),
	v.object({ kind: v.literal("PermanentFailure") }),
);

/** A hidden Text that holds one Reading's Knowledge definition as a Sentence. */
export const textOriginValidator = v.object({
	kind: v.literal("Definition"),
	readingKey: v.string(),
});

export const definitionTextStateValidator = v.union(
	v.literal("Scheduled"),
	v.literal("Running"),
	v.literal("Ready"),
	v.literal("Failed"),
);

export const segmentInputValidator = v.object({
	kind: segmentKindValidator,
	text: v.string(),
});

export const orthographyValidator = literalUnion(memberOrthographyValues);

export const realizationCoverageValidator = literalUnion(
	realizationCoverageValues,
);

export const surfaceSpellingValidator = literalUnion(surfaceSpellingValues);

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

export const surfaceValueValidator = v.object({
	unitKind: v.literal("Surface"),
	language: languageValidator,
	normalizedSurface: v.string(),
	spelling: surfaceSpellingValidator,

	surfaceFeatures: v.any(),
	articleReference: v.optional(v.any()),
	inflectionalFeatures: v.optional(v.any()),
	lemma: lemmaValueValidator,
});

export const attestationValueValidator = v.object({
	articleEvidence: v.optional(v.any()),
	unitKind: v.literal("Attestation"),
	members: v.array(
		v.object({
			attested: v.string(),
			orthography: orthographyValidator,
		}),
	),
	realizationCoverage: realizationCoverageValidator,
	surface: surfaceValueValidator,
});

export const sentenceInputValidator = v.object({
	segmentedSentenceId: v.string(),
	position: v.number(),
	language: languageValidator,
	stitchedText: v.string(),
	segments: v.array(segmentInputValidator),
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
	language: v.literal("de"),
	canonicalForm: v.string(),
	family: v.union(
		v.literal("Lexeme"),
		v.literal("Phraseme"),
		v.literal("Morpheme"),
		v.literal("Construction"),
	),
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
	morphologicalTree: v.boolean(),
	lexicalBreakdown: v.boolean(),
	semanticRelations: v.object({
		synonym: v.boolean(),
		nearSynonym: v.boolean(),
		antonym: v.boolean(),
		nearAntonym: v.boolean(),
		hypernym: v.boolean(),
		holonym: v.boolean(),
	}),
});

export const storedKnowledgeSettingsValidator = knowledgeSettingsValidator;

export const readingBlockKindValidator = literalUnion(
	READING_BLOCK_KIND_VALUES,
);

export const readingBlockRouteValidator = v.object({
	targetLanguage: v.literal("de"),
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

export const readingValueValidator = v.object({
	unitKind: v.literal("Reading"),
	lemma: lemmaValueValidator,
	emojiDescription: v.string(),
});

export const catalogMissStageValidator = v.string();
export const catalogMissValidator = v.object({
	decision: v.literal("CatalogMiss"),
	stage: catalogMissStageValidator,
	route: v.string(),
	message: v.string(),
});

export const resolutionProgressValidator = v.union(
	v.literal("Starting"),
	v.literal("RouteAvailable"),
	v.literal("GrammarAvailable"),
	v.literal("ReadingAvailable"),
	v.literal("Committing"),
);

export const resolutionActivityValidator = v.union(
	v.literal("Scheduled"),
	v.literal("Running"),
	v.literal("WaitingForRetry"),
	v.literal("Terminal"),
);

export const resolutionOutcomeValidator = v.union(
	v.literal("Complete"),
	v.literal("Unresolved"),
	v.literal("PermanentFailure"),
);

const activeResolutionActivityValidator = v.union(
	v.literal("Scheduled"),
	v.literal("Running"),
	v.literal("WaitingForRetry"),
);

export const resolutionLifecycleValidator = v.union(
	v.object({
		state: v.literal("Active"),
		progress: resolutionProgressValidator,
		activity: activeResolutionActivityValidator,
	}),
	v.object({
		state: v.literal("Terminal"),
		progress: v.literal("Committing"),
		outcome: v.literal("Complete"),
	}),
	v.object({
		state: v.literal("Terminal"),
		progress: resolutionProgressValidator,
		outcome: v.literal("Unresolved"),
	}),
	v.object({
		state: v.literal("Terminal"),
		progress: resolutionProgressValidator,
		outcome: v.literal("PermanentFailure"),
	}),
);

export const generationFailureCategoryValidator = v.union(
	v.literal("Network"),
	v.literal("RateLimited"),
	v.literal("ProviderUnavailable"),
	v.literal("RequestRejected"),
	v.literal("InvalidOutput"),
	v.literal("Refusal"),
	v.literal("BudgetExhausted"),
);

export const resolutionFailureCodeValidator = v.union(
	generationFailureCategoryValidator,
	v.literal("CatalogMiss"),
	v.literal("Internal"),
);

export const safeGenerationFailureValidator = v.object({
	category: generationFailureCategoryValidator,
	retryable: v.boolean(),
	status: v.optional(v.number()),
	providerCode: v.optional(v.string()),
	providerRequestId: v.optional(v.string()),
	retryAfterMs: v.optional(v.number()),
	attempts: v.number(),
});

export const resolutionPhaseValidator = v.union(
	v.literal("Route"),
	v.literal("Grammar"),
	v.literal("Reading"),
	v.literal("Commit"),
);

export const resolutionGenerationEventValidator = v.union(
	v.object({
		kind: v.literal("TraceRecorded"),
		requestId: v.string(),
		runToken: v.string(),
		phase: resolutionPhaseValidator,
		traceJson: v.string(),
	}),
	v.object({
		kind: v.literal("AttemptStarted"),
		requestId: v.string(),
		runToken: v.string(),
		phase: resolutionPhaseValidator,
		attempt: v.number(),
		model: v.string(),
	}),
	v.object({
		kind: v.literal("AttemptFailed"),
		requestId: v.string(),
		runToken: v.string(),
		phase: resolutionPhaseValidator,
		failure: safeGenerationFailureValidator,
	}),
	v.object({
		kind: v.literal("RetryScheduled"),
		requestId: v.string(),
		runToken: v.string(),
		phase: resolutionPhaseValidator,
		attempt: v.number(),
		delayMs: v.number(),
	}),
	v.object({
		kind: v.literal("Succeeded"),
		requestId: v.string(),
		runToken: v.string(),
		phase: resolutionPhaseValidator,
		attempt: v.number(),
		latencyMs: v.number(),
		providerRequestId: v.optional(v.string()),
	}),
);

export const resolutionRunStateValidator = v.union(
	v.literal("Running"),
	v.literal("Failed"),
	v.literal("Succeeded"),
);

export const resolutionRouteProjectionValidator = v.object({
	textId: v.id("texts"),
	sentenceId: v.id("sentences"),
	stitchedText: v.string(),
	clickedSegmentIndex: v.number(),
	selectedSegment: v.string(),
});

export const resolutionGrammarProjectionValidator = v.object({
	grundform: grundformValidator,
	members: v.array(
		v.object({
			attested: v.string(),
			orthography: orthographyValidator,
		}),
	),
	realizationCoverage: realizationCoverageValidator,
	normalizedSurface: v.string(),
	spelling: surfaceSpellingValidator,

	canonicalForm: v.string(),
	family: v.string(),
	kind: v.string(),
});

export const resolutionReadingProjectionValidator = v.object({
	emojiDescription: v.string(),
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

export const encounterValidator = v.object({
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

export const nonResolvedGrammaticalValidator = v.union(
	v.object({
		decision: v.literal("Unresolved"),
		language: grammaticalLanguageValidator,
	}),
	v.object({
		decision: v.literal("NotImplemented"),
		language: grammaticalLanguageValidator,
		route: v.object({
			family: v.string(),
			kind: v.string(),
		}),
	}),
);

export const grammaticalResultValidator = v.union(
	resolvedGrammaticalValidator,
	nonResolvedGrammaticalValidator,
);

export const reusableAttestationValidator = v.object({
	attestationId: v.id("attestations"),
	grammatical: resolvedGrammaticalValidator,
	reading: readingValueValidator,
});

export const recordedClickValidator = v.union(
	v.object({
		status: v.literal("Unresolved"),
		clickId: v.id("visitorClicks"),
	}),
	v.object({
		status: v.literal("Resolved"),
		clickId: v.id("visitorClicks"),
		readingId: v.id("readings"),
		occurrence: reusableAttestationValidator,
	}),
);

export const unresolvedClickCommitValidator = v.object({
	status: v.literal("Unresolved"),
	clickId: v.id("visitorClicks"),
	deduplicated: v.boolean(),
});

export const reusedResolvedClickCommitValidator = v.object({
	status: v.literal("Reused"),
	clickId: v.id("visitorClicks"),
	readingId: v.id("readings"),
	attestationId: v.id("attestations"),
	deduplicated: v.boolean(),
});

export const dictionaryPlanValidator = v.object({
	baseRevision: v.string(),
	changes: v.array(dumdictPlannedChangeValidator),
});

const committedOccurrenceValidator = v.object({
	status: v.union(v.literal("Committed"), v.literal("Reused")),
	clickId: v.id("visitorClicks"),
	readingId: v.id("readings"),
	attestationId: v.id("attestations"),
	deduplicated: v.boolean(),
	occurrence: reusableAttestationValidator,
});

export const lateResolvedClickCommitValidator = v.object({
	status: v.literal("Reused"),
	clickId: v.id("visitorClicks"),
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
	code: v.union(
		v.literal("revisionConflict"),
		v.literal("semanticPreconditionFailed"),
	),
	message: v.string(),
	latestRevision: v.optional(v.string()),
});

const resolvedClickConflictValidator = v.union(
	membershipConflictValidator,
	dictionaryConflictValidator,
);

export const resolvedClickCommitValidator = v.union(
	committedOccurrenceValidator,
	resolvedClickConflictValidator,
);

const readingResolutionValidator = v.object({
	decision: v.union(v.literal("Reuse"), v.literal("New")),
	emojiDescription: v.string(),
});

export const resolveSegmentResultValidator = v.union(
	v.object({ catalogMiss: catalogMissValidator }),
	v.object({
		grammatical: resolvedGrammaticalValidator,
		reading: readingValueValidator,
		reused: v.literal(true),
		deduplicated: v.literal(true),
		persisted: v.object({
			status: v.literal("Resolved"),
			clickId: v.id("visitorClicks"),
			readingId: v.id("readings"),
			occurrence: reusableAttestationValidator,
		}),
	}),
	v.object({
		grammatical: v.object({
			decision: v.literal("Unresolved"),
			language: grammaticalLanguageValidator,
		}),
		deduplicated: v.literal(true),
		persisted: v.object({
			status: v.literal("Unresolved"),
			clickId: v.id("visitorClicks"),
		}),
	}),
	v.object({
		grammatical: resolvedGrammaticalValidator,
		reading: readingValueValidator,
		reused: v.literal(true),
		persisted: reusedResolvedClickCommitValidator,
	}),
	v.object({
		grammatical: resolvedGrammaticalValidator,
		reading: readingValueValidator,
		reused: v.literal(true),
		persisted: lateResolvedClickCommitValidator,
	}),
	v.object({
		grammatical: nonResolvedGrammaticalValidator,
		persisted: unresolvedClickCommitValidator,
	}),
	v.object({
		grammatical: resolvedGrammaticalValidator,
		readingResolution: readingResolutionValidator,
		reading: readingValueValidator,
		dictionaryPlan: dictionaryPlanValidator,
		persisted: resolvedClickConflictValidator,
	}),
	v.object({
		grammatical: resolvedGrammaticalValidator,
		readingResolution: readingResolutionValidator,
		reading: readingValueValidator,
		dictionaryPlan: dictionaryPlanValidator,
		reused: v.boolean(),
		persisted: committedOccurrenceValidator,
	}),
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
