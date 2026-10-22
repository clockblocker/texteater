import { makeSurfaceId } from "dumdict/planning";
import type * as Dumling from "dumling/types";
import type * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import type {
	ClickEncounter,
	ClickResolution,
	ClickSentence,
	ReadingResolution,
} from "./clickResolution";
import { assertNonEmpty } from "./identifiers";
import { inspectionStep } from "./inspectionCapture";
import {
	emojiDescriptionOf,
	lemmaIdentityKey,
	readingIdentityKey,
} from "./linguisticIdentity";
import { parseGermanLemma, parseGermanReading } from "./operationalParsing";
import type {
	NonResolvedGrammatical,
	OrchestrationPersistence,
	PersistedSentence,
	ResegmentedSentence,
	ResolutionCheckpoints,
	ResolutionContext,
	ResolutionProgressObserver,
	ResolvedClickPersistence,
	ResolvedGrammatical,
	ResolveSegmentInput,
	ResolveSegmentResult,
	ReusableAttestation,
} from "./orchestrationPorts";
import type { ModelFailure, ResolutionRunError } from "./resolutionFailure";
import {
	assertStoredSentence,
	encounterSentenceOf,
	unitsByMember,
} from "./storedSegments";

export type {
	OrchestrationPersistence,
	ResolutionContext,
	ReusableAttestation,
} from "./orchestrationPorts";

/** How often a click judges its Reading again after its New was refused as stale. */
const MAX_STALE_REJUDGES = 2;

/** `R` is what the model work needs: Dumgen's `Jev | Luna` in production. */
type TfDemoOrchestratorOptions<R = never> = {
	/** Grammar, then the Reading's Emoji Description; production runs `dumgenClickResolution`. */
	readonly resolution: ClickResolution<R>;
	/** The Readings the Shared Demo Dictionary already stores for a Lemma. */
	readonly findStoredReadings: (
		lemma: Dumling.Lemma<"de">,
	) =>
		| Effect.Effect<readonly Dumling.Reading<"de">[], Cause.UnknownError>
		| Promise<readonly Dumling.Reading<"de">[]>;
	readonly persistence: OrchestrationPersistence;
	readonly observer?: ResolutionProgressObserver;
	/**
	 * Segments a Sentence whose intake segmentation failed again, on the
	 * first click on it (#861): Dumgen's `segment.inUnits` for that one
	 * Sentence. A segmentation that fails again fails the click; the next
	 * click is a fresh attempt.
	 */
	readonly resegment?: (
		stitchedText: string,
	) => Effect.Effect<ResegmentedSentence, ModelFailure, R>;
};

/**
 * Composes click resolution behind the ClickResolution port and one
 * persistence port. The dictionary is consulted only to compare stored
 * Readings; dictionary planning happens where it commits, inside the
 * persistence port's transaction. Convex supplies the production ports;
 * tests can use in-memory ones without changing workflow or conflict
 * semantics.
 */
export function createTfDemoOrchestrator<R = never>(
	options: TfDemoOrchestratorOptions<R>,
) {
	function resolveSegment(
		selection: ResolveSegmentInput,
		checkpoints: ResolutionCheckpoints = {},
		initialContext?: ResolutionContext,
	): Effect.Effect<ResolveSegmentResult, ResolutionRunError, R> {
		return Effect.gen(function* () {
			validateSelection(selection);
			const loaded =
				initialContext ??
				(yield* loadResolutionContext(options, selection));
			const { input, context } = yield* resegmentIfFailed(
				options,
				selection,
				loaded,
				checkpoints,
			);
			if (context.reusable) {
				return yield* commitReuse(options, input, context.reusable);
			}

			const grammatical = checkpoints.grammatical
				? checkpoints.grammatical
				: yield* resolveGrammatical(options, context, input);

			if (grammatical.decision === "CatalogMiss") {
				return { catalogMiss: grammatical };
			}
			if (grammatical.decision !== "Resolved") {
				return yield* commitUnresolved(options, input, grammatical);
			}
			return yield* resolveAndCommitReading(
				options,
				input,
				context,
				checkpoints,
				grammatical,
			);
		});
	}

	return Object.freeze({ resolveSegment });
}

