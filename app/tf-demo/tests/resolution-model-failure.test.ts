import { expect, test } from "bun:test";
import { InvalidModelOutput, ProviderFailure } from "dumgen";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import type { ClickResolution } from "../server/clickResolution";
import { createTfDemoOrchestrator } from "../server/linguisticOrchestration";
import type { OrchestrationPersistence } from "../server/orchestrationPorts";
import type { ResolvedGrammar } from "../server/resolutionGrammar";
import {
	executeResolutionSession,
	type ResolutionSessionRunRecord,
} from "../server/resolutionSessionExecution";
import { capturedLogs } from "./support/logs";

/*
 * A click whose model calls fail is recorded as a Generation failure, by
 * Dumgen's typed errors crossing the click orchestrator unchanged. A
 * Resolution Session runs the real orchestrator; a fake ClickResolution
 * fails as Dumgen's `resolve.grammar` and `resolve.reading` do.
 */

const identity = { requestId: "request-1", runToken: "run-1" };
const selection = {
	requestId: identity.requestId,
	visitorId: "visitor-1",
	sentenceId: "sentence-1",
	clickedSegmentIndex: 0,
};

const lemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem" },
} as const satisfies Dumling.Lemma<"de">;

const grammar: ResolvedGrammar = {
	decision: "Resolved",
	language: "de",
	encounter: {
		sentence: {
			id: "sentence-1",
			language: "de",
			segments: [{ kind: "ResolvableText", text: "Banken" }],
		},
		target: { family: "Lexeme", kind: "NOUN", memberSegmentIndices: [0] },
	},
	attestation: {
		unitKind: "Attestation",
		members: [{ attested: "Banken", orthography: "Standard" }],
		realizationCoverage: "Full",
		articleEvidence: null,
		valencyEvidence: [],
		surface: {
			unitKind: "Surface",
			language: "de",
			normalizedSurface: "Banken",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			inflectionalFeatures: { case: "Nom", gender: null, number: "Plur" },
			lemma,
		},
	},
};

const persistence: OrchestrationPersistence = {
	async loadResolutionContext() {
		return {
			reusable: null,
			lemmaCandidates: [],
			sentence: {
				sentenceId: "sentence-1",
				scrollId: "scroll-1",
				segmentedSentenceId: "sentence-1",
				language: "de",
				stitchedText: "Banken",
				segments: [
					{ index: 0, kind: "ResolvableText", text: "Banken" },
				],
				units: [
					{
						segments: [0],
						route: {
							language: "de",
							family: "Lexeme",
							kind: "NOUN",
						},
					},
				],
			},
		};
	},
	persistResolvedClick: () => Promise.reject(new Error("no commit")),
	persistReusedResolvedClick: () => Promise.reject(new Error("no commit")),
	persistUnresolvedClick: () => Promise.reject(new Error("no commit")),
};

/** One Resolution Session run of the real orchestrator over `resolution`. */
async function runSession(
	resolution: ClickResolution,
	overrides: Partial<OrchestrationPersistence> = {},
) {
	const records: ResolutionSessionRunRecord[] = [];
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
			resolve: (input, checkpoints, observer, context) =>
				createTfDemoOrchestrator({
					resolution,
					findStoredReadings: async () => [],
					persistence: { ...persistence, ...overrides },
					observer,
				}).resolveSegment(input, checkpoints, context),
			createDiagnosticId: () => "diagnostic-1",
		}).pipe(capturedLogs().capture),
	);
	return records;
}

test("a provider failure in Grammar is recorded as a ProviderUnavailable Generation failure", async () => {
	const records = await runSession({
		grammar: () =>
			Effect.fail(
				new ProviderFailure({
					stage: "route",
					message: "secret provider timeout",
				}),
			),
		reading: () => Effect.die("unreachable"),
	});

	expect(records).toEqual([
		{
			kind: "GenerationFailed",
			phase: "Grammar",
			failure: {
				attempts: 1,
				category: "ProviderUnavailable",
				retryable: true,
			},
			generationEvents: [],
		},
	]);
	expect(JSON.stringify(records)).not.toContain("secret");
});

test("an unusable model answer in Reading is recorded as an InvalidOutput Generation failure", async () => {
	const records = await runSession({
		grammar: () => Effect.succeed(grammar),
		reading: () =>
			Effect.fail(
				new InvalidModelOutput({
					stage: "resolve.reading",
					message: "secret model answer",
				}),
			),
	});

	expect(records).toEqual([
		{
			kind: "GenerationFailed",
			phase: "Reading",
			failure: {
				attempts: 1,
				category: "InvalidOutput",
				retryable: false,
			},
			generationEvents: [],
		},
	]);
	expect(JSON.stringify(records)).not.toContain("secret");
});

test("a persistence hop that rejects is an Internal failure named by what it threw", async () => {
	const records = await runSession(
		{
			grammar: () => Effect.die("unreachable"),
			reading: () => Effect.die("unreachable"),
		},
		{
			loadResolutionContext: () =>
				Promise.reject(new TypeError("secret context")),
		},
	);

	expect(records).toEqual([
		expect.objectContaining({
			kind: "InternalFailed",
			phase: "Grammar",
			diagnosticId: "diagnostic-1",
			errorName: "TypeError",
		}),
	]);
	expect(JSON.stringify(records)).not.toContain("secret");
});
