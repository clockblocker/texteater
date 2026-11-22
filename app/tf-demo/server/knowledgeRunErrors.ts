import * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import type {
	RelationPublicationFingerprints,
	requestedRelationKinds,
} from "../convex/model/generatedKnowledgeContainment";
import type { KnowledgeProduction } from "./knowledgeProduction";

/** Knowledge production is disabled or missing deployment keys. */
export class KnowledgeProductionUnavailableError extends Schema.TaggedError<
	KnowledgeProductionUnavailableError,
	{ readonly brand: unique symbol }
>()("KnowledgeProductionUnavailableError", {
	reason: Schema.Literals(["ProductionFlagOff", "MissingModelKeys"]),
}) {
	override get message(): string {
		return this.reason === "ProductionFlagOff"
			? "Knowledge production is off on this deployment (TF_KNOWLEDGE_PRODUCTION)."
			: "Knowledge production needs TYPESAFE_API_KEY and OPENAI_API_KEY.";
	}
}

/** A claimed Reading in a language Knowledge production does not cover. */
export class UnsupportedKnowledgeLanguage extends Schema.TaggedError<
	UnsupportedKnowledgeLanguage,
	{ readonly brand: unique symbol }
>()("UnsupportedKnowledgeLanguage", {
	language: Schema.String,
}) {
	override get message(): string {
		return "Unsupported Knowledge language.";
	}
}

/** A publication `knowledgeGeneration.publish` answered Rejected. */
export class KnowledgePublicationRejected extends Schema.TaggedError<
	KnowledgePublicationRejected,
	{ readonly brand: unique symbol }
>()("KnowledgePublicationRejected", {
	attemptKey: Schema.String,
	final: Schema.Boolean,
	cause: Schema.optional(Schema.Defect()),
}) {
	override get message(): string {
		return this.final
			? "Final Knowledge publication was rejected."
			: "Incremental Knowledge publication was rejected.";
	}
}

/** A Knowledge stage failed due to a Convex hop rejection or unexpected defect. */
export class KnowledgeStageError extends Schema.TaggedError<
	KnowledgeStageError,
	{ readonly brand: unique symbol }
>()("KnowledgeStageError", {
	phase: Schema.Literals(["Claim", "Request", "Produce", "Publish"]),
	attemptKey: Schema.String,
	cause: Schema.Defect(),
}) {
	override get message(): string {
		return `Knowledge generation failed during '${this.phase}'.`;
	}
}

/** Serialized union of structured errors a Knowledge run's failure path records. */
export const KnowledgeRunError = Schema.Union([
	KnowledgeProductionUnavailableError,
	UnsupportedKnowledgeLanguage,
	KnowledgePublicationRejected,
	KnowledgeStageError,
]);
export type KnowledgeRunError = typeof KnowledgeRunError.Type;
const isKnowledgeRunError = Schema.is(KnowledgeRunError);

/** A relation run whose model output never reached a publication. */
type RejectedRelationRun = {
	readonly runNumber: number;
	readonly requestedKinds: ReturnType<typeof requestedRelationKinds>;
	readonly artifactPath: string | null;
	readonly fingerprints: RelationPublicationFingerprints;
};

/**
 * What a run's failure path records, handed from stage to stage: the run
 * `begin` claimed (only it may end the attempt), the request, the relation
 * run a failure before publication rejects, whether generation completed,
 * the aspect failures it returned, and the operation traces.
 */
export type KnowledgeRunRecord = {
	readonly phase: "Claim" | "Request" | "Produce" | "Publish";
	readonly runNumber: number | null;
	readonly request: unknown;
	readonly rejectedRelationRun?: RejectedRelationRun;
	readonly generationCompleted: boolean;
	readonly failures: KnowledgeProduction["failures"];
	readonly operationTraces: readonly string[];
};

/** A stage's error or defect, with the record its failure path stores. */
export class KnowledgeRunFailure extends Data.TaggedError(
	"KnowledgeRunFailure",
)<{
	readonly record: KnowledgeRunRecord;
	readonly error: KnowledgeRunError;
}> {}

function toKnowledgeRunError(
	attemptKey: string,
	phase: KnowledgeRunRecord["phase"],
	cause: Cause.Cause<unknown>,
): KnowledgeRunError {
	const typed = Cause.findErrorOption(cause);
	if (Option.isSome(typed) && isKnowledgeRunError(typed.value))
		return typed.value;
	const squashed = Cause.squash(cause);
	if (isKnowledgeRunError(squashed)) return squashed;
	const underlying = Cause.isUnknownError(squashed)
		? squashed.cause
		: squashed;
	return new KnowledgeStageError({ phase, attemptKey, cause: underlying });
}

/**
 * Tags a stage's error or defect with the record its failure path stores.
 * An interrupt-only cause propagates untagged: an interrupted run records
 * nothing, and the stale-run watchdog ends it as interrupted.
 */
export function failsWith(attemptKey: string, record: KnowledgeRunRecord) {
	return <A, E, R>(
		stage: Effect.Effect<A, E, R>,
	): Effect.Effect<A, KnowledgeRunFailure, R> =>
		stage.pipe(
			Effect.catchCause((cause) =>
				Cause.hasInterruptsOnly(cause)
					? Effect.interrupt
					: Effect.fail(
							new KnowledgeRunFailure({
								record,
								error: toKnowledgeRunError(
									attemptKey,
									record.phase,
									cause,
								),
							}),
						),
			),
		);
}