function validateSelection(input: ResolveSegmentInput): void {
	assertNonEmpty(input.requestId, "requestId");
	assertNonEmpty(input.visitorId, "visitorId");
	assertNonEmpty(input.sentenceId, "sentenceId");
	if (!Number.isSafeInteger(input.clickedSegmentIndex)) {
		throw new TypeError("clickedSegmentIndex must be a safe integer.");
	}
}

function loadResolutionContext<R>(
	options: TfDemoOrchestratorOptions<R>,
	input: ResolveSegmentInput,
) {
	return Effect.tryPromise(() =>
		options.persistence.loadResolutionContext(input),
	).pipe(
		Effect.withSpan(
			"Load resolution context",
			inspectionStep("app/tf-demo", input),
		),
	);
}

/**
 * A Sentence intake failed to segment is segmented again on its first
 * click, its units stored, then resolved as usual (#861): the click's
 * Segment index and context after that, or both unchanged.
 */
function resegmentIfFailed<R>(
	options: TfDemoOrchestratorOptions<R>,
	input: ResolveSegmentInput,
	context: ResolutionContext,
	checkpoints: ResolutionCheckpoints,
) {
	return Effect.gen(function* () {
		const failed = context.sentence?.segmentationFailed === true;
		const { resegment } = options;
		const store = options.persistence.storeResegmentedSentence;
		if (!failed || checkpoints.grammatical || !resegment || !store) {
			return { input, context };
		}
		const stitchedText = context.sentence?.stitchedText ?? "";
		const resegmented = yield* resegment(stitchedText).pipe(
			Effect.withSpan(
				"Segment the failed sentence again",
				inspectionStep("battery/dumgen · segment.inUnits", {
					stitchedText,
				}),
			),
		);
		const stored = yield* Effect.tryPromise(() =>
			store({ ...input, ...resegmented }),
		).pipe(
			Effect.withSpan(
				"Store the sentence's new units",
				inspectionStep("app/tf-demo · persistence", resegmented),
			),
		);
		const next = {
			...input,
			clickedSegmentIndex: stored.clickedSegmentIndex,
		};
		return {
			input: next,
			context: yield* loadResolutionContext(options, next),
		};
	});
}

/** A click on a Segment whose occurrence is stored already reuses it. */
function commitReuse<R>(
	options: TfDemoOrchestratorOptions<R>,
	input: ResolveSegmentInput,
	reusable: ReusableAttestation,
) {
	const reuse = {
		...input,
		attestationId: reusable.attestationId,
	};
	return Effect.tryPromise(() =>
		options.persistence.persistReusedResolvedClick(reuse),
	).pipe(
		Effect.withSpan(
			"Commit reused occurrence",
			inspectionStep("app/tf-demo · persistence", reuse),
		),
		Effect.map((persisted) => ({
			grammatical: reusable.grammatical,
			reading: reusable.reading,
			reused: true as const,
			persisted,
		})),
	);
}

/** Commits a click Grammar left unresolved, or the occurrence a competing click resolved meanwhile. */
function commitUnresolved<R>(
	options: TfDemoOrchestratorOptions<R>,
	input: ResolveSegmentInput,
	grammatical: NonResolvedGrammatical,
) {
	return Effect.tryPromise(() =>
		options.persistence.persistUnresolvedClick(input),
	).pipe(
		Effect.withSpan(
			"Commit unresolved encounter",
			inspectionStep("app/tf-demo · persistence", input),
		),
		Effect.map((persisted) =>
			persisted.status === "Reused"
				? {
						grammatical: persisted.occurrence.grammatical,
						reading: persisted.occurrence.reading,
						reused: true as const,
						persisted,
					}
				: { grammatical, persisted },
		),
	);
}

function resolveGrammatical<R>(
	options: TfDemoOrchestratorOptions<R>,
	context: ResolutionContext,
	request: ResolveSegmentInput,
) {
	const stored = context.sentence;
	if (!stored) throw new Error("The requested sentence does not exist.");
	const sentence = clickSentenceOf(stored);
	const unit = unitsByMember(stored.units).get(request.clickedSegmentIndex);
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
					clickedSegmentIndex: request.clickedSegmentIndex,
					unit,
				}),
			),
		);
}

/**
 * Resolves the Reading of a resolved Grammar and commits the occurrence.
 * A checkpointed Reading is saved already; any other rides along with its
 * commit as the ReadingAvailable progress.
 */
