import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import type {
	ResolutionCheckpoints,
	ResolutionContext,
	ResolutionProgressObserver,
	ResolveSegmentInput,
	ResolveSegmentResult,
} from "./linguisticOrchestration";
import type { GenerationEvent, GenerationFailure } from "./resolutionFailure";
import {
	classifyResolutionFailure,
	projectResolutionGenerationEvent,
	type ResolutionGenerationEvent,
} from "./resolutionFailure";
import type { ResolutionPhase } from "./resolutionLifecycle";

type ResolutionCatalogMiss = Extract<
	ResolveSegmentResult,
	{ catalogMiss: unknown }
>["catalogMiss"];

export type ResolutionSessionRunIdentity = {
	readonly requestId: string;
	readonly runToken: string;
};

export type ResolutionSessionRunInput = {
	readonly selection: ResolveSegmentInput;
	readonly checkpoints: ResolutionCheckpoints;
	readonly context?: ResolutionContext;
};

/**
 * The progress a run saves on its own. ReadingAvailable is saved by the
 * commit it precedes (`ResolutionProgressObserver.committing`).
 */
export type ResolutionSessionAdvance =
	| { readonly progress: "RouteAvailable" }
	| {
			readonly progress: "GrammarAvailable";
			readonly grammatical: Parameters<
				ResolutionProgressObserver["grammarAvailable"]
			>[0]["grammatical"];
	  };

/**
 * A catalog miss is the one outcome no commit settles; every other outcome
 * settles the session inside its own persistence mutation.
 */
export type ResolutionSessionSettlement = {
	readonly kind: "CatalogMiss";
	readonly miss: ResolutionCatalogMiss;
};

export type ResolutionSessionRunRecord =
	| {
			readonly kind: "Succeeded";
			readonly phase: ResolutionPhase;
			readonly generationEvents: readonly ResolutionGenerationEvent[];
	  }
	| {
			readonly kind: "GenerationFailed";
			readonly phase: ResolutionPhase;
			readonly failure: GenerationFailure;
			readonly generationEvents: readonly ResolutionGenerationEvent[];
	  }
	| {
			readonly kind: "InternalFailed";
			readonly phase: ResolutionPhase;
			readonly diagnosticId: string;
			readonly errorName: string;
			readonly errorFingerprint: string;
			readonly generationEvents: readonly ResolutionGenerationEvent[];
	  };

export type ResolutionSessionLifecyclePort = {
	/** Claims this guarded run and returns its durable checkpoints. */
	readonly begin: () => Promise<ResolutionSessionRunInput | null>;
	readonly advance: (event: ResolutionSessionAdvance) => Promise<void>;
	readonly settle: (result: ResolutionSessionSettlement) => Promise<void>;
	readonly record: (record: ResolutionSessionRunRecord) => Promise<void>;
};

export type ResolutionSessionLinguisticPort = (
	selection: ResolveSegmentInput,
	checkpoints: ResolutionCheckpoints,
	observer: ResolutionProgressObserver,
	context?: ResolutionContext,
) => Effect.Effect<ResolveSegmentResult, unknown, never>;

type ResolutionExecutionDiagnostics = {
	readonly info: (message: string) => void;
	readonly error: (message: string) => void;
};

export type ResolutionSessionExecution = {
	readonly identity: ResolutionSessionRunIdentity;
	readonly lifecycle: ResolutionSessionLifecyclePort;
	readonly resolve: ResolutionSessionLinguisticPort;
	readonly diagnostics?: ResolutionExecutionDiagnostics;
	readonly createDiagnosticId?: () => string;
};

/**
 * Whether the run's success was recorded by the commit itself: the commit
 * of a resolved click, which alone carries its Reading resolution, writes
 * its progress and the run's record in its own transaction.
 */
function recordedByCommit(result: ResolveSegmentResult): boolean {
	return "readingResolution" in result;
}

/**
 * Executes one guarded Resolution Session run. Callers cross one seam; this
 * module owns progress ordering, checkpoint resume, settlement, diagnostics,
 * and success/failure recording.
 */
export function executeResolutionSession({
	identity,
	lifecycle,
	resolve,
	diagnostics = console,
	createDiagnosticId = () => crypto.randomUUID(),
}: ResolutionSessionExecution) {
	let phase: ResolutionPhase = "Route";
	const generationEvents: ResolutionGenerationEvent[] = [];
	return Effect.gen(function* () {
		const onGenerationEvent = (event: GenerationEvent) => {
			const projected = projectResolutionGenerationEvent(event, {
				...identity,
				phase,
			});
			generationEvents.push(projected);
			diagnostics.info(
				JSON.stringify({
					event: "ResolutionGeneration",
					generation: projected,
				}),
			);
		};
		const observer: ResolutionProgressObserver = {
			generationEvent: onGenerationEvent,
			async grammarAvailable({ grammatical }) {
				await lifecycle.advance({
					progress: "GrammarAvailable",
					grammatical,
				});
				phase = "Reading";
			},
			committing({ readingAvailable }) {
				phase = "Commit";
				return {
					...(readingAvailable ? { readingAvailable } : {}),
					succeeded: {
						phase,
						generationEvents: [...generationEvents],
					},
				};
			},
		};

		const input = yield* Effect.tryPromise(() => lifecycle.begin());
		if (!input) return;
		yield* Effect.tryPromise(() =>
			lifecycle.advance({ progress: "RouteAvailable" }),
		);
		phase = input.checkpoints.reading
			? "Commit"
			: input.checkpoints.grammatical
				? "Reading"
				: "Grammar";
		const result = yield* resolve(
			input.selection,
			input.checkpoints,
			observer,
			input.context,
		);
		if ("catalogMiss" in result) {
			yield* Effect.tryPromise(() =>
				lifecycle.settle({
					kind: "CatalogMiss",
					miss: result.catalogMiss,
				}),
			);
			yield* Effect.tryPromise(() =>
				lifecycle.record({
					kind: "Succeeded",
					phase,
					generationEvents,
				}),
			);
			return;
		}
		if (recordedByCommit(result)) return;
		yield* Effect.tryPromise(() =>
			lifecycle.record({
				kind: "Succeeded",
				phase,
				generationEvents,
			}),
		);
	}).pipe(
		Effect.catchCause((cause) => {
			if (Cause.hasInterruptsOnly(cause)) return Effect.failCause(cause);
			const error = Cause.squash(cause);
			const classified = classifyResolutionFailure(error);
			const diagnosticId = createDiagnosticId();
			if (classified.kind === "Generation") {
				return Effect.tryPromise(() =>
					lifecycle.record({
						kind: "GenerationFailed",
						phase,
						failure: classified.failure,
						generationEvents,
					}),
				);
			}
			diagnostics.error(
				JSON.stringify({
					event: "ResolutionRunInternalFailure",
					...identity,
					phase,
					diagnosticId,
					errorName: classified.errorName,
					errorFingerprint: classified.errorFingerprint,
				}),
			);
			return Effect.tryPromise(() =>
				lifecycle.record({
					kind: "InternalFailed",
					phase,
					diagnosticId,
					errorName: classified.errorName,
					errorFingerprint: classified.errorFingerprint,
					generationEvents,
				}),
			).pipe(
				Effect.catch((recordingError) =>
					Effect.sync(() => {
						diagnostics.error(
							JSON.stringify({
								event: "ResolutionFailureRecordingFailed",
								...identity,
								phase,
								diagnosticId,
								recordingFailure:
									classifyResolutionFailure(recordingError),
							}),
						);
					}),
				),
			);
		}),
	);
}
