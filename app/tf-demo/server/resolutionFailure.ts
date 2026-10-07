import type { Infer } from "convex/values";
import type {
	resolutionGenerationEventValidator,
	safeGenerationFailureValidator,
} from "../convex/model/validators";
export type GenerationFailure = Infer<typeof safeGenerationFailureValidator>;
export type GenerationEvent =
	Infer<typeof resolutionGenerationEventValidator> extends infer Event
		? Event extends unknown
			? Omit<Event, "phase" | "requestId" | "runToken">
			: never
		: never;

export type ResolutionRunPhase = "Route" | "Grammar" | "Reading" | "Commit";

export type ResolutionGenerationEvent = GenerationEvent & {
	readonly phase: ResolutionRunPhase;
	readonly requestId: string;
	readonly runToken: string;
};

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
		readonly phase: ResolutionRunPhase;
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

function boundedAttempts(value: number): number {
	return Number.isSafeInteger(value) && value >= 0 && value <= 10 ? value : 0;
}

function safeStatus(value: number | undefined): number | undefined {
	return value !== undefined &&
		Number.isSafeInteger(value) &&
		value >= 100 &&
		value <= 599
		? value
		: undefined;
}

function safeRetryAfterMs(value: number | undefined): number | undefined {
	return value !== undefined && Number.isSafeInteger(value) && value >= 0
		? value
		: undefined;
}

function safeString(value: string | undefined): string | undefined {
	return value && value.length <= 200 ? value : undefined;
}

export function assertSafeGenerationFailure(failure: GenerationFailure): void {
	if (
		!Number.isSafeInteger(failure.attempts) ||
		failure.attempts < 0 ||
		failure.attempts > 10
	) {
		throw new Error("Generation failure attempts are invalid.");
	}
	if (
		failure.status !== undefined &&
		(!Number.isSafeInteger(failure.status) ||
			failure.status < 100 ||
			failure.status > 599)
	) {
		throw new Error("Generation failure status is invalid.");
	}
	if (
		failure.retryAfterMs !== undefined &&
		(!Number.isSafeInteger(failure.retryAfterMs) ||
			failure.retryAfterMs < 0)
	) {
		throw new Error("Generation failure Retry-After is invalid.");
	}
	for (const value of [failure.providerCode, failure.providerRequestId]) {
		if (value !== undefined && (value.length === 0 || value.length > 200)) {
			throw new Error("Generation failure metadata is invalid.");
		}
	}
}

export function publicFailureMessage(
	phase: ResolutionRunPhase,
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