function resolveAndCommitReading<R>(
	options: TfDemoOrchestratorOptions<R>,
	input: ResolveSegmentInput,
	context: ResolutionContext,
	checkpoints: ResolutionCheckpoints,
	grammatical: ResolvedGrammatical,
) {
	return Effect.gen(function* () {
		const lemma = parseGermanLemma(grammatical.attestation.surface.lemma);
		const storedReadings = yield* saveGrammarAndLoadReadings(
			options,
			checkpoints,
			grammatical,
			lemma,
		);
		const lemmaKey = lemmaIdentityKey(lemma);
		const first = yield* firstReading(
			options,
			checkpoints,
			grammatical,
			lemma,
			storedReadings,
		);
		if (first.decision === "CatalogMiss") {
			return { catalogMiss: first };
		}
		let readingResolution: ReadingResolution = first;
		let reading = readingOf(lemma, readingResolution);
		if (checkpoints.reading) {
			reading = checkpointedReading(
				checkpoints.reading.reading,
				lemmaKey,
				reading,
			);
		}

		const scope: ClickCommitScope = {
			input,
			sentence: context.sentence,
			grammatical,
			surfaceKey: surfaceIdentityKey(grammatical.attestation.surface),
			lemmaKey,
		};
		let persisted = yield* commitResolvedClick(
			options,
			scope,
			reading,
			readingResolution,
			!checkpoints.reading,
		);
		// A New whose judge saw fewer Readings than the Lemma has now is
		// refused: the judge runs again over the current candidates, and a
		// second NoMatch keeps the description already written (ADR 0031).
		for (
			let rejudged = 0;
			persisted.status === "StaleReading";
			rejudged++
		) {
			if (rejudged === MAX_STALE_REJUDGES)
				throw new Error(
					"The Lemma kept gaining Readings while this click resolved; click it again.",
				);
			const again = yield* resolveReading(
				options,
				grammatical,
				lemma,
				persisted.candidates,
				readingResolution.emojiDescription,
			);
			if (again.decision === "CatalogMiss") {
				return { catalogMiss: again };
			}
			readingResolution = again;
			reading = readingOf(lemma, readingResolution);
			persisted = yield* commitResolvedClick(
				options,
				scope,
				reading,
				readingResolution,
				true,
			);
		}
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
	});
}

/**
 * Saves Grammar unless a checkpoint holds it, and meanwhile loads the
 * Lemma's stored Readings unless a checkpoint holds the Reading.
 */
