import type { DumdictPlan, DumdictService, StoreRevision } from "dumdict";
import { makeSurfaceId } from "dumdict/runtime";
import type {
	ComparisonInput,
	Dumgen,
	Encounter,
	KnowledgeDraft,
	Segment,
	SegmentedSentence,
} from "dumgen/types";
import type * as Dumling from "dumling/types";
import { applyKnowledgeChange, parseReadingKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import type { UnknownException } from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import type { InspectionCapture } from "./inspectionCapture";
import { lemmaIdentityKey, readingIdentityKey } from "./linguisticIdentity";
import { parseGermanLemma, parseGermanReading } from "./operationalParsing";
import type { GenerationEvent } from "./resolutionFailure";
import type { CatalogMissSignal, ResolvedGrammar } from "./resolutionGrammar";
import { splitInSentences } from "./sentenceSplitting";
import { assertTextSubmissionWithinLimits } from "./textSubmissionLimits";

export type PersistedSentence = {
	readonly sentenceId: string;
	readonly textId: string;
	readonly segmentedSentenceId: string;
	readonly language: "de" | "en" | "he";
	readonly stitchedText: string;
	readonly segments: readonly {
		readonly index: number;
		readonly kind: string;
		readonly text: string;
	}[];
};

export type SubmittedSentence = {
	readonly segmentedSentenceId: string;
	readonly position: number;
	readonly language: "de" | "en" | "he";
	readonly stitchedText: string;
	readonly segments: readonly Segment[];
};

export type ResolvedClickPersistence = {
	readonly knowledgeDraftJson?: string;
	readonly requestId: string;
	readonly visitorId: string;
	readonly sentenceId: string;
	readonly clickedSegmentIndex: number;
	readonly occurrence: {
		readonly memberSegmentIndices: readonly number[];
		readonly attestation: ResolvedGrammar["attestation"];
		readonly surfaceKey: string;
		readonly lemmaKey: string;
	};
	readonly reading: Dumling.Reading<"de">;
	readonly readingKey: string;
	readonly dictionaryPlan: DumdictPlan<"de">;
};

export type ReusableAttestation = {
	readonly attestationId: string;
	readonly grammatical: ResolvedGrammar;
	readonly reading: Dumling.Reading<"de">;
};

export type RecordedClick =
	| {
			readonly status: "Unresolved";
			readonly clickId: string;
	  }
	| {
			readonly status: "Resolved";
			readonly clickId: string;
			readonly readingId: string;
			readonly occurrence: ReusableAttestation;
	  };

export type UnresolvedClickCommit = {
	readonly status: "Unresolved";
	readonly clickId: string;
	readonly deduplicated: boolean;
};

export type ReusedResolvedClickCommit = {
	readonly status: "Reused";
	readonly clickId: string;
	readonly attestationId: string;
	readonly readingId: string;
	readonly deduplicated: boolean;
};

export type LateResolvedClickCommit = {
	readonly status: "Reused";
	readonly clickId: string;
	readonly attestationId: string;
	readonly readingId: string;
	readonly deduplicated: boolean;
	readonly occurrence: ReusableAttestation;
};

export type ResolvedClickCommit =
	| {
			readonly status: "Committed" | "Reused";
			readonly clickId: string;
			readonly attestationId: string;
			readonly readingId: string;
			readonly deduplicated: boolean;
			readonly occurrence: ReusableAttestation;
	  }
	| {
			readonly status: "MembershipConflict";
			readonly code: "partialOverlap";
			readonly message: string;
			readonly conflictingAttestationIds: readonly string[];
	  }
	| {
			readonly status: "DictionaryConflict";
			readonly code: "revisionConflict" | "semanticPreconditionFailed";
			readonly message: string;
			readonly latestRevision?: StoreRevision;
	  };

type ResolvedGrammatical = ResolvedGrammar;

type NonResolvedGrammatical = {
	readonly decision: "Unresolved";
	readonly language: "de";
};

type ReadingResolution = {
	readonly decision: "Reuse" | "New";
	readonly emojiDescription: string;
};

export type ResolveSegmentResult =
	| {
			readonly catalogMiss: CatalogMissSignal;
	  }
	| {
			readonly grammatical: ResolvedGrammatical;
			readonly reading: Dumling.Reading<"de">;
			readonly reused: true;
			readonly deduplicated: true;
			readonly persisted: Extract<RecordedClick, { status: "Resolved" }>;
	  }
	| {
			readonly grammatical: {
				readonly decision: "Unresolved";
				readonly language: "de";
			};
			readonly deduplicated: true;
			readonly persisted: Extract<
				RecordedClick,
				{ status: "Unresolved" }
			>;
	  }
	| {
			readonly grammatical: ResolvedGrammatical;
			readonly reading: Dumling.Reading<"de">;
			readonly reused: true;
			readonly persisted: ReusedResolvedClickCommit;
	  }
	| {
			readonly grammatical: ResolvedGrammatical;
			readonly reading: Dumling.Reading<"de">;
			readonly reused: true;
			readonly persisted: LateResolvedClickCommit;
	  }
	| {
			readonly grammatical: NonResolvedGrammatical;
			readonly persisted: UnresolvedClickCommit;
	  }
	| {
			readonly grammatical: ResolvedGrammatical;
			readonly readingResolution: ReadingResolution;
			readonly reading: Dumling.Reading<"de">;
			readonly dictionaryPlan: DumdictPlan<"de">;
			readonly persisted: Extract<
				ResolvedClickCommit,
				{ status: "MembershipConflict" | "DictionaryConflict" }
			>;
	  }
	| {
			readonly grammatical: ResolvedGrammatical;
			readonly readingResolution: ReadingResolution;
			readonly reading: Dumling.Reading<"de">;
			readonly dictionaryPlan: DumdictPlan<"de">;
			readonly reused: boolean;
			readonly persisted: Extract<
				ResolvedClickCommit,
				{ status: "Committed" | "Reused" }
			>;
	  };

/**
 * Durable boundary for the linguistic workflow.
 *
 * The implementation must make the first valid resolved occurrence atomic:
 * canonical dictionary records, exclusive Segment memberships, the occurrence
 * Attestation, and the Visitor Encounter commit together. Replays and late
 * competing results return the committed occurrence instead of duplicating it.
 */
export type OrchestrationPersistence = {
	persistSubmittedText(input: {
		readonly submissionKey: string;
		readonly sourceText: string;
		readonly sentences: readonly SubmittedSentence[];
	}): Promise<{ readonly textId: string }>;
	getSentenceForResolution(input: {
		readonly sentenceId: string;
	}): Promise<PersistedSentence | null>;
	findRecordedClick(
		input: ResolveSegmentInput,
	): Promise<RecordedClick | null>;
	findAttestation(input: {
		readonly sentenceId: string;
		readonly clickedSegmentIndex: number;
	}): Promise<ReusableAttestation | null>;
	persistResolvedClick(
		input: ResolvedClickPersistence,
	): Promise<ResolvedClickCommit>;
	persistReusedResolvedClick(
		input: ResolveSegmentInput & {
			readonly attestationId: string;
		},
	): Promise<ReusedResolvedClickCommit>;
	persistUnresolvedClick(input: {
		readonly requestId: string;
		readonly visitorId: string;
		readonly sentenceId: string;
		readonly clickedSegmentIndex: number;
	}): Promise<UnresolvedClickCommit | LateResolvedClickCommit>;
};

export type SubmitTextInput = {
	readonly submissionKey: string;
	readonly sourceText: string;
};

export type ResolveSegmentInput = {
	readonly requestId: string;
	readonly visitorId: string;
	readonly sentenceId: string;
	readonly clickedSegmentIndex: number;
};

export type ResolutionProgressObserver = {
	generationEvent?(event: GenerationEvent): void;
	grammarAvailable(input: {
		readonly grammatical: ResolvedGrammatical;
	}): Promise<void>;
	readingAvailable(input: {
		readonly reading: Dumling.Reading<"de">;
		readonly readingResolution: ReadingResolution;
	}): Promise<void>;
	committing(): Promise<void>;
};

export type ResolutionCheckpoints = {
	readonly grammatical?: ResolvedGrammatical;
	readonly reading?: {
		readonly resolution: ReadingResolution;
		readonly reading: Dumling.Reading<"de">;
	};
};

export type TfDemoOrchestrator = ReturnType<typeof createTfDemoOrchestrator>;

/**
 * Composes Dumgen resolution and Dumdict planning behind one persistence port.
 * Convex supplies the production port; tests can use an in-memory port without
 * changing workflow or conflict semantics.
 */
export function createTfDemoOrchestrator(options: {
	readonly dumgen: Dumgen;
	readonly inspection?: InspectionCapture;
	readonly dictionary: DumdictService<"de">;
	readonly persistence: OrchestrationPersistence;
	readonly observer?: ResolutionProgressObserver;
	readonly draftKnowledge?: (input: {
		encounter: Encounter<"de">;
		lemma: Dumling.Lemma<"de">;
		visitorId: string;
	}) => Effect.Effect<KnowledgeDraft, unknown>;
}) {
	function submitText(input: SubmitTextInput) {
		return Effect.gen(function* () {
			assertNonEmpty(input.submissionKey, "submissionKey");
			assertNonEmpty(input.sourceText, "sourceText");

			const split = Effect.sync(() => splitInSentences(input.sourceText));
			const sourceSentences = yield* options.inspection
				? options.inspection.effect(
						"Split text into sentences",
						"app/tf-demo · Intl.Segmenter (de, sentence)",
						{ sourceText: input.sourceText },
						split,
					)
				: split;
			assertTextSubmissionWithinLimits(input.sourceText, sourceSentences);
			const firstSourceSentence = sourceSentences[0];
			if (firstSourceSentence === undefined)
				throw new Error("Text submission contains no sentences.");
			const segmentation = yield* effectFrom(
				options.dumgen.segment({
					sourceSentences: [
						firstSourceSentence,
						...sourceSentences.slice(1),
					],
				}),
			);

			const sentences = segmentation.flatMap(
				(decision, position): SubmittedSentence[] =>
					decision.decision === "Accepted"
						? [
								{
									segmentedSentenceId: decision.sentence.id,
									position,
									language: decision.sentence.language,
									stitchedText: decision.sentence.segments
										.map(({ text }) => text)
										.join(""),
									segments: decision.sentence.segments,
								},
							]
						: [],
			);
			const persisted = yield* Effect.tryPromise(() =>
				options.persistence.persistSubmittedText({
					submissionKey: input.submissionKey,
					sourceText: input.sourceText,
					sentences,
				}),
			);

			return { decisions: segmentation, persisted };
		});
	}

	function resolveSegment(
		input: ResolveSegmentInput,
		checkpoints: ResolutionCheckpoints = {},
	) {
		return Effect.gen(function* () {
			let knowledgeDraft:
				| Fiber.RuntimeFiber<KnowledgeDraft | null, never>
				| undefined;
			assertNonEmpty(input.requestId, "requestId");
			assertNonEmpty(input.visitorId, "visitorId");
			assertNonEmpty(input.sentenceId, "sentenceId");
			if (!Number.isSafeInteger(input.clickedSegmentIndex)) {
				throw new TypeError(
					"clickedSegmentIndex must be a safe integer.",
				);
			}
			const recorded = yield* Effect.tryPromise(() =>
				options.persistence.findRecordedClick(input),
			);
			if (recorded) {
				return recorded.status === "Resolved"
					? {
							grammatical: recorded.occurrence.grammatical,
							reading: recorded.occurrence.reading,
							reused: true as const,
							deduplicated: true as const,
							persisted: recorded,
						}
					: {
							grammatical: {
								decision: "Unresolved" as const,
								language: "de" as const,
							},
							deduplicated: true as const,
							persisted: recorded,
						};
			}
			const reusable = yield* Effect.tryPromise(() =>
				options.persistence.findAttestation({
					sentenceId: input.sentenceId,
					clickedSegmentIndex: input.clickedSegmentIndex,
				}),
			);
			if (reusable) {
				const persisted = yield* Effect.tryPromise(() =>
					options.persistence.persistReusedResolvedClick({
						...input,
						attestationId: reusable.attestationId,
					}),
				);
				return {
					grammatical: reusable.grammatical,
					reading: reusable.reading,
					reused: true as const,
					persisted,
				};
			}

			const grammatical = checkpoints.grammatical
				? checkpoints.grammatical
				: yield* resolveGrammatical(input);

			if (grammatical.decision === "CatalogMiss") {
				return { catalogMiss: grammatical };
			}
			if (grammatical.decision !== "Resolved") {
				const persisted = yield* Effect.tryPromise(() =>
					options.persistence.persistUnresolvedClick(input),
				);
				if (persisted.status === "Reused") {
					return {
						grammatical: persisted.occurrence.grammatical,
						reading: persisted.occurrence.reading,
						reused: true as const,
						persisted,
					};
				}
				return { grammatical, persisted };
			}
			if (!checkpoints.grammatical) {
				yield* Effect.tryPromise(
					() =>
						options.observer?.grammarAvailable({
							grammatical,
						}) ?? Promise.resolve(),
				);
			}

			const lemma = parseGermanLemma(
				grammatical.attestation.surface.lemma,
			);
			const lemmaKey = lemmaIdentityKey(lemma);
			const readingResolution = checkpoints.reading
				? checkpoints.reading.resolution
				: yield* resolveReading(grammatical, lemma);
			if (readingResolution.decision === "CatalogMiss") {
				return { catalogMiss: readingResolution };
			}
			const reading = checkpoints.reading
				? parseGermanReading(checkpoints.reading.reading)
				: parseGermanReading({
						unitKind: "Reading",
						lemma,
						emojiDescription: readingResolution.emojiDescription,
					});
			if (
				lemmaIdentityKey(reading.lemma) !== lemmaKey ||
				reading.emojiDescription !== readingResolution.emojiDescription
			) {
				throw new Error(
					"The Reading checkpoint does not match Grammar.",
				);
			}
			if (!checkpoints.reading) {
				yield* Effect.tryPromise(
					() =>
						options.observer?.readingAvailable({
							reading,
							readingResolution,
						}) ?? Promise.resolve(),
				);
			}
			const draft =
				knowledgeDraft && readingResolution.decision === "New"
					? yield* Fiber.join(knowledgeDraft)
					: null;
			const prepared = yield* readingResolution.decision === "Reuse"
				? options.dictionary.prepare.ensureOwnedSurface({
						reading,
						ownedSurface: {
							surface: grammatical.attestation.surface,
							note: emptyNote(),
						},
					})
				: options.dictionary.prepare.addNewNote({
						draft: {
							reading,
							note: emptyNote(),
							ownedSurfaces: [
								{
									surface: grammatical.attestation.surface,
									note: emptyNote(),
								},
							],
						},
					});
			const dictionaryPlan = prepared.plan;

			const surfaceKey = surfaceIdentityKey(
				grammatical.attestation.surface,
			);
			const readingKey = readingIdentityKey(reading);
			yield* Effect.tryPromise(
				() => options.observer?.committing() ?? Promise.resolve(),
			);
			const persisted = yield* Effect.tryPromise(() =>
				options.persistence.persistResolvedClick({
					...input,
					...(draft && (draft.texts.length || draft.relations)
						? { knowledgeDraftJson: JSON.stringify(draft) }
						: {}),
					occurrence: {
						memberSegmentIndices:
							grammatical.encounter.target.memberSegmentIndices,
						attestation: grammatical.attestation,
						surfaceKey,
						lemmaKey,
					},
					reading,
					readingKey,
					dictionaryPlan,
				}),
			);
			if (
				persisted.status === "MembershipConflict" ||
				persisted.status === "DictionaryConflict"
			) {
				return {
					grammatical,
					readingResolution,
					reading,
					dictionaryPlan,
					persisted,
				};
			}

			return {
				grammatical: persisted.occurrence.grammatical,
				readingResolution,
				reading: persisted.occurrence.reading,
				dictionaryPlan,
				reused: persisted.status === "Reused",
				persisted,
			};

			function resolveGrammatical(request: ResolveSegmentInput) {
				return Effect.gen(function* () {
					const stored = yield* Effect.tryPromise(() =>
						options.persistence.getSentenceForResolution({
							sentenceId: request.sentenceId,
						}),
					);
					if (!stored) {
						throw new Error(
							"The requested sentence does not exist.",
						);
					}
					const sentence = parseGermanSentence(stored);
					return yield* Effect.gen(function* () {
						const target = yield* options.dumgen.classifyTarget({
							sentence,
							clickedSegmentIndex: request.clickedSegmentIndex,
						});
						const encounter: Encounter<"de"> = {
							sentence,
							target,
						};
						const attestation =
							yield* options.dumgen.resolveGrammar(encounter);
						return {
							decision: "Resolved" as const,
							language: "de" as const,
							encounter,
							attestation,
						};
					}).pipe(
						Effect.catchTag("Unresolved", () =>
							Effect.succeed({
								decision: "Unresolved" as const,
								language: "de" as const,
							}),
						),
						Effect.catchTag("CatalogMiss", (failure) =>
							Effect.succeed({
								decision: "CatalogMiss" as const,
								stage: failure.stage,
								route: failure.route ?? "de",
								message: failure.message,
							}),
						),
					);
				});
			}

			function resolveReading(
				resolved: ResolvedGrammatical,
				resolvedLemma: Dumling.Lemma<"de">,
			) {
				return Effect.gen(function* () {
					const storedReadings = yield* effectFrom(
						options.dictionary.findStoredReadings({
							lemma: resolvedLemma,
						}),
					);
					if (
						resolved.encounter.target.family !==
							resolvedLemma.family ||
						resolved.encounter.target.kind !== resolvedLemma.kind
					)
						throw new Error(
							"Reading route does not match the Encounter.",
						);
					const candidates = storedReadings.candidates.map(
						({ reading }) => reading.emojiDescription,
					);
					const base = {
						encounter: resolved.encounter,
						lemma: resolvedLemma,
					};
					if (!candidates.length && options.draftKnowledge) {
						knowledgeDraft = yield* options
							.draftKnowledge({
								...base,
								visitorId: input.visitorId,
							})
							.pipe(
								Effect.catchAll(() => Effect.succeed(null)),
								Effect.forkScoped,
							);
					}
					const operation =
						options.dumgen.resolveOrGenerateReadingEmojiDescription(
							{
								...base,
								candidates,
							} as ComparisonInput<"de">,
						);
					return yield* operation.pipe(
						Effect.catchTag("CatalogMiss", (failure) =>
							Effect.succeed({
								decision: "CatalogMiss" as const,
								stage: failure.stage,
								route: failure.route ?? "de",
								message: failure.message,
							}),
						),
					);
				});
			}
		}).pipe(Effect.scoped);
	}

	return Object.freeze({ submitText, resolveSegment });
}

/** Transitional test-port boundary; production Dumgen and Dumdict return Effects. */
function effectFrom<Value, Error>(
	value: Effect.Effect<Value, Error> | Promise<Value>,
): Effect.Effect<Value, Error | UnknownException> {
	return Effect.isEffect(value) ? value : Effect.tryPromise(() => value);
}

export function applyValidatedReadingKnowledgeChange(input: {
	readonly reading: unknown;
	readonly knowledge?: unknown;
	readonly change: unknown;
}): {
	readonly change: Dumrel.KnowledgeChange;
	readonly knowledge: Dumrel.ReadingKnowledge;
} {
	const reading = parseGermanReading(input.reading);
	const current = parseReadingKnowledge({
		source: reading,
		knowledge: input.knowledge ?? {},
	});
	if (!current.success) throw current.error;
	const updated = applyKnowledgeChange({
		source: reading,
		knowledge: current.value,
		change: input.change,
	});
	if (!updated.success) throw updated.error;
	// applyKnowledgeChange has validated the complete source-aware change.
	return {
		change: input.change as Dumrel.KnowledgeChange,
		knowledge: updated.value,
	};
}

export function surfaceIdentityKey(surface: Dumling.Surface<"de">): string {
	return makeSurfaceId("de", surface);
}

export { readingIdentityKey } from "./linguisticIdentity";

function parseGermanSentence(
	stored: PersistedSentence,
): SegmentedSentence<"de"> {
	if (stored.language !== "de") {
		throw new Error("Only German click resolution is enabled in tf-demo.");
	}
	const ordered = [...stored.segments].sort(
		(left, right) => left.index - right.index,
	);
	const segments = ordered.map(({ index, kind, text }, expectedIndex) => {
		if (index !== expectedIndex) {
			throw new Error(
				"Persisted Segment indices must be contiguous and zero-based.",
			);
		}
		if (
			!isSegmentKind(kind) ||
			typeof text !== "string" ||
			text.length === 0
		) {
			throw new Error("Persisted Segment data is invalid.");
		}
		return Object.freeze({ kind, text });
	});
	if (segments.map(({ text }) => text).join("") !== stored.stitchedText) {
		throw new Error(
			"Persisted Segments do not reconstruct the Stitched Text.",
		);
	}
	return Object.freeze({
		id: stored.segmentedSentenceId,
		language: "de",
		segments: Object.freeze(segments),
	});
}

function isSegmentKind(value: string): value is Segment["kind"] {
	return (
		value === "ResolvableText" ||
		value === "OpaqueText" ||
		value === "Whitespace" ||
		value === "Punctuation"
	);
}

function emptyNote() {
	return {
		attestedTranslations: [] as string[],
		attestations: [] as string[],
		notes: "",
	};
}

function assertNonEmpty(value: string, field: string): void {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new TypeError(`${field} must be a non-empty string.`);
	}
}
