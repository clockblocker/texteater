import { makeSurfaceId } from "dumdict/planning";
import type * as Dumling from "dumling/types";
import type * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import {
	isSupportedTargetLanguage,
	type SupportedTargetLanguage,
} from "../shared/supported-target-language";
import { clickGrammarInputOf, clickSentenceOf } from "./clickGrammarInput";
import type {
	ClickEncounter,
	ClickResolution,
	ReadingResolution,
} from "./clickResolution";
import { assertNonEmpty } from "./identifiers";
import { annotateInspectionStep } from "./inspectionCapture";
import { type JudgedGrammarSave, judgedGrammarSave } from "./judgedGrammarSave";
import {
	emojiDescriptionOf,
	lemmaIdentityKey,
	readingIdentityKey,
} from "./linguisticIdentity";
import { parseReading } from "./operationalParsing";
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
		lemma: Dumling.Lemma<Dumling.Language>,
	) => Promise<readonly Dumling.Reading<Dumling.Language>[]>;
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
		language: SupportedTargetLanguage,
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
	const resolveSegment = Effect.fn("LinguisticOrchestration.resolveSegment")(
		function* (
			selection: ResolveSegmentInput,
			checkpoints: ResolutionCheckpoints = {},
			initialContext?: ResolutionContext,
		): Effect.fn.Return<ResolveSegmentResult, ResolutionRunError, R> {
			const judging = judgedGrammarSave(options.observer);
			return yield* Effect.gen(function* () {
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
					: yield* resolveGrammatical(
							options,
							context,
							input,
							judging,
						);

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
			}).pipe(Effect.ensuring(judging.landed));
		},
	);

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

const loadResolutionContext = Effect.fn("Load resolution context")(function* <
	R,
>(options: TfDemoOrchestratorOptions<R>, input: ResolveSegmentInput) {
	yield* annotateInspectionStep("app/tf-demo", input);
	return yield* Effect.tryPromise(() =>
		options.persistence.loadResolutionContext(input),
	);
});

const resegmentFailedSentence = Effect.fn("Segment the failed sentence again")(
	function* <R>(
		resegment: NonNullable<TfDemoOrchestratorOptions<R>["resegment"]>,
		stitchedText: string,
		language: SupportedTargetLanguage,
	) {
		yield* annotateInspectionStep("battery/dumgen · segment.inUnits", {
			stitchedText,
		});
		return yield* resegment(stitchedText, language);
	},
);

const storeResegmentedUnits = Effect.fn("Store the sentence's new units")(
	function* (
		store: NonNullable<
			OrchestrationPersistence["storeResegmentedSentence"]
		>,
		input: ResolveSegmentInput,
		resegmented: ResegmentedSentence,
	) {
		yield* annotateInspectionStep("app/tf-demo · persistence", resegmented);
		return yield* Effect.tryPromise(() =>
			store({ ...input, ...resegmented }),
		);
	},
);

/**
 * A Sentence intake failed to segment is segmented again on its first
 * click, its units stored, then resolved as usual (#861): the click's
 * Segment index and context after that, or both unchanged.
 */
const resegmentIfFailed = Effect.fn(
	"LinguisticOrchestration.resegmentIfFailed",
)(function* <R>(
	options: TfDemoOrchestratorOptions<R>,
	input: ResolveSegmentInput,
	context: ResolutionContext,
	checkpoints: ResolutionCheckpoints,
) {
	const failed = context.sentence?.segmentationFailed === true;
	const { resegment } = options;
	const store = options.persistence.storeResegmentedSentence;
	if (!failed || checkpoints.grammatical || !resegment || !store) {
		return { input, context };
	}
	const stitchedText = context.sentence?.stitchedText ?? "";
	const language = context.sentence?.language;
	if (!isSupportedTargetLanguage(language))
		throw new Error(
			"Click resolution requires a supported target language.",
		);
	const resegmented = yield* resegmentFailedSentence(
		resegment,
		stitchedText,
		language,
	);
	const stored = yield* storeResegmentedUnits(store, input, resegmented);
	const next = {
		...input,
		clickedSegmentIndex: stored.clickedSegmentIndex,
	};
	return {
		input: next,
		context: yield* loadResolutionContext(options, next),
	};
});

/** A click on a Segment whose occurrence is stored already reuses it. */
const commitReuse = Effect.fn("Commit reused occurrence")(function* <R>(
	options: TfDemoOrchestratorOptions<R>,
	input: ResolveSegmentInput,
	reusable: ReusableAttestation,
) {
	const reuse = {
		...input,
		attestationId: reusable.attestationId,
	};
	yield* annotateInspectionStep("app/tf-demo · persistence", reuse);
	const persisted = yield* Effect.tryPromise(() =>
		options.persistence.persistReusedResolvedClick(reuse),
	);
	return {
		grammatical: reusable.grammatical,
		reading: reusable.reading,
		reused: true as const,
		persisted,
	};
});

