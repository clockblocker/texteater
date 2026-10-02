import { expect, test } from "bun:test";
import type { GenerationEvent } from "../server/resolutionFailure";
import {
	classifyResolutionFailure,
	ModelCallFailure,
	projectResolutionGenerationEvent,
} from "../server/resolutionFailure";

test("a failed model call becomes a Generation failure without its message", () => {
	const classified = classifyResolutionFailure(
		new ModelCallFailure("InvalidOutput", "secret model answer"),
	);
	expect(classified).toEqual({
		kind: "Generation",
		failure: { attempts: 1, category: "InvalidOutput", retryable: false },
	});
	expect(JSON.stringify(classified)).not.toContain("secret");
});

test("unexpected failures become sanitized correlated Internal failures", () => {
	const first = classifyResolutionFailure(
		new TypeError("secret prompt and provider response"),
	);
	const second = classifyResolutionFailure(
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
