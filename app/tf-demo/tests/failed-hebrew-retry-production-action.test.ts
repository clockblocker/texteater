import { afterEach, expect, jest, test } from "bun:test";
import {
	type Answer,
	type JevRequest,
	JevTransport,
	LunaTransport,
} from "dumgen";
import { api, internal } from "../convex/_generated/api";
import { replaceModelTransports } from "../convex/model/deploymentDumgen";
import type { SupportedTargetLanguage } from "../shared/supported-target-language";
import { createTestConvex } from "./support/convex";
import { fakeJev } from "./support/jev";
import { startSession } from "./support/occurrences";
import { fakeTypeSafe, noModelCalls } from "./support/providers";

afterEach(() => jest.useRealTimers());

const picked = (choice: string): Answer => ({
	type: "choice",
	choice,
	confidence: 1,
	probabilities: { [choice]: 1 },
});

async function failedSentence(
	source: string,
	language: SupportedTargetLanguage,
) {
	jest.useFakeTimers();
	const t = createTestConvex();
	const requestId = `failed-${language}-production-retry`;
	const { sentenceIds } = await t.mutation(
		internal.persistence.persistSubmittedScroll,
		{
			submissionKey: requestId,
			targetLanguage: language,
			sourceText: source,
			sentences: [
				{
					segmentedSentenceId: `${requestId}:0`,
					position: 0,
					paragraph: 0,
					language,
					stitchedText: source,
					segments: [{ kind: "ResolvableText", text: source }],
					units: [],
					segmentationFailed: true,
				},
			],
		},
	);
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw new Error("Expected the failed Sentence.");
	const selection = {
		requestId,
		visitorId: "he-retry-visitor",
		sentenceId,
		clickedSegmentIndex: 0,
	};
	const guard = await startSession(t, selection);
	const snapshot = () =>
		t.run(async (ctx) => ({
			sentence: await ctx.db.get(sentenceId),
			// Session lifecycle updates resolutionState even when source is unchanged.
			segments: (
				await ctx.db
					.query("segments")
					.withIndex("by_sentence_id_and_index", (q) =>
						q.eq("sentenceId", sentenceId),
					)
					.collect()
			).map(({ resolutionState: _state, ...source }) => source),
		}));
	return { t, sentenceId, selection, guard, snapshot };
}

/** Runs the registered action and real Hebrew segmenter, not a replacement retry port. */
test("the production action retries a failed Hebrew Sentence in Hebrew and reuses its saved units on the next click", async () => {
	const source = "והספר";
	const { t, sentenceId, selection, guard, snapshot } = await failedSentence(
		source,
		"he",
	);
	const before = (await snapshot()).segments;
	jest.useRealTimers();
	const requests: (JevRequest & { stage: string })[] = [];
	const lunaRequests: string[] = [];
	const restore = replaceModelTransports({
		jev: () =>
			JevTransport.fromAsk(async (request, { stage }) => {
				requests.push({ ...request, stage });
				const answers = Object.fromEntries(
					Object.keys(request.questions).map((id) => {
						const choice =
							stage === "segments"
								? "Prefixes2"
								: stage === "units"
									? id === "membership_1"
										? "Join"
										: "Separate"
									: "Unresolved";
						return [id, picked(choice)];
					}),
				);
				return {
					model: request.model,
					answers,
					usage: { input_tokens: 1, output_tokens: 1 },
				};
			}),
		luna: () =>
			LunaTransport.fromAsk(async (_request, { stage }) => {
				lunaRequests.push(stage);
				throw new Error("An Unresolved unit must not ask Luna.");
			}),
	});
	try {
		await t.action(internal.orchestration.runResolutionSession, guard);
	} finally {
		restore();
	}
	const sentence = await t.run((ctx) => ctx.db.get(sentenceId));
	expect(sentence?.segmentationFailed).toBeUndefined();
	expect(sentence?.language).toBe("he");
	expect(sentence?.stitchedText).toBe(source);
	expect(sentence?.units).toEqual([
		{ segments: [0], route: "Unresolved" },
		{ segments: [1, 2], route: "Unresolved" },
	]);
	const after = await t.run((ctx) =>
		ctx.db
			.query("segments")
			.withIndex("by_sentence_id_and_index", (q) =>
				q.eq("sentenceId", sentenceId),
			)
			.collect(),
	);
	expect(after.map(({ text }) => text)).toEqual(["ו", "ה", "ספר"]);
	expect(after.map(({ text }) => text).join("")).toBe(source);
	expect(after[0]?._id).toBe(before[0]?._id);
	expect(requests.map(({ stage }) => stage)).toEqual([
		"segments",
		"units",
		"route",
	]);
	expect(requests.every(({ state }) => state.sentence === source)).toBe(true);
	expect(String(requests[2]?.questions.route_0?.instructions)).toContain(
		"Hebrew sentence",
	);
	expect(lunaRequests).toEqual([]);
	const note = await t.query(api.resolutionSessions.getResolutionNote, {
		requestId: selection.requestId,
	});
	expect(note?.lifecycle).toMatchObject({
		state: "Terminal",
		outcome: "Unresolved",
	});
	expect(note?.unit).toEqual({ segments: [0], route: "Unresolved" });
	expect(note?.source.memberSegmentIndices).toEqual([0]);

	// A new click reloads the stored recovery and does not segment again.
	jest.useFakeTimers();
	const next = {
		...selection,
		requestId: "saved-hebrew-production-retry",
		clickedSegmentIndex: 2,
	};
	const nextGuard = await startSession(t, next);
	jest.useRealTimers();
	const models = noModelCalls();
	try {
		await t.action(internal.orchestration.runResolutionSession, nextGuard);
	} finally {
		models.restore();
	}
	expect(models.requests).toEqual([]);
	const saved = await t.query(api.resolutionSessions.getResolutionNote, {
		requestId: next.requestId,
	});
	expect(saved?.lifecycle).toMatchObject({
		state: "Terminal",
		outcome: "Unresolved",
	});
	expect(saved?.unit).toEqual({ segments: [1, 2], route: "Unresolved" });
	expect(saved?.source.memberSegmentIndices).toEqual([1, 2]);
	expect(await t.run((ctx) => ctx.db.get(sentenceId))).toEqual(sentence);
});