/** Commits a click Grammar left unresolved, or the occurrence a competing click resolved meanwhile. */
const commitUnresolved = Effect.fn("Commit unresolved encounter")(function* <R>(
	options: TfDemoOrchestratorOptions<R>,
	input: ResolveSegmentInput,
	grammatical: NonResolvedGrammatical,
) {
	yield* annotateInspectionStep("app/tf-demo · persistence", input);
	const persisted = yield* Effect.tryPromise(() =>
		options.persistence.persistUnresolvedClick(input),
	);
	return persisted.status === "Reused"
		? {
				grammatical: persisted.occurrence.grammatical,
				reading: persisted.occurrence.reading,
				reused: true as const,
				persisted,
			}
		: { grammatical, persisted };
});

/** Grammar, telling `judging` what jev judged and when it has returned. */
const resolveGrammatical = Effect.fn("Resolve grammar")(function* <R>(
	options: TfDemoOrchestratorOptions<R>,
	context: ResolutionContext,
	request: ResolveSegmentInput,
	judging: JudgedGrammarSave,
) {
	const input = clickGrammarInputOf(context, request.clickedSegmentIndex);
	const { unit } = input;
	yield* annotateInspectionStep("app/tf-demo · ClickResolution", {
		clickedSegmentIndex: request.clickedSegmentIndex,
		unit,
	});
	return yield* options.resolution
		.grammar(input, judging.onJudged)
		.pipe(Effect.ensuring(judging.grammarReturned));
});

const findStoredReadings = Effect.fn("Find stored Readings")(function* <R>(
	options: TfDemoOrchestratorOptions<R>,
	lemma: Dumling.Lemma<Dumling.Language>,
) {
	yield* annotateInspectionStep("battery/dumdict", { lemma });
	return yield* Effect.tryPromise(() => options.findStoredReadings(lemma));
});

/**
 * Resolves the Reading of a resolved Grammar and commits the occurrence.
 * A checkpointed Reading is saved already; any other rides along with its
 * commit as the ReadingAvailable progress.
 *
 * Grammar is saved as GrammarAvailable beside the Reading's work, not
 * before it: the commit joins that save before it writes, so the session
 * still reaches GrammarAvailable before ReadingAvailable, and every other
 * ending waits for it too, since a Convex write cannot be cancelled.
 */
const resolveAndCommitReading = Effect.fn(
	"LinguisticOrchestration.resolveAndCommitReading",
)(function* <R>(
	options: TfDemoOrchestratorOptions<R>,
	input: ResolveSegmentInput,
	context: ResolutionContext,
	checkpoints: ResolutionCheckpoints,
	grammatical: ResolvedGrammatical,
) {
	const saving = yield* Effect.forkChild(
		saveGrammar(options, checkpoints, grammatical),
		{ uninterruptible: true },
	);
	const grammarSaved = Fiber.join(saving);
	return yield* resolveReadingAndCommit(
		options,
		input,
		context,
		checkpoints,
		grammatical,
		grammarSaved,
	).pipe(Effect.ensuring(Effect.asVoid(Effect.exit(grammarSaved))));
});

