import { afterEach, expect, jest, test } from "bun:test";
import { ProviderFailure } from "dumgen";
import * as Effect from "effect/Effect";
import { api, internal } from "../convex/_generated/api";
import {
	createTfDemoOrchestrator,
	type OrchestrationPersistence,
} from "../server/linguisticOrchestration";
import {
	context,
	fakeResolution,
	providerFailure,
	selection,
	unit,
} from "./support/click-orchestration";
import { createTestConvex, submitText } from "./support/convex";
import { startSession } from "./support/occurrences";

/*
 * The click orchestrator where intake left the click nothing to resolve: a
 * Resolution Session on a unit left Unresolved, and a Sentence that failed to
 * segment, segmented again on click.
 */

afterEach(() => {
	jest.useRealTimers();
});

test("a Resolution Session run on a unit intake left Unresolved ends Unresolved with no model call, and its Note shows the clicked unit", async () => {
	jest.useFakeTimers();
	const t = createTestConvex();
	const verb = { language: "de", family: "Lexeme", kind: "VERB" } as const;
	const particleVerb = {
		language: "de",
		family: "Locution",
		kind: "VERB",
	} as const;
	const { sentenceIds } = await submitText(
		t,
		[["Er", " ", "gibt", " ", "auf", "."]],
		{
			units: [
				[
					{ segments: [0], route: "Unresolved" },
					{
						segments: [2, 4],
						route: verb,
						variants: [verb, particleVerb],
					},
				],
			],
		},
	);
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw new Error("Expected a stored Sentence.");
	const guard = await startSession(t, {
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId,
		clickedSegmentIndex: 0,
	});
	// The click's context carries the Sentence's units to the port.
	const loaded = await t.query(internal.resolutionContext.load, {
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId,
		clickedSegmentIndex: 4,
	});
	expect(loaded.sentence?.units?.[1]).toEqual({
		segments: [2, 4],
		route: verb,
		variants: [verb, particleVerb],
	});
	jest.useRealTimers();

	const fetches: string[] = [];
	const previousFetch = globalThis.fetch;
	globalThis.fetch = Object.assign(
		async (url: string | URL | Request) => {
			fetches.push(String(url));
			throw new Error("No model call is expected.");
		},
		{ preconnect: previousFetch.preconnect },
	);
	try {
		await t.action(internal.orchestration.runResolutionSession, guard);
	} finally {
		globalThis.fetch = previousFetch;
	}
	expect(fetches).toEqual([]);
	const note = await t.query(api.resolutionSessions.getResolutionNote, {
		requestId: "request-1",
	});
	expect(note?.lifecycle).toMatchObject({
		state: "Terminal",
		outcome: "Unresolved",
	});
	expect(note?.unit).toEqual({ segments: [0], route: "Unresolved" });
	expect(note?.source.memberSegmentIndices).toEqual([0]);
	expect(await t.run((ctx) => ctx.db.query("readings").collect())).toEqual(
		[],
	);
});

/** A click on a Sentence intake failed to segment: `Banken`, stored with no units. */
function failedSentenceRun(
	resegment: Parameters<typeof createTfDemoOrchestrator>[0]["resegment"],
) {
	const fake = fakeResolution();
	const stored: Parameters<
		NonNullable<OrchestrationPersistence["storeResegmentedSentence"]>
	>[0][] = [];
	let failed = true;
	const persistence: OrchestrationPersistence = {
		async loadResolutionContext() {
			const loaded = context();
			if (!failed || !loaded.sentence) return loaded;
			return {
				...loaded,
				sentence: {
					...loaded.sentence,
					units: [],
					segmentationFailed: true,
				},
			};
		},
		async storeResegmentedSentence(input) {
			stored.push(input);
			failed = false;
			return { clickedSegmentIndex: input.clickedSegmentIndex };
		},
		async persistResolvedClick() {
			throw new Error("No commit is expected.");
		},
		async persistReusedResolvedClick() {
			throw new Error("No reuse is expected.");
		},
		async persistUnresolvedClick() {
			throw new Error("No unresolved commit is expected.");
		},
	};
	const orchestrator = createTfDemoOrchestrator({
		resolution: {
			...fake.resolution,
			reading: () => Effect.fail(providerFailure("stop after grammar")),
		},
		findStoredReadings: () => Effect.succeed([]),
		persistence,
		...(resegment ? { resegment } : {}),
	});
	return { orchestrator, fake, stored };
}

test("a click on a Sentence intake failed to segment segments it again, stores its units, then resolves the unit", async () => {
	const resegmented: string[] = [];
	const run = failedSentenceRun((stitchedText) => {
		resegmented.push(stitchedText);
		return Effect.succeed({
			segments: [{ kind: "ResolvableText" as const, text: "Banken" }],
			units: [unit],
		});
	});
	const failure = await Effect.runPromise(
		Effect.flip(run.orchestrator.resolveSegment(selection)),
	);
	expect(failure).toBeInstanceOf(ProviderFailure);
	expect(resegmented).toEqual(["Banken"]);
	expect(run.stored).toEqual([
		{
			...selection,
			segments: [{ kind: "ResolvableText", text: "Banken" }],
			units: [unit],
		},
	]);
	// Grammar ran on the new unit.
	expect(run.fake.grammarInputs[0]?.unit).toEqual(unit);
});

test("a re-segmentation that fails again fails the click and stores nothing", async () => {
	const run = failedSentenceRun(() =>
		Effect.fail(providerFailure("jev is down")),
	);
	const failure = await Effect.runPromise(
		Effect.flip(run.orchestrator.resolveSegment(selection)),
	);
	expect(failure).toMatchObject({ message: "jev is down" });
	expect(run.stored).toEqual([]);
	expect(run.fake.grammarInputs).toEqual([]);
});