function saveGrammarAndLoadReadings<R>(
	options: TfDemoOrchestratorOptions<R>,
	checkpoints: ResolutionCheckpoints,
	grammatical: ResolvedGrammatical,
	lemma: Dumling.Lemma<"de">,
) {
	return Effect.gen(function* () {
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
						: effectFrom(options.findStoredReadings(lemma)).pipe(
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
		return yield* readingsLoaded;
	});
}

/** The Reading a checkpoint holds, a Foreign Lemma's one Reading, or the one judged over the stored candidates. */
function firstReading<R>(
	options: TfDemoOrchestratorOptions<R>,
	checkpoints: ResolutionCheckpoints,
	grammatical: ResolvedGrammatical,
	lemma: Dumling.Lemma<"de">,
	storedReadings: readonly Dumling.Reading<"de">[] | null,
) {
	if (checkpoints.reading) {
		return Effect.succeed(checkpoints.reading.resolution);
	}
	if (lemma.family === "Foreign") {
		return Effect.succeed(foreignReading(storedReadings));
	}
	return resolveReading(
		options,
		grammatical,
		lemma,
		storedCandidates(storedReadings),
	);
}

/** The checkpointed Reading, which must name the Reading Grammar resolved. */
function checkpointedReading(
	checkpoint: Dumling.Reading<"de">,
	lemmaKey: string,
	resolved: Dumling.Reading<"de">,
): Dumling.Reading<"de"> {
	const checkpointed = parseGermanReading(checkpoint);
	if (
		lemmaIdentityKey(checkpointed.lemma) !== lemmaKey ||
		emojiDescriptionOf(checkpointed) !== emojiDescriptionOf(resolved)
	) {
		throw new Error("The Reading checkpoint does not match Grammar.");
	}
	return checkpointed;
}

/** What every commit of one resolved click shares, whichever Reading it commits. */
type ClickCommitScope = {
	readonly input: ResolveSegmentInput;
	readonly sentence: PersistedSentence | null;
	readonly grammatical: ResolvedGrammatical;
	readonly surfaceKey: string;
	readonly lemmaKey: string;
};

/** The commit of a resolved click with `reading`, before its progress. */
export function resolvedClickCommit(
	scope: ClickCommitScope,
	reading: Dumling.Reading<"de">,
	resolution: ReadingResolution,
): ResolvedClickPersistence {
	return {
		...scope.input,
		occurrence: {
			memberSegmentIndices: storedMemberIndices(
				scope.sentence,
				scope.grammatical.encounter,
			),
			attestation: scope.grammatical.attestation,
			surfaceKey: scope.surfaceKey,
			lemmaKey: scope.lemmaKey,
		},
		reading,
		readingKey: readingIdentityKey(reading),
		readingDecision: resolution.decision,
		...(resolution.decision === "New" && resolution.candidates !== undefined
			? { readingCandidates: resolution.candidates }
			: {}),
	};
}

/** Commits a resolved click; `announce` sends its Reading as the ReadingAvailable progress. */
function commitResolvedClick<R>(
	options: TfDemoOrchestratorOptions<R>,
	scope: ClickCommitScope,
	reading: Dumling.Reading<"de">,
	resolution: ReadingResolution,
	announce: boolean,
) {
	return Effect.try((): ResolvedClickPersistence => {
		const commit = resolvedClickCommit(scope, reading, resolution);
		return options.observer
			? {
					...commit,
					progress: options.observer.committing(
						announce
							? {
									readingAvailable: {
										reading,
										readingResolution: resolution,
									},
								}
							: {},
					),
				}
			: commit;
	}).pipe(
		Effect.flatMap((commit) =>
			Effect.tryPromise(() =>
				options.persistence.persistResolvedClick(commit),
			).pipe(
				Effect.withSpan(
					"Commit resolved occurrence",
					inspectionStep("app/tf-demo · persistence", commit),
				),
			),
		),
	);
}

/** The Reading over `candidates`; Grammar's draft stands in for a description not yet written. */
function resolveReading<R>(
	options: TfDemoOrchestratorOptions<R>,
	resolved: ResolvedGrammatical,
	lemma: Dumling.Lemma<"de">,
	candidates: readonly string[],
	written?: string,
) {
	if (
		resolved.encounter.target.family !== lemma.family ||
		resolved.encounter.target.kind !== lemma.kind
	)
		throw new Error("Reading route does not match the Encounter.");
	return options.resolution
		.reading({
			grammar: resolved,
			lemma,
			candidates,
			...(written === undefined ? {} : { written }),
			...(written === undefined && resolved.drafted !== undefined
				? { drafted: resolved.drafted }
				: {}),
		})
		.pipe(
			Effect.withSpan(
				"Resolve Reading",
				inspectionStep("app/tf-demo · ClickResolution", {
					lemma,
					...(written === undefined ? {} : { written }),
				}),
			),
		);
}

/** The Reading a resolution names; both sides compare as Dumling parses them (ADR 0031). */
function readingOf(lemma: Dumling.Lemma<"de">, resolution: ReadingResolution) {
	return parseGermanReading({
		unitKind: "Reading",
		lemma,
		...(resolution.emojiDescription === undefined
			? {}
			: { emojiDescription: resolution.emojiDescription }),
	});
}

/** A Foreign Lemma's one Reading, which has no Emoji Description (ADR 0045). */
function foreignReading(
	storedReadings: readonly Dumling.Reading<"de">[] | null,
): ReadingResolution {
	return {
		decision: loadedReadings(storedReadings).length > 0 ? "Reuse" : "New",
	};
}

/** The Emoji Descriptions of the Lemma's stored Readings. */
function storedCandidates(
	storedReadings: readonly Dumling.Reading<"de">[] | null,
): string[] {
	return loadedReadings(storedReadings).flatMap(
		(stored) => emojiDescriptionOf(stored) ?? [],
	);
}

function loadedReadings(
	storedReadings: readonly Dumling.Reading<"de">[] | null,
): readonly Dumling.Reading<"de">[] {
	if (!storedReadings) throw new Error("Reading candidates were not loaded.");
	return storedReadings;
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
