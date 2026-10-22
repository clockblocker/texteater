import type { Infer } from "convex/values";
import type { InvalidModelOutput, ProviderFailure } from "dumgen";
import type { UnknownError } from "effect/Cause";
import type {
	resolutionGenerationEventValidator,
	safeGenerationFailureValidator,
} from "../convex/model/validators";
import { MAX_IDENTIFIER_LENGTH } from "./identifiers";
import type { ResolutionPhase } from "./resolutionLifecycle";

export type GenerationFailure = Infer<typeof safeGenerationFailureValidator>;
/** A generation event as a Resolution Session stores it, tagged with its run. */
export type ResolutionGenerationEvent = Infer<
	typeof resolutionGenerationEventValidator
>;
/** A generation event as the model call reports it, before its run tags it. */
export type GenerationEvent = ResolutionGenerationEvent extends infer Event
	? Event extends unknown
		? Omit<Event, "phase" | "requestId" | "runToken">
		: never
	: never;

export type ClassifiedResolutionFailure =
	| {
			readonly kind: "Generation";
			readonly failure: GenerationFailure;
	  }
	| {
			readonly kind: "Internal";
			readonly failureCode: "Internal";
			readonly errorName: string;
			readonly errorFingerprint: string;
	  };

/**
 * What a click's model calls fail with: Dumgen's whole error channel, which
 * the ClickResolution port and a click's re-segmentation keep typed. The run
 * records either as a Generation failure.
 */
export type ModelFailure = ProviderFailure | InvalidModelOutput;

/**
 * Every error a Resolution run's error channel may carry: a model failure,
 * or a Promise hop (persistence, lifecycle) that rejected. A defect is none
 * of these and is recorded as Internal.
 */
export type ResolutionRunError = ModelFailure | UnknownError;

/**
 * A run's error by its tag: a model failure is a Generation failure, a
 * rejected hop an Internal one. A new error in the run's channel fails to
 * compile here until it is classified.
 */
export function classifyResolutionFailure(
	error: ResolutionRunError,
): ClassifiedResolutionFailure {
	switch (error._tag) {
		case "ProviderFailure":
			// No answer came back: the deadline passed, the transport failed or
			// the provider refused. A later retry may get one.
			return generationFailure("ProviderUnavailable", true);
		case "InvalidModelOutput":
			return generationFailure("InvalidOutput", false);
		case "UnknownError":
			return internalResolutionFailure(error);
	}
}

/** A defect, or a hop that rejected: sanitized and fingerprinted. */
export function internalResolutionFailure(
	error: unknown,
): ClassifiedResolutionFailure {
	return {
		kind: "Internal",
		failureCode: "Internal",
		...internalErrorDescriptor(error),
	};
}

function generationFailure(
	category: ModelFailureCategory,
	retryable: boolean,
): ClassifiedResolutionFailure {
	return {
		kind: "Generation",
		failure: safeGenerationFailure({ attempts: 1, category, retryable }),
	};
}

type ModelFailureCategory = Extract<
	GenerationFailure["category"],
	"ProviderUnavailable" | "InvalidOutput"
>;

export function projectResolutionGenerationEvent(
	event: GenerationEvent,
	context: {
		readonly phase: ResolutionPhase;
		readonly requestId: string;
		readonly runToken: string;
	},
): ResolutionGenerationEvent {
	return Object.freeze({
		requestId: context.requestId,
		runToken: context.runToken,
		phase: context.phase,
		...event,
	});
}

function safeGenerationFailure(failure: GenerationFailure): GenerationFailure {
	return Object.freeze({
		attempts: boundedAttempts(failure.attempts),
		category: failure.category,
		retryable: failure.retryable,
		...(safeStatus(failure.status) === undefined
			? {}
			: { status: safeStatus(failure.status) }),
		...(safeString(failure.providerCode)
			? { providerCode: safeString(failure.providerCode) }
			: {}),
		...(safeString(failure.providerRequestId)
			? { providerRequestId: safeString(failure.providerRequestId) }
			: {}),
		...(safeRetryAfterMs(failure.retryAfterMs) === undefined
			? {}
			: { retryAfterMs: safeRetryAfterMs(failure.retryAfterMs) }),
	}) as GenerationFailure;
}

