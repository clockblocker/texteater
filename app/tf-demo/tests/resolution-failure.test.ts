import { expect, test } from "bun:test";
import { InvalidModelOutput, ProviderFailure } from "dumgen";
import * as Cause from "effect/Cause";
import type { GenerationEvent } from "../server/resolutionFailure";
import {
	classifyResolutionFailure,
	internalResolutionFailure,
	projectResolutionGenerationEvent,
} from "../server/resolutionFailure";

test("Dumgen's model failures become Generation failures without their message", () => {
	const unavailable = classifyResolutionFailure(
		new ProviderFailure({ stage: "route", message: "secret timeout" }),
	);
	const invalid = classifyResolutionFailure(
		new InvalidModelOutput({
			stage: "route",
			message: "secret model answer",
		}),
	);
	expect(unavailable).toEqual({
		kind: "Generation",
		failure: {
			attempts: 1,
			category: "ProviderUnavailable",
			retryable: true,
		},
	});
	expect(invalid).toEqual({
		kind: "Generation",
		failure: { attempts: 1, category: "InvalidOutput", retryable: false },
	});
	expect(JSON.stringify([unavailable, invalid])).not.toContain("secret");
});

test("unexpected failures become sanitized correlated Internal failures", () => {
	const first = internalResolutionFailure(
		new TypeError("secret prompt and provider response"),
	);
	const second = internalResolutionFailure(
		new TypeError("secret prompt and provider response"),
	);

	expect(first).toMatchObject({
		kind: "Internal",
		errorName: "TypeError",
		failureCode: "Internal",
	});
	expect(first).toEqual(second);
	expect(JSON.stringify(first)).not.toContain("secret prompt");
	expect(JSON.stringify(first)).not.toContain("provider response");
});

test("a rejected hop is described by what it wraps", () => {
	const thrown = new TypeError("secret prompt and provider response");
	expect(classifyResolutionFailure(new Cause.UnknownError(thrown))).toEqual(
		internalResolutionFailure(thrown),
	);
});

test("provider attempt events gain Resolution Run correlation", () => {
	const event: GenerationEvent = {
		kind: "AttemptFailed",
		failure: {
			attempts: 2,
			category: "ProviderUnavailable",
			providerRequestId: "provider-request-2",
			retryable: true,
			status: 500,
		},
	};

	expect(
		projectResolutionGenerationEvent(event, {
			phase: "Reading",
			...{
				requestId: "request-1",
				runToken: "run-2",
				segmentId: "segment-1",
			},
		}),
	).toEqual({
		kind: "AttemptFailed",
		phase: "Reading",
		requestId: "request-1",
		runToken: "run-2",
		failure: event.failure,
	});
});
