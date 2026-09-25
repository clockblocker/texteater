import { makeSurfaceId } from "dumdict/runtime";
import { validateEncounter } from "dumgen";
import type {
	ComparisonInput,
	Dumgen,
	Encounter,
	KnowledgeDraft,
	LemmaCandidate,
	SegmentedSentence,
	SentenceAnalysis,
	SentenceContext,
	Task,
} from "dumgen/types";
import type * as Dumling from "dumling/types";
import * as Cause from "effect/Cause";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Option from "effect/Option";
import { inspectionStep } from "./inspectionCapture";
import { analysisOutcomeOf, type IntakeRunRecorder } from "./intakeRun";
import { lemmaIdentityKey, readingIdentityKey } from "./linguisticIdentity";
import { parseGermanLemma, parseGermanReading } from "./operationalParsing";
import type { GenerationEvent } from "./resolutionFailure";
import type { CatalogMissSignal, ResolvedGrammar } from "./resolutionGrammar";
import {
	type ClassificationReason,
	selectAnalysisTarget,
} from "./sentenceAnalysisSelection";
import { splitInParagraphs } from "./sentenceSplitting";
import {
	assertStoredSentence,
	type EncounterSentence,
	encounterSentenceOf,
	type StoredSegment,
	type StoredSegmentValue,
	storedSegmentsOf,
} from "./storedSegments";
import { assertTextSubmissionWithinLimits } from "./textSubmissionLimits";

/**
 * Drafts usually land before the Emoji Description (~1.3 s against ~2 s), but
 * one provider stall can hold a leaf for up to the Luna deadline.
 */
const DRAFT_GRACE_MS = 1_500;

/**
 * Accepted German sentences analysed at once during intake. Their requests
 * draw from the same Dumgen request budget as segmentation. Measured with
 * tooling/measure-intake-concurrency.ts (#558): 8 is within noise of 16 on
 * 16- and 25-sentence texts, and 4 is slower.
 */
const SENTENCE_ANALYSIS_CONCURRENCY = 8;

export type PersistedSentence = {
	readonly sentenceId: string;
	readonly textId: string;
	readonly segmentedSentenceId: string;
	readonly language: "de" | "en" | "he";
	readonly stitchedText: string;
	readonly segments: readonly StoredSegment[];
	/** Whether the Sentence belongs to a hidden Definition Text; absent reads as false. */
	readonly definitionText?: boolean;
};

export type SubmittedSentence = {
	readonly segmentedSentenceId: string;
	readonly position: number;
	/** The paragraph the Sentence reads in; Sentences sharing one run together. */
	readonly paragraph: number;
	readonly language: "de" | "en" | "he";
	readonly stitchedText: string;
	/** A fused word arrives split when the Sentence has an analysis. */
	readonly segments: readonly StoredSegmentValue[];
	/** Intake's Sentence Analysis; absent for other languages or when it failed. */
	readonly analysis?: SentenceAnalysis;
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
	persistSubmittedText(input: {
		readonly submissionKey: string;
		readonly sourceText: string;
		readonly sentences: readonly SubmittedSentence[];
	}): Promise<{ readonly textId: string }>;
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
};

