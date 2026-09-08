import { withTraceRecorder } from "common-utils/workflow";
import type { GenerationEvent, GenerationFailure } from "dumgen";
import * as Effect from "effect/Effect";
import type {
	ResolutionCheckpoints,
	ResolutionProgressObserver,
	ResolveSegmentInput,
	ResolveSegmentResult,
} from "./linguisticOrchestration";
import {
	classifyResolutionFailure,
	projectResolutionGenerationEvent,
	type ResolutionGenerationEvent,
	type ResolutionRunPhase,
} from "./resolutionFailure";
import {
	projectResolutionGrammar,
	projectResolutionReading,
} from "./resolutionSessionProjection";

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
};

export type ResolutionSessionAdvance =
	| { readonly progress: "RouteAvailable" }
	| {
			readonly progress: "GrammarAvailable";
			readonly grammatical: Parameters<
				ResolutionProgressObserver["grammarAvailable"]
			>[0]["grammatical"];
	  }
	| {
			readonly progress: "ReadingAvailable";
			readonly reading: Parameters<
				ResolutionProgressObserver["readingAvailable"]
			>[0]["reading"];
			readonly readingResolution: Parameters<
				ResolutionProgressObserver["readingAvailable"]
			>[0]["readingResolution"];
	  }
	| { readonly progress: "Committing" };

export type ResolutionSessionSettlement =
	| { readonly kind: "CatalogMiss"; readonly miss: ResolutionCatalogMiss }
	| {
			readonly kind: "Complete";
			readonly readingId: string;
			readonly attestationId: string;
			readonly grammar: ReturnType<typeof projectResolutionGrammar>;
			readonly reading: ReturnType<typeof projectResolutionReading>;
	  }
	| { readonly kind: "Unresolved" };

export type ResolutionSessionRunRecord =
	| {
			readonly kind: "Succeeded";
			readonly phase: ResolutionRunPhase;
			readonly generationEvents: readonly ResolutionGenerationEvent[];
	  }
	| {
			readonly kind: "GenerationFailed";
			readonly phase: ResolutionRunPhase;
			readonly failure: GenerationFailure;
			readonly generationEvents: readonly ResolutionGenerationEvent[];
	  }
	| {
			readonly kind: "InternalFailed";
			readonly phase: ResolutionRunPhase;
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
	let phase: ResolutionRunPhase = "Route";
	const generationEvents: ResolutionGenerationEvent[] = [];
	return Effect.gen(function* () {
		const onGenerationEvent = (event: GenerationEvent) => {
			const projected = projectResolutionGenerationEvent(event, {
				...identity,
				phase,
			});
			if (generationEvents.length < 64) generationEvents.push(projected);
			diagnostics.info(
				JSON.stringify({
					event: "ResolutionGeneration",
					generation: projected,
				}),
			);
		};
		const observer: ResolutionProgressObserver = {
			async grammarAvailable({ grammatical }) {
				await lifecycle.advance({
					progress: "GrammarAvailable",
					grammatical,
				});
				phase = "Reading";
			},
			async readingAvailable({ reading, readingResolution }) {
				await lifecycle.advance({
					progress: "ReadingAvailable",
					reading,
					readingResolution,
				});
				phase = "Commit";
			},
			async committing() {
				phase = "Commit";
				await lifecycle.advance({ progress: "Committing" });
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
		const result = yield* withTraceRecorder(
			resolve(input.selection, input.checkpoints, observer),
			{
				record: (trace) =>
					Effect.sync(() => {
						if (trace.event === "model.generation.event")
							onGenerationEvent(trace.payload as GenerationEvent);
					}),
				diagnostic: diagnostics.error,
			},
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
		if ("deduplicated" in result && result.deduplicated) {
			const persisted = result.persisted;
			if (persisted.status === "Resolved") {
				yield* Effect.tryPromise(() =>
					lifecycle.settle({
						kind: "Complete",
						readingId: persisted.readingId,
						attestationId: persisted.occurrence.attestationId,
						grammar: projectResolutionGrammar(
							persisted.occurrence.grammatical,
						),
						reading: projectResolutionReading(
							persisted.occurrence.reading,
						),
					}),
				);
			} else {
				yield* Effect.tryPromise(() =>
					lifecycle.settle({ kind: "Unresolved" }),
				);
			}
		}
		yield* Effect.tryPromise(() =>
			lifecycle.record({
				kind: "Succeeded",
				phase,
				generationEvents,
			}),
		);
	}).pipe(
		Effect.catchAll((error) => {
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
				Effect.catchAll((recordingError) =>
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
