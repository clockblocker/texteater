import { ConvexError, type Infer, v } from "convex/values";
import type { Route } from "dumgen";
import type * as Dumling from "dumling/types";
import {
	directSemanticRelationValues,
	translationLanguageValues,
} from "dumrel";

const grammaticalResolutionLanguageValues = ["de"] as const;
const segmentKindValues = [
	"ResolvableText",
	"OpaqueText",
	"Whitespace",
	"Punctuation",
] as const;
const lexemeKindValues = [
	"ADJ",
	"ADP",
	"ADV",
	"AUX",
	"CCONJ",
	"DET",
	"INTJ",
	"NOUN",
	"NUM",
	"PART",
	"PRON",
	"PROPN",
	"PUNCT",
	"SCONJ",
	"SYM",
	"VERB",
] as const;
const morphemeKindValues = [
	"Circumfix",
	"Duplifix",
	"Infix",
	"Interfix",
	"Prefix",
	"Root",
	"Suffix",
	"Suffixoid",
] as const;
/** Root-and-pattern morphology is Semitic, so only Hebrew picks Transfix. */
const hebrewMorphemeKindValues = [...morphemeKindValues, "Transfix"] as const;

/**
 * Every Dumling Lemma route as language → Family → Kinds. A Kind name may
 * appear in two Families: Lexeme VERB and Locution VERB are different routes
 * (ADR 0039).
 */
const lemmaRouteKinds = {
	de: {
		Lexeme: lexemeKindValues,
		Locution: [
			"ADJ",
			"ADP",
			"ADV",
			"CCONJ",
			"DET",
			"INTJ",
			"NOUN",
			"NUM",
			"PRON",
			"SCONJ",
			"VERB",
		],
		Saying: ["Saying"],
		Foreign: ["Foreign"],
		Morpheme: morphemeKindValues,
	},
	en: {
		Lexeme: lexemeKindValues,
		Locution: ["ADP", "ADV", "INTJ", "NOUN", "SCONJ", "VERB"],
		Saying: ["Saying"],
		Foreign: ["Foreign"],
		Morpheme: morphemeKindValues,
	},
	he: {
		Lexeme: lexemeKindValues,
		Locution: ["ADV", "INTJ"],
		Saying: ["Saying"],
		Foreign: ["Foreign"],
		Morpheme: hebrewMorphemeKindValues,
	},
} as const;
type ListedRoutes = typeof lemmaRouteKinds;
type ListedRoute = {
	[L in keyof ListedRoutes]: {
		[F in keyof ListedRoutes[L]]: ListedRoutes[L][F] extends readonly string[]
			? `${L}/${F & string}/${ListedRoutes[L][F][number]}`
			: never;
	}[keyof ListedRoutes[L]];
}[keyof ListedRoutes];
type DumlingRoute = Dumling.UnitRoute extends infer Route
	? Route extends Dumling.UnitRoute
		? `${Route["language"]}/${Route["family"]}/${Route["kind"]}`
		: never
	: never;

/** Whether a language, Family and Kind name one Dumling Lemma route. */
export function isLemmaRoute(
	language: string,
	family: string,
	kind: string,
): boolean {
	if (!Object.hasOwn(lemmaRouteKinds, language)) return false;
	const families: Partial<Record<string, readonly string[]>> =
		lemmaRouteKinds[language as keyof ListedRoutes];
	return (
		Object.hasOwn(families, family) && !!families[family]?.includes(kind)
	);
}

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
import { TEXT_LANGUAGE_VALUES } from "../../shared/supported-target-language";

export function literalUnion<const Value extends string>(
	values: readonly [Value, ...Value[]],
) {
	const [first, ...rest] = values;
	return v.union(v.literal(first), ...rest.map((value) => v.literal(value)));
}

export const languageValidator = literalUnion(TEXT_LANGUAGE_VALUES);

const familyValues = [
	"Lexeme",
	"Locution",
	"Saying",
	"Foreign",
	"Morpheme",
] as const;
const kindValues = [
	...lexemeKindValues,
	...hebrewMorphemeKindValues,
	"Saying",
	"Foreign",
] as const;

export const familyValidator = literalUnion(familyValues);
export const kindValidator = literalUnion(kindValues);

const families = new Set<string>(familyValues);
const kinds = new Set<string>(kindValues);

export function isFamily(value: string): value is Dumling.Family {
	return families.has(value);
}

export function isKind(value: string): value is Dumling.Kind {
	return kinds.has(value);
}

type SameMembers<A, B> = [A] extends [B]
	? [B] extends [A]
		? true
		: false
	: false;