for (const stage of ["segments", "route"] as const) {
	test(`a failed Hebrew production retry at ${stage} preserves the Sentence and source rows`, async () => {
		const { t, selection, guard, snapshot } = await failedSentence(
			"שלום",
			"he",
		);
		const before = await snapshot();
		jest.useRealTimers();
		const requests: string[] = [];
		const restore = replaceModelTransports({
			jev: () =>
				JevTransport.fromAsk(async (request, context) => {
					requests.push(context.stage);
					if (context.stage === stage)
						throw new Error("Offline retry failure.");
					return {
						model: request.model,
						answers: Object.fromEntries(
							Object.keys(request.questions).map((id) => [
								id,
								picked("AsWritten"),
							]),
						),
						usage: { input_tokens: 1, output_tokens: 1 },
					};
				}),
		});
		try {
			await t.action(internal.orchestration.runResolutionSession, guard);
		} finally {
			restore();
		}
		expect(requests).toEqual(
			stage === "segments" ? ["segments"] : ["segments", "route"],
		);
		expect(await snapshot()).toEqual(before);
		const note = await t.query(api.resolutionSessions.getResolutionNote, {
			requestId: selection.requestId,
		});
		expect(note?.lifecycle).toMatchObject({
			state: "Terminal",
			outcome: "PermanentFailure",
		});
	});
}

test("a production Hebrew retry saves its Hebrew noun route before a later grammar failure", async () => {
	const { t, selection, guard, snapshot } = await failedSentence(
		"שלום",
		"he",
	);
	const before = await snapshot();
	jest.useRealTimers();
	const requests: string[] = [];
	const restore = replaceModelTransports({
		jev: () =>
			JevTransport.fromAsk(async (request, { stage }) => {
				requests.push(stage);
				return {
					model: request.model,
					answers: Object.fromEntries(
						Object.keys(request.questions).map((id) => [
							id,
							picked(
								stage === "segments"
									? "AsWritten"
									: "Lexeme_NOUN",
							),
						]),
					),
					usage: { input_tokens: 1, output_tokens: 1 },
				};
			}),
		luna: () =>
			LunaTransport.fromAsk(async (_request, { stage }) => {
				requests.push(stage);
				throw new Error(
					"Controlled stop after successful resegmentation.",
				);
			}),
	});
	try {
		await t.action(internal.orchestration.runResolutionSession, guard);
	} finally {
		restore();
	}
	const after = await snapshot();
	expect(after.sentence?.language).toBe("he");
	expect(after.sentence?.stitchedText).toBe("שלום");
	expect(after.sentence?.segmentationFailed).toBeUndefined();
	expect(after.sentence?.units).toEqual([
		{
			segments: [0],
			route: { language: "he", family: "Lexeme", kind: "NOUN" },
		},
	]);
	expect(after.segments).toEqual(before.segments);
	expect(requests).toEqual(["segments", "route", "hebrewCanonical"]);
	const note = await t.query(api.resolutionSessions.getResolutionNote, {
		requestId: selection.requestId,
	});
	expect(note?.lifecycle).toMatchObject({
		state: "Terminal",
		outcome: "PermanentFailure",
	});
});

test("the production German failed-Sentence retry still stores a German noun route", async () => {
	const { t, selection, guard, snapshot } = await failedSentence(
		"Banken",
		"de",
	);
	const before = await snapshot();
	jest.useRealTimers();
	// The normal German resolver may leave the recovered noun Unresolved.
	const models = fakeTypeSafe(
		fakeJev({
			answers: {
				r_1: picked("Lexeme/NOUN"),
			},
		}),
	);
	try {
		await t.action(internal.orchestration.runResolutionSession, guard);
	} finally {
		models.restore();
	}
	const after = await snapshot();
	expect(after.sentence?.language).toBe("de");
	expect(after.sentence?.stitchedText).toBe("Banken");
	expect(after.sentence?.segmentationFailed).toBeUndefined();
	expect(after.sentence?.units).toEqual([
		{
			segments: [0],
			route: { language: "de", family: "Lexeme", kind: "NOUN" },
		},
	]);
	expect(after.segments).toEqual(before.segments);
	expect(models.requests.length).toBeGreaterThan(0);
	const note = await t.query(api.resolutionSessions.getResolutionNote, {
		requestId: selection.requestId,
	});
	expect(note?.lifecycle).toMatchObject({
		state: "Terminal",
		outcome: "Unresolved",
	});
});