export type ResolutionContext = {
	readonly reusable: ReusableAttestation | null;
	readonly sentence: PersistedSentence | null;
	readonly lemmaCandidates: readonly LemmaCandidate<"de">[];
	/** The stored Sentence Analysis, read before click-time classification. */
	readonly analysis?: SentenceAnalysis | null;
	/**
	 * The Sentences before and after this one in its Text, as far as they
	 * exist. Grammar gets them only when it answers MoreContextRequired.
	 */
	readonly neighbours?: SentenceContext;
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
 * Composes Dumgen resolution behind one persistence port. The dictionary is
 * consulted only to compare stored Readings; dictionary planning happens where
 * it commits, inside the persistence port's transaction. Convex supplies the
 * production port; tests can use an in-memory port without changing workflow
 * or conflict semantics.
 */
export function createTfDemoOrchestrator(options: {
	readonly dumgen: Dumgen;
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
		encounter: Encounter<"de">;
		lemma: Dumling.Lemma<"de">;
		visitorId: string;
		settle: AbortSignal;
	}) => Effect.Effect<KnowledgeDraft, unknown>;
	/** How long a new Reading waits for unfinished drafts before committing. */
	readonly draftGraceMs?: number;
	/** Measurement seam; production uses SENTENCE_ANALYSIS_CONCURRENCY. */
	readonly analysisConcurrency?: number;
	/** Receives each started Sentence Analysis outcome by sentence position. */
	readonly intake?: Pick<IntakeRunRecorder, "analysed">;
}) {
	const draftGrace = Duration.millis(options.draftGraceMs ?? DRAFT_GRACE_MS);
	/** Waits out the grace, then settles the leaves in flight; a draft that ignores the settle is dropped. */
	function settleDraft(
		fiber: Fiber.RuntimeFiber<KnowledgeDraft | null, never>,
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
	function submitText(input: SubmitTextInput) {
		return Effect.gen(function* () {
			assertNonEmpty(input.submissionKey, "submissionKey");
			assertNonEmpty(input.sourceText, "sourceText");

			const paragraphs = yield* Effect.sync(() =>
				splitInParagraphs(input.sourceText),
			).pipe(
				Effect.withSpan(
					"Split text into sentences",
					inspectionStep(
						"app/tf-demo · Intl.Segmenter (de, sentence)",
						{ sourceText: input.sourceText },
					),
				),
			);
			const sourceSentences = paragraphs.flat();
			const paragraphOf = paragraphs.flatMap((sentences, paragraph) =>
				sentences.map(() => paragraph),
			);
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

			const accepted = segmentation.flatMap((decision, position) =>
				decision.decision === "Accepted"
					? [{ sentence: decision.sentence, position }]
					: [],
			);
			// One analysis call per accepted German sentence. A failed analysis
			// is recorded and dropped; the text is never held back by it.
			const sentences = yield* Effect.forEach(
				accepted,
				({ sentence, position }) =>
					Effect.map(
						analyzeAcceptedSentence(sentence, position),
						(analysis): SubmittedSentence => {
							const stitchedText = sentence.segments
								.map(({ text }) => text)
								.join("");
							return {
								segmentedSentenceId: sentence.id,
								position,
								paragraph: paragraphOf[position] ?? position,
								language: sentence.language,
								stitchedText,
								segments:
									analysis?.stitchedText === stitchedText
										? storedSegmentsOf(analysis)
										: sentence.segments,
								...(analysis ? { analysis } : {}),
							};
						},
					),
				{
					concurrency:
						options.analysisConcurrency ??
						SENTENCE_ANALYSIS_CONCURRENCY,
				},
			);
			const submission = {
				submissionKey: input.submissionKey,
				sourceText: input.sourceText,
				sentences,
			};
			const persisted = yield* Effect.tryPromise(() =>
				options.persistence.persistSubmittedText(submission),
			).pipe(
				Effect.withSpan(
					"Persist submitted text",
					inspectionStep("app/tf-demo", submission),
				),
			);

			return { decisions: segmentation, persisted };
		});
	}

	function analyzeAcceptedSentence(
		sentence: SegmentedSentence<"de" | "en" | "he">,
		position: number,
	): Effect.Effect<SentenceAnalysis | null> {
		if (sentence.language !== "de") return Effect.succeed(null);
		const german: SegmentedSentence<"de"> = { ...sentence, language: "de" };
		return options.dumgen.analyzeSentence({ sentence: german }).pipe(
			Effect.withSpan(
				"Analyze sentence",
				inspectionStep("app/tf-demo · linguisticOrchestration", {
					sentenceId: sentence.id,
				}),
			),
			Effect.onExit((exit) =>
				Effect.sync(() =>
					options.intake?.analysed(position, analysisOutcomeOf(exit)),
				),
			),
			withoutFailedWork(
				`Sentence Analysis for ${sentence.id}`,
				"the sentence is stored without one",
			),
		);
	}

	function resolveSegment(
		input: ResolveSegmentInput,
		checkpoints: ResolutionCheckpoints = {},
		initialContext?: ResolutionContext,
	) {
		return Effect.gen(function* () {
			let knowledgeDraft:
				| Fiber.RuntimeFiber<KnowledgeDraft | null, never>
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
			// The scope interrupts it whenever resolution fails.
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
						Effect.forkScoped,
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
					: yield* Fiber.poll(knowledgeDraft).pipe(
							Effect.flatMap((exit) =>
								Option.isSome(exit) &&
								Exit.isSuccess(exit.value)
									? Effect.succeed(exit.value.value)
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
				return Effect.gen(function* () {
					const stored = context.sentence;
					if (!stored) {
						throw new Error(
							"The requested sentence does not exist.",
						);
					}
					const view = parseGermanSentence(stored);
					const sentence = view.sentence;
					const neighbours = context.neighbours ?? {};
					/**
					 * One call with the Sentence alone; a pronoun whose referent
					 * lies outside it gets a second call with the Sentences
					 * around it. A Sentence without neighbours must answer at once.
					 */
					const grammarOf = (encounter: Encounter<"de">) =>
						neighbours.before || neighbours.after
							? Effect.flatMap(
									options.dumgen.resolveGrammar(
										encounter,
										context.lemmaCandidates,
									),
									(result) =>
										"decision" in result
											? options.dumgen.resolveGrammar(
													{
														...encounter,
														context: neighbours,
													},
													context.lemmaCandidates,
												)
											: Effect.succeed(result),
								)
							: options.dumgen.resolveGrammar(
									{ ...encounter, contextAvailable: false },
									context.lemmaCandidates,
								);
					const resolve = (target: Encounter<"de">["target"]) => {
						const encounter: Encounter<"de"> = { sentence, target };
						return Effect.map(
							grammarOf(encounter),
							(attestation) => ({
								decision: "Resolved" as const,
								language: "de" as const,
								encounter,
								attestation,
							}),
						);
					};
					return yield* Effect.gen(function* () {
						const target = yield* selectTarget(
							stored,
							view,
							request.clickedSegmentIndex,
						);
						// Grammar may refuse a Phraseme the analysis named; the
						// clicked word beneath it still resolves.
						return yield* resolve(target).pipe(
							Effect.catchTag("Unresolved", (failure) => {
								const word =
									target.family === "Phraseme"
										? selectWord(
												stored,
												view,
												request.clickedSegmentIndex,
											)
										: null;
								return word
									? Effect.flatMap(word, resolve)
									: Effect.fail(failure);
							}),
						);
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

			/**
			 * The stored Sentence Analysis answers the click when its largest
			 * unit is resolved at the clicked Segment; otherwise, or without an
			 * analysis, click-time classification runs as before. The inspection
			 * step names the path taken. The click arrives in stored indices;
			 * the target leaves in the Encounter's.
			 */
			function selectTarget(
				stored: PersistedSentence,
				view: EncounterSentence,
				clickedSegmentIndex: number,
			) {
				const selection = analysedTarget(
					stored,
					view,
					clickedSegmentIndex,
				);
				const fromAnalysis = selection.target;
				const owner = "app/tf-demo · linguisticOrchestration";
				const input = {
					clickedSegmentIndex,
					hasAnalysis: Boolean(context.analysis),
					definitionText: stored.definitionText ?? false,
					...(selection.target ? {} : { reason: selection.reason }),
				};
				const selected: Task<{
					readonly path: "analysis" | "classified";
					readonly target: Encounter<"de">["target"];
				}> = fromAnalysis
					? Effect.succeed({
							path: "analysis" as const,
							target: fromAnalysis,
						})
					: Effect.map(
							options.dumgen.classifyTarget({
								sentence: view.sentence,
								clickedSegmentIndex:
									view.encounterIndex(clickedSegmentIndex),
							}),
							(target) => ({
								path: "classified" as const,
								target,
							}),
						);
				const name = fromAnalysis
					? "Select target · analysis"
					: "Select target · classified";
				return selected.pipe(
					Effect.withSpan(name, inspectionStep(owner, input)),
					Effect.map(({ target }) => target),
				);
			}

			/**
			 * The clicked word beneath a refused Phraseme, read from the
			 * analysis, or null when the analysis has no resolved word there.
			 */
			function selectWord(
				stored: PersistedSentence,
				view: EncounterSentence,
				clickedSegmentIndex: number,
			) {
				const selection = analysedTarget(
					stored,
					view,
					clickedSegmentIndex,
					"word",
				);
				if (!selection.target) return null;
				return Effect.succeed({
					path: "analysis" as const,
					target: selection.target,
				}).pipe(
					Effect.withSpan(
						"Select target · analysis word",
						inspectionStep(
							"app/tf-demo · linguisticOrchestration",
							{
								clickedSegmentIndex,
								reason: "phrasemeRefused",
							},
						),
					),
					Effect.map(({ target }) => target),
				);
			}

			/** The analysis target, or why the click is classified instead. */
			function analysedTarget(
				stored: PersistedSentence,
				view: EncounterSentence,
				clickedSegmentIndex: number,
				layer: "largest" | "word" = "largest",
			):
				| { readonly target: Encounter<"de">["target"] }
				| {
						readonly target: null;
						readonly reason: ClassificationReason;
				  } {
				const selection = selectAnalysisTarget(
					context.analysis,
					stored,
					clickedSegmentIndex,
					layer,
				);
				if (!selection.target) return selection;
				const target = {
					...selection.target,
					memberSegmentIndices:
						selection.target.memberSegmentIndices.map(
							view.encounterIndex,
						),
				};
				try {
					const encounter = validateEncounter({
						sentence: view.sentence,
						target,
					});
					// The Encounter's sentence is German, so its target is too.
					return {
						target: encounter.target as Encounter<"de">["target"],
					};
				} catch {
					return { target: null, reason: "invalidEncounter" };
				}
			}

			function resolveReading(
				resolved: ResolvedGrammatical,
				resolvedLemma: Dumling.Lemma<"de">,
			) {
				return Effect.gen(function* () {
					if (!storedReadings)
						throw new Error("Reading candidates were not loaded.");
					if (
						resolved.encounter.target.family !==
							resolvedLemma.family ||
						resolved.encounter.target.kind !== resolvedLemma.kind
					)
						throw new Error(
							"Reading route does not match the Encounter.",
						);
					const candidates = storedReadings.map(
						(reading) => reading.emojiDescription,
					);
					const operation =
						options.dumgen.resolveOrGenerateReadingEmojiDescription(
							{
								encounter: resolved.encounter,
								lemma: resolvedLemma,
								candidates,
							} as ComparisonInput<"de">,
						);
					const resolution = yield* operation.pipe(
						Effect.catchTag("CatalogMiss", (failure) =>
							Effect.succeed({
								decision: "CatalogMiss" as const,
								stage: failure.stage,
								route: failure.route ?? "de",
								message: failure.message,
							}),
						),
					);
					return resolution;
				});
			}
		}).pipe(Effect.scoped);
	}

	return Object.freeze({ submitText, resolveSegment });
}

/**
 * Drops optional work that failed or hit a bug, warning on a failure and
 * logging a defect as a bug. Interruption propagates and is never logged.
 */
function withoutFailedWork(subject: string, consequence: string) {
	return <Value, Error>(
		work: Effect.Effect<Value, Error>,
	): Effect.Effect<Value | null> =>
		Effect.catchAllCause(work, (cause) => {
			if (Cause.isInterruptedOnly(cause)) return Effect.interrupt;
			const failure = Cause.failureOption(cause);
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

/** Transitional test-port boundary; production Dumgen and Dumdict return Effects. */
function effectFrom<Value, Error>(
	value: Effect.Effect<Value, Error> | Promise<Value>,
): Effect.Effect<Value, Error | Cause.UnknownException> {
	return Effect.isEffect(value) ? value : Effect.tryPromise(() => value);
}

function surfaceIdentityKey(surface: Dumling.Surface<"de">): string {
	return makeSurfaceId("de", surface);
}

function parseGermanSentence(stored: PersistedSentence): EncounterSentence {
	if (stored.language !== "de") {
		throw new Error("Only German click resolution is enabled in tf-demo.");
	}
	assertStoredSentence(stored);
	return encounterSentenceOf(stored);
}

/** The stored Segments an Encounter's target names, for committing membership. */
function storedMemberIndices(
	stored: PersistedSentence | null,
	encounter: Encounter<"de">,
): readonly number[] {
	if (!stored)
		throw new Error("The stored Sentence is needed to commit membership.");
	const view = parseGermanSentence(stored);
	return encounter.target.memberSegmentIndices.map((index) => {
		const storedIndex = view.storedIndex(index);
		if (storedIndex === undefined)
			throw new Error("An Encounter member is not a stored Segment.");
		return storedIndex;
	});
}

function assertNonEmpty(value: string, field: string): void {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new TypeError(`${field} must be a non-empty string.`);
	}
}