// The validators admit every Dumling Family, Kind and route, and nothing else.
true satisfies SameMembers<Infer<typeof familyValidator>, Dumling.Family>;
true satisfies SameMembers<Infer<typeof kindValidator>, Dumling.Kind>;
true satisfies SameMembers<ListedRoute, DumlingRoute>;
true satisfies SameMembers<
	(typeof variantTagValues)[number],
	Dumling.VariantTag
>;

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

/**
 * The Knowledge aspect a structural Shadow reference sits in. A Participle
 * Source refers to its verb's Shadow until that verb is stored (ADR 0036).
 */
export const structuralShadowAspectValidator = v.union(
	v.literal("morphologicalTree"),
	v.literal("participleSource"),
);
export type StructuralShadowAspect = Infer<
	typeof structuralShadowAspectValidator
>;

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

/** A Segment to store; `surface` marks a fusion component. */
export const storedSegmentInputValidator = v.object({
	kind: segmentKindValidator,
	text: v.string(),
	/** The word the Segment stands for: `in` for the `i` of `im`, `es` for `'s`. */
	surface: v.optional(v.string()),
});

/** A stored Segment at its storage key; see server/storedSegments.ts. */
export const storedSegmentValidator = storedSegmentInputValidator.extend({
	index: v.number(),
});

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

export const surfaceValueValidator = v.object({
	unitKind: v.literal("Surface"),
	language: languageValidator,
	normalizedSurface: v.string(),
	spelling: surfaceSpellingValidator,

	surfaceFeatures: v.any(),
	inflectionalFeatures: v.optional(v.any()),
	lemma: lemmaValueValidator,
});

export const attestationValueValidator = v.object({
	articleEvidence: v.optional(v.union(v.null(), articleEvidenceValidator)),
	expletiveEvidence: v.optional(v.any()),
	valencyEvidence: v.optional(v.any()),
	unitKind: v.literal("Attestation"),
	members: v.array(attestationMemberValidator),
	realizationCoverage: realizationCoverageValidator,
	surface: surfaceValueValidator,
});

/**
 * Where a click on a stored unit routes (Dumgen ADR 0007): German, a Family
 * other than Morpheme, and one of its Kinds.
 */
export const unitRouteValidator = v.union(
	v.object({
		language: v.literal("de"),
		family: v.literal("Lexeme"),
		kind: literalUnion(lemmaRouteKinds.de.Lexeme),
	}),
	v.object({
		language: v.literal("de"),
		family: v.literal("Locution"),
		kind: literalUnion(lemmaRouteKinds.de.Locution),
	}),
	v.object({
		language: v.literal("de"),
		family: v.literal("Saying"),
		kind: v.literal("Saying"),
	}),
	v.object({
		language: v.literal("de"),
		family: v.literal("Foreign"),
		kind: v.literal("Foreign"),
	}),
);
// A stored route is exactly a Route `segment.inUnits` gives.
true satisfies SameMembers<Infer<typeof unitRouteValidator>, Route>;

/**
 * One biggest unit intake stores with its Sentence (Dumgen ADR 0007): the
 * indices of its Segments in the Sentence, ascending (#767), its route or
 * `Unresolved`, and any route variants, its route first.
 */
/**
 * The authored DET or PRON identity intake's route judge picked for a
 * one-piece unit (#864); a click builds the unit's Lemma from it.
 */
export const closedClassIdentityValidator = v.object({
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
	language: languageValidator,
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
	language: v.literal("de"),
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
	morphologicalTree: v.boolean(),
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
	v.literal("Terminal"),
);

export const resolutionOutcomeValidator = v.union(
	v.literal("Complete"),
	v.literal("Unresolved"),
	v.literal("PermanentFailure"),
);

export const activeResolutionActivityValidator = v.union(
	v.literal("Scheduled"),
	v.literal("Running"),
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
	v.literal("DictionaryConflict"),
	v.literal("MembershipConflict"),
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

export const lateResolvedClickCommitValidator = v.object({
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

const visitorErrorCodeValidator = v.union(
	v.literal("Conflict"),
	v.literal("InvalidInput"),
	v.literal("NotConfigured"),
	v.literal("RateLimited"),
);

/**
 * The data of a condition the Visitor can act on: retry after a conflict, fix
 * the input, configure the deployment, or wait out a rate limit. Anything else
 * is a bug and throws a plain Error, which the client reports generically.
 */
export type VisitorErrorData = {
	readonly code: Infer<typeof visitorErrorCodeValidator>;
	readonly message: string;
};

export function visitorError(
	code: VisitorErrorData["code"],
	message: string,
): ConvexError<VisitorErrorData> {
	return new ConvexError({ code, message });
}
