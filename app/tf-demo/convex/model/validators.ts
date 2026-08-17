import { v } from "convex/values";

export const languageValidator = v.union(v.literal("de"), v.literal("he"));

export const grammaticalLanguageValidator = v.literal("de");

export const segmentKindValidator = v.union(
	v.literal("ResolvableText"),
	v.literal("OpaqueText"),
	v.literal("Whitespace"),
	v.literal("Punctuation"),
);

export const segmentInputValidator = v.object({
	kind: segmentKindValidator,
	text: v.string(),
});

export const orthographyValidator = v.union(
	v.literal("Standard"),
	v.literal("Typo"),
);

export const realizationCoverageValidator = v.union(
	v.literal("Full"),
	v.literal("Partial"),
);

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
	spelling: v.union(v.literal("Canonical"), v.literal("Variant")),
	surfaceKind: v.union(v.literal("Citation"), v.literal("Inflection")),
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

export const semanticRelationValidator = v.union(
	v.literal("synonym"),
	v.literal("nearSynonym"),
	v.literal("antonym"),
	v.literal("hypernym"),
	v.literal("hyponym"),
	v.literal("meronym"),
	v.literal("holonym"),
);

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

const unitShadowValidator = v.object({
	language: languageValidator,
	canonicalForm: v.string(),
	family: v.string(),
	kind: v.string(),
});

const pendingSemanticRelationRecordValidator = v.object({
	sourceReading: readingValueValidator,
	pending: v.object({
		relation: semanticRelationValidator,
		target: unitShadowValidator,
	}),
	locator: v.object({
		sourceReadingKey: v.string(),
		relation: semanticRelationValidator,
		targetPendingId: v.string(),
	}),
});

const dumdictPreconditionValidator = v.union(
	v.object({ kind: v.literal("revisionMatches"), revision: v.string() }),
	v.object({ kind: v.literal("lemmaExists"), lemma: lemmaValueValidator }),
	v.object({ kind: v.literal("lemmaMissing"), lemma: lemmaValueValidator }),
	v.object({
		kind: v.literal("readingExists"),
		reading: readingValueValidator,
	}),
	v.object({
		kind: v.literal("readingMissing"),
		reading: readingValueValidator,
	}),
	v.object({ kind: v.literal("surfaceExists"), surfaceId: v.string() }),
	v.object({ kind: v.literal("surfaceMissing"), surfaceId: v.string() }),
	v.object({
		kind: v.literal("pendingRelationExists"),
		record: pendingSemanticRelationRecordValidator,
	}),
	v.object({
		kind: v.literal("pendingRelationMissing"),
		record: pendingSemanticRelationRecordValidator,
	}),
	v.object({
		kind: v.literal("readingAttestationMissing"),
		reading: readingValueValidator,
		value: v.string(),
	}),
);

const readingEntryValidator = v.object({
	reading: readingValueValidator,
	knowledge: v.optional(v.any()),
	attestedTranslations: v.array(v.string()),
	attestations: v.array(v.string()),
	notes: v.string(),
});

const surfaceEntryValidator = v.object({
	id: v.string(),
	surface: surfaceValueValidator,
	ownerLemma: lemmaValueValidator,
	attestedTranslations: v.array(v.string()),
	attestations: v.array(v.string()),
	notes: v.string(),
});

const readingPatchValidator = v.union(
	v.object({ kind: v.literal("addAttestation"), value: v.string() }),
	v.object({
		kind: v.literal("applyKnowledgeChange"),
		envelope: v.object({
			owner: v.object({
				kind: v.literal("Reading"),
				reading: readingValueValidator,
			}),
			change: v.any(),
		}),
	}),
);

export const dumdictPlannedChangeValidator = v.union(
	v.object({
		type: v.literal("createLemma"),
		record: v.object({
			lemma: lemmaValueValidator,
			knowledge: v.optional(v.any()),
		}),
		preconditions: v.array(dumdictPreconditionValidator),
	}),
	v.object({
		type: v.literal("createReading"),
		entry: readingEntryValidator,
		preconditions: v.array(dumdictPreconditionValidator),
	}),
	v.object({
		type: v.literal("patchReading"),
		reading: readingValueValidator,
		ops: v.array(readingPatchValidator),
		preconditions: v.array(dumdictPreconditionValidator),
	}),
	v.object({
		type: v.literal("createOwnedSurface"),
		entry: surfaceEntryValidator,
		preconditions: v.array(dumdictPreconditionValidator),
	}),
	v.object({
		type: v.literal("createPendingSemanticRelation"),
		record: pendingSemanticRelationRecordValidator,
		preconditions: v.array(dumdictPreconditionValidator),
	}),
	v.object({
		type: v.literal("deletePendingSemanticRelation"),
		record: pendingSemanticRelationRecordValidator,
		preconditions: v.array(dumdictPreconditionValidator),
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
