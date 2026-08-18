import { v } from "convex/values";
import {
	enabledSegmentationLanguageValues,
	grammaticalResolutionLanguageValues,
	segmentKindValues,
} from "dumgen/vocabulary";
import {
	memberOrthographyValues,
	realizationCoverageValues,
	surfaceKindValues,
	surfaceSpellingValues,
} from "dumling/vocabulary";
import { semanticRelationValues } from "dumrel/vocabulary";

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

export const segmentInputValidator = v.object({
	kind: segmentKindValidator,
	text: v.string(),
});

export const orthographyValidator = literalUnion(memberOrthographyValues);

export const realizationCoverageValidator = literalUnion(
	realizationCoverageValues,
);

export const surfaceSpellingValidator = literalUnion(surfaceSpellingValues);

export const surfaceKindValidator = literalUnion(surfaceKindValues);

export const lemmaValueValidator = v.object({
	language: languageValidator,
	family: v.string(),
	kind: v.string(),
	canonicalForm: v.string(),
	coreFeatures: v.any(),
});

export const surfaceValueValidator = v.object({
	language: languageValidator,
	normalizedSurface: v.string(),
	spelling: surfaceSpellingValidator,
	surfaceKind: surfaceKindValidator,
	surfaceFeatures: v.any(),
	inflectionalFeatures: v.optional(v.any()),
	lemma: lemmaValueValidator,
});

export const attestationValueValidator = v.object({
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

export const knowledgeOwnerKindValidator = v.union(
	v.literal("Lemma"),
	v.literal("Reading"),
);

export const semanticRelationValidator = literalUnion(semanticRelationValues);

export const occurrenceAttestationInputValidator = v.object({
	memberSegmentIndices: v.array(v.number()),
	attestation: attestationValueValidator,
	surfaceKey: v.string(),
	lemmaKey: v.string(),
});

export const readingValueValidator = v.object({
	lemma: lemmaValueValidator,
	emojiDescription: v.string(),
});

export const resolutionStageValidator = v.union(
	v.literal("Starting"),
	v.literal("RouteAvailable"),
	v.literal("GrammarAvailable"),
	v.literal("ReadingAvailable"),
	v.literal("Committing"),
	v.literal("Complete"),
	v.literal("Unresolved"),
	v.literal("Failed"),
);

export const resolutionRouteProjectionValidator = v.object({
	textId: v.id("texts"),
	sentenceId: v.id("sentences"),
	stitchedText: v.string(),
	clickedSegmentIndex: v.number(),
	selectedSegment: v.string(),
});

export const resolutionGrammarProjectionValidator = v.object({
	members: v.array(
		v.object({
			attested: v.string(),
			orthography: orthographyValidator,
		}),
	),
	realizationCoverage: realizationCoverageValidator,
	normalizedSurface: v.string(),
	spelling: surfaceSpellingValidator,
	surfaceKind: surfaceKindValidator,
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

export const resolvedGrammaticalValidator = v.object({
	decision: v.literal("Resolved"),
	language: grammaticalLanguageValidator,
	markedContext: v.string(),
	attestation: attestationValueValidator,
	interaction: v.object({
		segmentedSentenceId: v.string(),
		clickedSegmentIndex: v.number(),
		memberSegmentIndices: v.array(v.number()),
	}),
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