const resolveReadingAndCommit = Effect.fn(
	"LinguisticOrchestration.resolveReadingAndCommit",
)(function* <R>(
	options: TfDemoOrchestratorOptions<R>,
	input: ResolveSegmentInput,
	context: ResolutionContext,
	checkpoints: ResolutionCheckpoints,
	grammatical: ResolvedGrammatical,
	grammarSaved: Effect.Effect<void, Cause.UnknownError>,
) {
	const { lemma } = grammatical.attestation.surface;
	const storedReadings = checkpoints.reading
		? null
		: yield* findStoredReadings(options, lemma);
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
	yield* grammarSaved;
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
	for (let rejudged = 0; persisted.status === "StaleReading"; rejudged++) {
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

const saveGrammarAvailable = Effect.fn("Save GrammarAvailable")(function* (
	observer: ResolutionProgressObserver,
	grammatical: ResolvedGrammatical,
) {
	yield* annotateInspectionStep("app/tf-demo · resolutionSessions", {
		progress: "GrammarAvailable",
		grammatical,
	});
	yield* Effect.tryPromise(() => observer.grammarAvailable({ grammatical }));
});

/** Saves Grammar as GrammarAvailable unless a checkpoint holds it. */
function saveGrammar<R>(
	options: TfDemoOrchestratorOptions<R>,
	checkpoints: ResolutionCheckpoints,
	grammatical: ResolvedGrammatical,
): Effect.Effect<void, Cause.UnknownError> {
	const { observer } = options;
	return checkpoints.grammatical || !observer
		? Effect.void
		: saveGrammarAvailable(observer, grammatical);
}

/** The Reading a checkpoint holds, a Foreign Lemma's one Reading, or the one judged over the stored candidates. */
function firstReading<R>(
	options: TfDemoOrchestratorOptions<R>,
	checkpoints: ResolutionCheckpoints,
	grammatical: ResolvedGrammatical,
	lemma: Dumling.Lemma<Dumling.Language>,
	storedReadings: readonly Dumling.Reading<Dumling.Language>[] | null,
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
	checkpoint: Dumling.Reading<Dumling.Language>,
	lemmaKey: string,
	resolved: Dumling.Reading<Dumling.Language>,
): Dumling.Reading<Dumling.Language> {
	const checkpointed = parseReading(checkpoint);
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
	reading: Dumling.Reading<Dumling.Language>,
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

const persistResolvedOccurrence = Effect.fn("Commit resolved occurrence")(
	function* <R>(
		options: TfDemoOrchestratorOptions<R>,
		commit: ResolvedClickPersistence,
	) {
		yield* annotateInspectionStep("app/tf-demo · persistence", commit);
		return yield* Effect.tryPromise(() =>
			options.persistence.persistResolvedClick(commit),
		);
	},
);

/** Commits a resolved click; `announce` sends its Reading as the ReadingAvailable progress. */
const commitResolvedClick = Effect.fn(
	"LinguisticOrchestration.commitResolvedClick",
)(function* <R>(
	options: TfDemoOrchestratorOptions<R>,
	scope: ClickCommitScope,
	reading: Dumling.Reading<Dumling.Language>,
	resolution: ReadingResolution,
	announce: boolean,
) {
	const commit = yield* Effect.try((): ResolvedClickPersistence => {
		const base = resolvedClickCommit(scope, reading, resolution);
		return options.observer
			? {
					...base,
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
			: base;
	});
	return yield* persistResolvedOccurrence(options, commit);
});

/** The Reading over `candidates`; Grammar's draft stands in for a description not yet written. */
const resolveReading = Effect.fn("Resolve Reading")(function* <R>(
	options: TfDemoOrchestratorOptions<R>,
	resolved: ResolvedGrammatical,
	lemma: Dumling.Lemma<Dumling.Language>,
	candidates: readonly string[],
	written?: string,
) {
	if (
		resolved.encounter.target.family !== lemma.family ||
		resolved.encounter.target.kind !== lemma.kind
	)
		throw new Error("Reading route does not match the Encounter.");
	yield* annotateInspectionStep("app/tf-demo · ClickResolution", {
		lemma,
		...(written === undefined ? {} : { written }),
	});
	return yield* options.resolution.reading({
		grammar: resolved,
		lemma,
		candidates,
		...(written === undefined ? {} : { written }),
		...(written === undefined && resolved.drafted !== undefined
			? { drafted: resolved.drafted }
			: {}),
	});
});

/** The Reading a resolution names; both sides compare as Dumling parses them (ADR 0031). */
function readingOf(
	lemma: Dumling.Lemma<Dumling.Language>,
	resolution: ReadingResolution,
) {
	return parseReading({
		unitKind: "Reading",
		lemma,
		...(resolution.emojiDescription === undefined
			? {}
			: { emojiDescription: resolution.emojiDescription }),
	});
}

/** A Foreign Lemma's one Reading, which has no Emoji Description (ADR 0045). */
function foreignReading(
	storedReadings: readonly Dumling.Reading<Dumling.Language>[] | null,
): ReadingResolution {
	return {
		decision: loadedReadings(storedReadings).length > 0 ? "Reuse" : "New",
	};
}

/** The Emoji Descriptions of the Lemma's stored Readings. */
function storedCandidates(
	storedReadings: readonly Dumling.Reading<Dumling.Language>[] | null,
): string[] {
	return loadedReadings(storedReadings).flatMap(
		(stored) => emojiDescriptionOf(stored) ?? [],
	);
}

function loadedReadings(
	storedReadings: readonly Dumling.Reading<Dumling.Language>[] | null,
): readonly Dumling.Reading<Dumling.Language>[] {
	if (!storedReadings) throw new Error("Reading candidates were not loaded.");
	return storedReadings;
}

function surfaceIdentityKey(
	surface: Dumling.Surface<Dumling.Language>,
): string {
	return makeSurfaceId(surface.language, surface);
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
