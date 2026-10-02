import { makeSurfaceId } from "dumdict/runtime";
import type * as Dumling from "dumling/types";
import * as Cause from "effect/Cause";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Option from "effect/Option";
import type {
	ClickEncounter,
	ClickResolution,
	ClickSentence,
	LemmaCandidate,
	NeighbourSentences,
	ReadingResolution,
} from "./clickResolution";
import { inspectionStep } from "./inspectionCapture";
import type { KnowledgeDraft } from "./knowledgeProduction";
import {
	emojiDescriptionOf,
	lemmaIdentityKey,
	readingIdentityKey,
} from "./linguisticIdentity";
import { parseGermanLemma, parseGermanReading } from "./operationalParsing";
import type { GenerationEvent } from "./resolutionFailure";
import type { CatalogMissSignal, ResolvedGrammar } from "./resolutionGrammar";
import {
	assertStoredSentence,
	encounterSentenceOf,
	type StoredSegment,
	type StoredUnit,
	unitsByMember,
} from "./storedSegments";

/**
 * Drafts usually land before the Emoji Description (~1.3 s against ~2 s), but
 * one provider stall can hold a leaf for up to the Luna deadline.
 */
const DRAFT_GRACE_MS = 1_500;

export type PersistedSentence = {
	readonly sentenceId: string;
	readonly textId: string;
	readonly segmentedSentenceId: string;
	readonly language: "de" | "en" | "he";
	readonly stitchedText: string;
	readonly segments: readonly StoredSegment[];
	/** The biggest units intake stored with the Sentence, if it still has them. */
	readonly units?: readonly StoredUnit[];
	/** Whether the Sentence belongs to a hidden Definition Text; absent reads as false. */
	readonly definitionText?: boolean;
};

export type ResolvedClickPersistence = {
	readonly knowledgeDraftJson?: string;
	readonly requestId: string;
	readonly visitorId: string;
	readonly sentenceId: string;
	readonly clickedSegmentIndex: number;
	readonly occurrence: {
		/** Stored Segment indices, not the Encounter's. */
		readonly memberSegmentIndices: readonly number[];
		readonly attestation: ResolvedGrammar["attestation"];
		readonly surfaceKey: string;
		readonly lemmaKey: string;
	};
	readonly reading: Dumling.Reading<"de">;
	readonly readingKey: string;
	/** The dictionary plan is built where it commits: inside the host transaction. */
	readonly readingDecision: ReadingResolution["decision"];
};

export type ReusableAttestation = {
	readonly attestationId: string;
	readonly grammatical: ResolvedGrammar;
	readonly reading: Dumling.Reading<"de">;
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
			readonly code: "semanticPreconditionFailed";
			readonly message: string;
	  };

type ResolvedGrammatical = ResolvedGrammar;

type NonResolvedGrammatical = {
	readonly decision: "Unresolved";
	readonly language: "de";
};

export type ResolveSegmentResult =
	| {
			readonly catalogMiss: CatalogMissSignal;
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
			readonly persisted: Extract<
				ResolvedClickCommit,
				{ status: "MembershipConflict" | "DictionaryConflict" }
			>;
	  }
	| {
			readonly grammatical: ResolvedGrammatical;
			readonly readingResolution: ReadingResolution;
			readonly reading: Dumling.Reading<"de">;
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
	loadResolutionContext(
		input: ResolveSegmentInput,
	): Promise<ResolutionContext>;
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
};

