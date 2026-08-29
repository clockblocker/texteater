import type { GenerationEvent, GenerationFailure } from "dumgen";
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
	onGenerationEvent: (event: GenerationEvent) => void,
) => Promise<ResolveSegmentResult>;

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
export async function executeResolutionSession({
	identity,
	lifecycle,
	resolve,
	diagnostics = console,
	createDiagnosticId = () => crypto.randomUUID(),
}: ResolutionSessionExecution): Promise<void> {
	let phase: ResolutionRunPhase = "Route";
	const generationEvents: ResolutionGenerationEvent[] = [];
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

	try {
		const input = await lifecycle.begin();
		if (!input) return;
		await lifecycle.advance({ progress: "RouteAvailable" });
		phase = input.checkpoints.reading
			? "Commit"
			: input.checkpoints.grammatical
				? "Reading"
				: "Grammar";
		const result = await resolve(
			input.selection,
			input.checkpoints,
			observer,
			onGenerationEvent,
		);
		if ("catalogMiss" in result) {
			await lifecycle.settle({
				kind: "CatalogMiss",
				miss: result.catalogMiss,
			});
			await lifecycle.record({
				kind: "Succeeded",
				phase,
				generationEvents,
			});
			return;
		}
		if ("deduplicated" in result && result.deduplicated) {
			if (result.persisted.status === "Resolved") {
				await lifecycle.settle({
					kind: "Complete",
					readingId: result.persisted.readingId,
					attestationId: result.persisted.occurrence.attestationId,
					grammar: projectResolutionGrammar(
						result.persisted.occurrence.grammatical,
					),
					reading: projectResolutionReading(
						result.persisted.occurrence.reading,
					),
				});
			} else {
				await lifecycle.settle({ kind: "Unresolved" });
			}
		}
		await lifecycle.record({
			kind: "Succeeded",
			phase,
			generationEvents,
		});
	} catch (error) {
		const classified = classifyResolutionFailure(error);
		const diagnosticId = createDiagnosticId();
		try {
			if (classified.kind === "Generation") {
				await lifecycle.record({
					kind: "GenerationFailed",
					phase,
					failure: classified.failure,
					generationEvents,
				});
				return;
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
			await lifecycle.record({
				kind: "InternalFailed",
				phase,
				diagnosticId,
				errorName: classified.errorName,
				errorFingerprint: classified.errorFingerprint,
				generationEvents,
			});
		} catch (recordingError) {
			const recordingFailure = classifyResolutionFailure(recordingError);
			diagnostics.error(
				JSON.stringify({
					event: "ResolutionFailureRecordingFailed",
					...identity,
					phase,
					diagnosticId,
					recordingFailure,
				}),
			);
		}
	}
}
