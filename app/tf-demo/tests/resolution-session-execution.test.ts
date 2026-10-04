import { describe, expect, test } from "bun:test";
import * as Effect from "effect/Effect";

import {
	executeResolutionSession,
	type ResolutionSessionAdvance,
	type ResolutionSessionLifecyclePort,
	type ResolutionSessionRunRecord,
	type ResolutionSessionSettlement,
} from "../server/resolutionSessionExecution";

const identity = { requestId: "request-1", runToken: "run-1" };
const selection = {
	requestId: identity.requestId,
	visitorId: "visitor-1",
	sentenceId: "sentence-1",
	clickedSegmentIndex: 2,
};

describe("Resolution Session execution", () => {
	test("a reused occurrence crosses one lifecycle seam and settles in its own commit", async () => {
		const advances: ResolutionSessionAdvance[] = [];
		const settlements: ResolutionSessionSettlement[] = [];
		const records: ResolutionSessionRunRecord[] = [];
		const lifecycle: ResolutionSessionLifecyclePort = {
			begin: async () => ({ selection, checkpoints: {} }),
			advance: async (event) => {
				advances.push(event);
			},
			settle: async (result) => {
				settlements.push(result);
			},
			record: async (record) => {
				records.push(record);
			},
		};

		await Effect.runPromise(
			executeResolutionSession({
				identity,
				lifecycle,
				resolve: (input) =>
					Effect.tryPromise(async () => {
						expect(input).toEqual(selection);
						return {
							grammatical: grammaticalInput(),
							reading: readingInput(),
							reused: true,
							persisted: {
								status: "Reused",
								clickId: "click-1",
								attestationId: "attestation-1",
								readingId: "reading-1",
								deduplicated: false,
							},
						};
					}),
				diagnostics: { info: () => {}, error: () => {} },
			}),
		);

		expect(advances).toEqual([{ progress: "RouteAvailable" }]);
		expect(settlements).toEqual([]);
		expect(records).toEqual([
			{
				kind: "Succeeded",
				phase: "Grammar",
				generationEvents: [],
			},
		]);
	});

	test("a resolved commit carries the run's success record, so the run records nothing after it", async () => {
		const advances: ResolutionSessionAdvance[] = [];
		const records: ResolutionSessionRunRecord[] = [];
		const progress: unknown[] = [];
		await Effect.runPromise(
			executeResolutionSession({
				identity,
				lifecycle: {
					begin: async () => ({ selection, checkpoints: {} }),
					advance: async (event) => {
						advances.push(event);
					},
					settle: async () => {},
					record: async (record) => {
						records.push(record);
					},
				},
				resolve: (_input, _checkpoints, observer) =>
					Effect.sync(() => {
						observer.generationEvent?.(generationEvent);
						progress.push(
							observer.committing({
								readingAvailable: {
									reading: readingInput() as never,
									readingResolution: {
										decision: "New",
										emojiDescription: "🏦",
									},
								},
							}),
						);
						return {
							grammatical: grammaticalInput(),
							readingResolution: {
								decision: "New",
								emojiDescription: "🏦",
							},
							reading: readingInput(),
							reused: false,
							persisted: {
								status: "Committed",
								clickId: "click-1",
								attestationId: "attestation-1",
								readingId: "reading-1",
								deduplicated: false,
								occurrence: {},
							},
						} as never;
					}),
				diagnostics: { info: () => {}, error: () => {} },
			}),
		);

		expect(advances).toEqual([{ progress: "RouteAvailable" }]);
		expect(records).toEqual([]);
		expect(progress).toEqual([
			{
				readingAvailable: expect.objectContaining({
					readingResolution: {
						decision: "New",
						emojiDescription: "🏦",
					},
				}),
				succeeded: {
					phase: "Commit",
					generationEvents: [
						expect.objectContaining({
							...identity,
							phase: "Grammar",
						}),
					],
				},
			},
		]);
	});

	test("an invalidated guard stops before linguistic work or lifecycle writes", async () => {
		let resolved = false;
		let wrote = false;
		await Effect.runPromise(
			executeResolutionSession({
				identity,
				lifecycle: {
					begin: async () => null,
					advance: async () => {
						wrote = true;
					},
					settle: async () => {
						wrote = true;
					},
					record: async () => {
						wrote = true;
					},
				},
				resolve: () =>
					Effect.tryPromise(async () => {
						resolved = true;
						throw new Error("must not run");
					}),
				diagnostics: { info: () => {}, error: () => {} },
			}),
		);

		expect(resolved).toBe(false);
		expect(wrote).toBe(false);
	});

	test.each(["failure", "defect", "thrown parser error"])(
		"unexpected %s is fingerprinted and recorded without its message",
		async (kind) => {
			const records: ResolutionSessionRunRecord[] = [];
			const errors: string[] = [];
			await Effect.runPromise(
				executeResolutionSession({
					identity,
					lifecycle: {
						begin: async () => ({ selection, checkpoints: {} }),
						advance: async () => {},
						settle: async () => {},
						record: async (record) => {
							records.push(record);
						},
					},
					resolve: () => {
						const error = new TypeError(
							"secret checkpoint payload",
						);
						if (kind === "thrown parser error")
							return Effect.gen(function* () {
								yield* Effect.void;
								throw error;
							});
						return (kind === "failure" ? Effect.fail : Effect.die)(
							error,
						);
					},
					diagnostics: {
						info: () => {},
						error: (message) => errors.push(message),
					},
					createDiagnosticId: () => "diagnostic-1",
				}),
			);

			expect(records).toEqual([
				expect.objectContaining({
					kind: "InternalFailed",
					phase: "Grammar",
					diagnosticId: "diagnostic-1",
					errorName: "TypeError",
					errorFingerprint: expect.stringContaining("fnv1a-"),
				}),
			]);
			expect(errors.join("\n")).toContain("ResolutionRunInternalFailure");
			expect(errors.join("\n")).not.toContain(
				"secret checkpoint payload",
			);
		},
	);
});

function grammaticalInput(canonicalForm = "Bank") {
	return {
		decision: "Resolved" as const,
		attestation: {
			unitKind: "Attestation",
			members: [{ attested: "Banken", orthography: "Standard" as const }],
			realizationCoverage: "Full" as const,
			surface: {
				unitKind: "Surface",
				normalizedSurface: "Banken",
				spelling: { kind: "Canonical" as const },

				lemma: { canonicalForm, family: "Lexeme", kind: "NOUN" },
			},
		},
		provider: { raw: "must not leak" },
	};
}

function readingInput(emojiDescription = "🏦", canonicalForm = "Bank") {
	return {
		unitKind: "Reading",
		emojiDescription,
		lemma: { canonicalForm, family: "Lexeme", kind: "NOUN" },
		plan: { raw: "must not leak" },
	};
}

const generationEvent = {
	kind: "AttemptStarted" as const,
	attempt: 1,
	model: "luna",
};