export type ResolutionContext = {
	readonly reusable: ReusableAttestation | null;
	readonly sentence: PersistedSentence | null;
	readonly lemmaCandidates: readonly LemmaCandidate[];
	/** The Sentences before and after this one in its Text, as far as they exist. */
	readonly neighbours?: NeighbourSentences;
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
 * Composes click resolution behind the ClickResolution port and one
 * persistence port. The dictionary is consulted only to compare stored
 * Readings; dictionary planning happens where it commits, inside the
 * persistence port's transaction. Convex supplies the production ports;
 * tests can use in-memory ones without changing workflow or conflict
 * semantics.
 */
export function createTfDemoOrchestrator(options: {
	/** Grammar, then the Reading's Emoji Description; production runs `selectUnitOnly`. */
	readonly resolution: ClickResolution;
	/** The Readings the Shared Demo Dictionary already stores for a Lemma. */
	readonly findStoredReadings: (
		lemma: Dumling.Lemma<"de">,
	) =>
		| Effect.Effect<readonly Dumling.Reading<"de">[], unknown>
		| Promise<readonly Dumling.Reading<"de">[]>;
	readonly persistence: OrchestrationPersistence;
	readonly observer?: ResolutionProgressObserver;
	/**
	 * Drafts are anchored on the marked sentence and Lemma; they run concurrently
	 * with Reading resolution. `settle` aborts the leaves still in flight so the
	 * draft returns the ones that finished.
	 */
	readonly draftKnowledge?: (input: {
		encounter: ClickEncounter;
		lemma: Dumling.Lemma<"de">;
		visitorId: string;
		settle: AbortSignal;
	}) => Effect.Effect<KnowledgeDraft, unknown>;
	/** How long a new Reading waits for unfinished drafts before committing. */
	readonly draftGraceMs?: number;
}) {
	const draftGrace = Duration.millis(options.draftGraceMs ?? DRAFT_GRACE_MS);
	/** Waits out the grace, then settles the leaves in flight; a draft that ignores the settle is dropped. */
	function settleDraft(
		fiber: Fiber.Fiber<KnowledgeDraft | null, never>,
		settle: AbortController,
	) {
		return Effect.gen(function* () {
			const finished = yield* Effect.timeoutOption(
				Fiber.join(fiber),
				draftGrace,
			);
			if (Option.isSome(finished)) return finished.value;
			settle.abort();
			const settled = yield* Effect.timeoutOption(
				Fiber.join(fiber),
				draftGrace,
			);
			if (Option.isSome(settled)) return settled.value;
			yield* Fiber.interrupt(fiber);
			return null;
		});
	}
	function resolveSegment(
		input: ResolveSegmentInput,
		checkpoints: ResolutionCheckpoints = {},
		initialContext?: ResolutionContext,
	) {
		return Effect.gen(function* () {
			let knowledgeDraft:
				| Fiber.Fiber<KnowledgeDraft | null, never>
				| undefined;
			const settleDrafts = new AbortController();
			assertNonEmpty(input.requestId, "requestId");
			assertNonEmpty(input.visitorId, "visitorId");
			assertNonEmpty(input.sentenceId, "sentenceId");
			if (!Number.isSafeInteger(input.clickedSegmentIndex)) {
				throw new TypeError(
					"clickedSegmentIndex must be a safe integer.",
				);
			}
			const context =
				initialContext ??
				(yield* Effect.tryPromise(() =>
					options.persistence.loadResolutionContext(input),
				).pipe(
					Effect.withSpan(
						"Load resolution context",
						inspectionStep("app/tf-demo", input),
					),
				));
			const reusable = context.reusable;
			if (reusable) {
				const reuse = {
					...input,
					attestationId: reusable.attestationId,
				};
				const persisted = yield* Effect.tryPromise(() =>
					options.persistence.persistReusedResolvedClick(reuse),
				).pipe(
					Effect.withSpan(
						"Commit reused occurrence",
						inspectionStep("app/tf-demo · persistence", reuse),
					),
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
				).pipe(
					Effect.withSpan(
						"Commit unresolved encounter",
						inspectionStep("app/tf-demo · persistence", input),
					),
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

			const lemma = parseGermanLemma(
				grammatical.attestation.surface.lemma,
			);
			// Text Knowledge speculates from the sentence and Lemma alone, so
			// it overlaps Reading resolution instead of waiting for the emoji.
			// It starts at once rather than on a later tick, which the Reading's
			// promise hops would overtake. The scope interrupts it whenever
			// resolution fails.
			if (options.draftKnowledge && !checkpoints.reading)
				knowledgeDraft = yield* options
					.draftKnowledge({
						encounter: grammatical.encounter,
						lemma,
						visitorId: input.visitorId,
						settle: settleDrafts.signal,
					})
					.pipe(
						withoutFailedWork(
							"The Knowledge draft",
							"the click commits without it",
						),
						Effect.forkScoped({ startImmediately: true }),
					);
			const [grammarSaved, readingsLoaded] = yield* Effect.all(
				[
					Effect.exit(
						checkpoints.grammatical
							? Effect.void
							: Effect.tryPromise(
									() =>
										options.observer?.grammarAvailable({
											grammatical,
										}) ?? Promise.resolve(),
								),
					),
					Effect.exit(
						checkpoints.reading
							? Effect.succeed(null)
							: effectFrom(
									options.findStoredReadings(lemma),
								).pipe(
									Effect.withSpan(
										"Find stored Readings",
										inspectionStep("battery/dumdict", {
											lemma,
										}),
									),
								),
					),
				],
				{ concurrency: "unbounded" },
			);

			// Convex writes cannot be cancelled: settle both operations before failure handling.
			yield* grammarSaved;
			const storedReadings = yield* readingsLoaded;

			const lemmaKey = lemmaIdentityKey(lemma);
			const readingResolution = checkpoints.reading
				? checkpoints.reading.resolution
				: yield* resolveReading(grammatical, lemma);
			if (readingResolution.decision === "CatalogMiss") {
				return { catalogMiss: readingResolution };
			}
			// Both sides compare as Dumling parses them (ADR 0031).
			const resolved = parseGermanReading({
				unitKind: "Reading",
				lemma,
				emojiDescription: readingResolution.emojiDescription,
			});
			const reading = checkpoints.reading
				? parseGermanReading(checkpoints.reading.reading)
				: resolved;
			if (
				lemmaIdentityKey(reading.lemma) !== lemmaKey ||
				emojiDescriptionOf(reading) !== emojiDescriptionOf(resolved)
			) {
				throw new Error(
					"The Reading checkpoint does not match Grammar.",
				);
			}

			if (!checkpoints.reading)
				yield* Effect.tryPromise(
					() =>
						options.observer?.readingAvailable({
							reading,
							readingResolution,
						}) ?? Promise.resolve(),
				);

			// A new Reading waits a short grace for its drafts, then settles the
			// leaves still in flight and commits with the finished ones; Knowledge
			// production generates the missing leaves. A reused Reading usually has
			// its Knowledge already, so only a draft that already finished is
			// handed on; an unfinished one is dropped rather than delaying the commit.
			const draft = !knowledgeDraft
				? null
				: readingResolution.decision === "New"
					? yield* settleDraft(knowledgeDraft, settleDrafts)
					: yield* Effect.sync(() =>
							knowledgeDraft.pollUnsafe(),
						).pipe(
							Effect.flatMap((exit) =>
								exit && Exit.isSuccess(exit)
									? Effect.succeed(exit.value)
									: Fiber.interrupt(knowledgeDraft).pipe(
											Effect.as(null),
										),
							),
						);

			const surfaceKey = surfaceIdentityKey(
				grammatical.attestation.surface,
			);
			const readingKey = readingIdentityKey(reading);
			const commit = yield* Effect.try(
				(): ResolvedClickPersistence => ({
					...input,
					...(draft && (draft.texts.length || draft.relations)
						? { knowledgeDraftJson: JSON.stringify(draft) }
						: {}),
					occurrence: {
						memberSegmentIndices: storedMemberIndices(
							context.sentence,
							grammatical.encounter,
						),
						attestation: grammatical.attestation,
						surfaceKey,
						lemmaKey,
					},
					reading,
					readingKey,
					readingDecision: readingResolution.decision,
				}),
			);
			const persisted = yield* Effect.tryPromise(() =>
				options.persistence.persistResolvedClick(commit),
			).pipe(
				Effect.withSpan(
					"Commit resolved occurrence",
					inspectionStep("app/tf-demo · persistence", commit),
				),
			);
			if (
				persisted.status === "MembershipConflict" ||
				persisted.status === "DictionaryConflict"
			) {
				return {
					grammatical,
					readingResolution,
					reading,
					persisted,
				};
			}

			return {
				grammatical: persisted.occurrence.grammatical,
				readingResolution,
				reading: persisted.occurrence.reading,
				reused: persisted.status === "Reused",
				persisted,
			};

			function resolveGrammatical(request: ResolveSegmentInput) {
				const stored = context.sentence;
				if (!stored)
					throw new Error("The requested sentence does not exist.");
				const sentence = clickSentenceOf(stored);
				const unit = unitsByMember(stored.units).get(
					request.clickedSegmentIndex,
				);
				return options.resolution
					.grammar({
						sentence,
						clickedSegmentIndex: request.clickedSegmentIndex,
						...(unit ? { unit } : {}),
						lemmaCandidates: context.lemmaCandidates,
						neighbours: context.neighbours ?? {},
					})
					.pipe(
						Effect.withSpan(
							"Resolve grammar",
							inspectionStep("app/tf-demo · ClickResolution", {
								clickedSegmentIndex:
									request.clickedSegmentIndex,
								unit,
							}),
						),
					);
			}

			function resolveReading(
				resolved: ResolvedGrammatical,
				resolvedLemma: Dumling.Lemma<"de">,
			) {
				if (!storedReadings)
					throw new Error("Reading candidates were not loaded.");
				if (
					resolved.encounter.target.family !== resolvedLemma.family ||
					resolved.encounter.target.kind !== resolvedLemma.kind
				)
					throw new Error(
						"Reading route does not match the Encounter.",
					);
				return options.resolution
					.reading({
						grammar: resolved,
						lemma: resolvedLemma,
						candidates: storedReadings.flatMap(
							(reading) => emojiDescriptionOf(reading) ?? [],
						),
					})
					.pipe(
						Effect.withSpan(
							"Resolve Reading",
							inspectionStep("app/tf-demo · ClickResolution", {
								lemma: resolvedLemma,
							}),
						),
					);
			}
		}).pipe(Effect.scoped);
	}

	return Object.freeze({ resolveSegment });
}

/**
 * Drops optional work that failed or hit a bug, warning on a failure and
 * logging a defect as a bug. Interruption propagates and is never logged.
 */
function withoutFailedWork(subject: string, consequence: string) {
	return <Value, Error>(
		work: Effect.Effect<Value, Error>,
	): Effect.Effect<Value | null> =>
		Effect.catchCause(work, (cause) => {
			if (Cause.hasInterruptsOnly(cause)) return Effect.interrupt;
			const failure = Cause.findErrorOption(cause);
			return Effect.sync(() => {
				if (Option.isSome(failure))
					console.warn(
						`${subject} failed; ${consequence}.`,
						failure.value,
					);
				else
					console.error(
						`${subject} hit a bug; ${consequence}.`,
						Cause.squash(cause),
					);
				return null;
			});
		});
}

/** Test-port boundary: production Dumdict returns Effects, a test may return a Promise. */
function effectFrom<Value, Error>(
	value: Effect.Effect<Value, Error> | Promise<Value>,
): Effect.Effect<Value, Error | Cause.UnknownError> {
	return Effect.isEffect(value) ? value : Effect.tryPromise(() => value);
}

function surfaceIdentityKey(surface: Dumling.Surface<"de">): string {
	return makeSurfaceId("de", surface);
}

function clickSentenceOf(stored: PersistedSentence): ClickSentence {
	if (stored.language !== "de") {
		throw new Error("Only German click resolution is enabled in tf-demo.");
	}
	assertStoredSentence(stored);
	return encounterSentenceOf(stored);
}

/** The stored Segments an Encounter's target names, for committing membership. */
function storedMemberIndices(
	stored: PersistedSentence | null,
	encounter: ClickEncounter,
): readonly number[] {
	if (!stored)
		throw new Error("The stored Sentence is needed to commit membership.");
	const sentence = clickSentenceOf(stored);
	return encounter.target.memberSegmentIndices.map((index) => {
		if (sentence.segments[index] === undefined)
			throw new Error("An Encounter member is not a stored Segment.");
		return index;
	});
}

function assertNonEmpty(value: string, field: string): void {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new TypeError(`${field} must be a non-empty string.`);
	}
}
