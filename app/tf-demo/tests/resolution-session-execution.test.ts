import { describe, expect, test } from "bun:test";

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
	test("a guarded cached result crosses one lifecycle seam from route to settlement", async () => {
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

		await executeResolutionSession({
			identity,
			lifecycle,
			resolve: async (input) => {
				expect(input).toEqual(selection);
				return {
					grammatical: grammaticalInput(),
					reading: readingInput(),
					reused: true,
					deduplicated: true,
					persisted: {
						status: "Resolved",
						clickId: "click-1",
						readingId: "reading-1",
						occurrence: {
							attestationId: "attestation-1",
							grammatical: grammaticalInput(),
							reading: readingInput(),
						},
					},
				};
			},
			diagnostics: { info: () => {}, error: () => {} },
		});

		expect(advances).toEqual([{ progress: "RouteAvailable" }]);
		expect(settlements).toEqual([
			expect.objectContaining({
				kind: "Complete",
				readingId: "reading-1",
				attestationId: "attestation-1",
			}),
		]);
		expect(records).toEqual([
			{
				kind: "Succeeded",
				phase: "Grammar",
				generationEvents: [],
			},
		]);
	});

	test("an invalidated guard stops before linguistic work or lifecycle writes", async () => {
		let resolved = false;
		let wrote = false;
		await executeResolutionSession({
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
			resolve: async () => {
				resolved = true;
				throw new Error("must not run");
			},
			diagnostics: { info: () => {}, error: () => {} },
		});

		expect(resolved).toBe(false);
		expect(wrote).toBe(false);
	});

	test("unexpected failures are fingerprinted and recorded without their message", async () => {
		const records: ResolutionSessionRunRecord[] = [];
		const errors: string[] = [];
		await executeResolutionSession({
			identity,
			lifecycle: {
				begin: async () => ({ selection, checkpoints: {} }),
				advance: async () => {},
				settle: async () => {},
				record: async (record) => {
					records.push(record);
				},
			},
			resolve: async () => {
				throw new TypeError("secret checkpoint payload");
			},
			diagnostics: {
				info: () => {},
				error: (message) => errors.push(message),
			},
			createDiagnosticId: () => "diagnostic-1",
		});

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
		expect(errors.join("\n")).not.toContain("secret checkpoint payload");
	});
});

function grammaticalInput(canonicalForm = "Bank") {
	return {
		decision: "Resolved" as const,
		attestation: {
			members: [{ attested: "Banken", orthography: "Standard" as const }],
			realizationCoverage: "Full" as const,
			surface: {
				normalizedSurface: "Banken",
				spelling: "Canonical" as const,
				surfaceKind: "Inflection" as const,
				lemma: { canonicalForm, family: "Lexeme", kind: "NOUN" },
			},
		},
		provider: { raw: "must not leak" },
	};
}

function readingInput(emojiDescription = "🏦", canonicalForm = "Bank") {
	return {
		emojiDescription,
		lemma: { canonicalForm, family: "Lexeme", kind: "NOUN" },
		plan: { raw: "must not leak" },
	};
}