/**
 * A sanitized name and fingerprint for an error, without its message. An
 * `Effect.tryPromise` rejection is described by what it wraps, so a failed
 * hop keeps the name of what threw.
 */
export function internalErrorDescriptor(thrown: unknown): {
	readonly errorName: string;
	readonly errorFingerprint: string;
} {
	const error = isUnknownError(thrown) ? thrown.cause : thrown;
	const errorName = safeErrorName(error);
	const message = safeErrorMessageForFingerprint(error);
	return {
		errorName,
		errorFingerprint: `fnv1a-${fnv1a(`${errorName}\u0000${message}`)}`,
	};
}

/**
 * Effect's `UnknownError`, told by its tag: this module stays free of
 * Effect at runtime, since isolate-side Convex modules import it.
 */
function isUnknownError(error: unknown): error is UnknownError {
	return (
		error instanceof Error &&
		(error as { readonly _tag?: unknown })._tag === "UnknownError"
	);
}

function safeErrorName(error: unknown): string {
	const candidate = error instanceof Error ? error.name : "NonErrorThrown";
	return /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(candidate)
		? candidate
		: "Error";
}

function safeErrorMessageForFingerprint(error: unknown): string {
	if (!(error instanceof Error)) return typeof error;
	try {
		return error.message.slice(0, 2_000);
	} catch {
		return "unreadable-error-message";
	}
}

function fnv1a(value: string): string {
	let hash = 0x811c9dc5;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * The bounds a stored Generation failure keeps. `safeGenerationFailure` drops
 * (or, for attempts, zeroes) a field outside them, and
 * `assertSafeGenerationFailure` rejects it, so a failure the classifier
 * produced always passes the session's assertion.
 */
const isValidAttempts = (value: number): boolean =>
	Number.isSafeInteger(value) && value >= 0 && value <= 10;
const isValidStatus = (value: number): boolean =>
	Number.isSafeInteger(value) && value >= 100 && value <= 599;
const isValidRetryAfterMs = (value: number): boolean =>
	Number.isSafeInteger(value) && value >= 0;
const isValidMetadata = (value: string): boolean =>
	value.length > 0 && value.length <= MAX_IDENTIFIER_LENGTH;

function boundedAttempts(value: number): number {
	return isValidAttempts(value) ? value : 0;
}

function safeStatus(value: number | undefined): number | undefined {
	return value !== undefined && isValidStatus(value) ? value : undefined;
}

function safeRetryAfterMs(value: number | undefined): number | undefined {
	return value !== undefined && isValidRetryAfterMs(value)
		? value
		: undefined;
}

function safeString(value: string | undefined): string | undefined {
	return value !== undefined && isValidMetadata(value) ? value : undefined;
}

export function assertSafeGenerationFailure(failure: GenerationFailure): void {
	if (!isValidAttempts(failure.attempts)) {
		throw new Error("Generation failure attempts are invalid.");
	}
	if (failure.status !== undefined && !isValidStatus(failure.status)) {
		throw new Error("Generation failure status is invalid.");
	}
	if (
		failure.retryAfterMs !== undefined &&
		!isValidRetryAfterMs(failure.retryAfterMs)
	) {
		throw new Error("Generation failure Retry-After is invalid.");
	}
	for (const value of [failure.providerCode, failure.providerRequestId]) {
		if (value !== undefined && !isValidMetadata(value)) {
			throw new Error("Generation failure metadata is invalid.");
		}
	}
}

export function publicFailureMessage(
	phase: ResolutionPhase,
	category: GenerationFailure["category"],
): string {
	const subject = phase === "Reading" ? "Reading generation" : "Resolution";
	return category === "Network" ||
		category === "RateLimited" ||
		category === "ProviderUnavailable"
		? `${subject} is temporarily unavailable.`
		: `${subject} could not be completed.`;
}

export function safeFailureMessage(message: string): string {
	return message.trim().length > 0 && message.length <= 240
		? message
		: "Resolution could not be completed.";
}
