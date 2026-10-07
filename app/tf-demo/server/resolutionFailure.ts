import type { Infer } from "convex/values";
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
 * A model call a ClickResolution made that failed at its provider or
 * answered unusably. The run records it as a Generation failure; any other
 * error is an Internal one.
 */
export class ModelCallFailure extends Error {
	override readonly name = "ModelCallFailure";
	readonly category: "ProviderUnavailable" | "InvalidOutput";
	constructor(
		category: "ProviderUnavailable" | "InvalidOutput",
		message: string,
	) {
		super(message);
		this.category = category;
	}
}

export function classifyResolutionFailure(
	error: unknown,
): ClassifiedResolutionFailure {
	if (error instanceof ModelCallFailure) {
		return {
			kind: "Generation",
			failure: safeGenerationFailure({
				attempts: 1,
				category: error.category,
				retryable: false,
			}),
		};
	}
	return {
		kind: "Internal",
		failureCode: "Internal",
		...internalErrorDescriptor(error),
	};
}

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

export function internalErrorDescriptor(error: unknown): {
	readonly errorName: string;
	readonly errorFingerprint: string;
} {
	const errorName = safeErrorName(error);
	const message = safeErrorMessageForFingerprint(error);
	return {
		errorName,
		errorFingerprint: `fnv1a-${fnv1a(`${errorName}\u0000${message}`)}`,
	};
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
