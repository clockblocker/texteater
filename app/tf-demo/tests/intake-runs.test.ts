import { expect, spyOn, test } from "bun:test";
import { v } from "convex/values";
import { createDumgen, DumgenFailure } from "dumgen";
import type { Dumgen, DumgenOptions } from "dumgen/types";
import * as Effect from "effect/Effect";
import type { Questions, SystemOneResult } from "promptsmith/typesafe";
import { api } from "../convex/_generated/api";
import { internalMutation } from "../convex/_generated/server";
import { intakeRunValidator } from "../convex/model/intakeRuns";
import {
	attemptOutcomeOf,
	createIntakeRunRecorder,
	type IntakeRun,
} from "../server/intakeRun";
import {
	createTfDemoOrchestrator,
	type SubmittedSentence,
} from "../server/linguisticOrchestration";
import { splitInSentences } from "../server/sentenceSplitting";
import {
	createTestConvex,
	createTestConvexWith,
	type TestConvexDb,
} from "./support/convex";
import { fakeProviders, unavailableProviders } from "./support/providers";

const sleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Certain answers to a Choice batch. */
function choiceAnswers(
	questions: Questions,
	select: (id: string) => string,
): SystemOneResult<Questions> {
	return {
		model: "fixture",
		usage: { input_tokens: 1, output_tokens: 1 },
		answers: Object.fromEntries(
			Object.entries(questions).map(([id, question]) => {
				if (question.type !== "choice") throw Error("Expected Choice");
				const choice = select(id);
				return [
					id,
					{
						type: "choice",
						choice,
						confidence: 1,
						probabilities: Object.fromEntries(
							Object.keys(question.criteria).map((key) => [
								key,
								key === choice ? 1 : 0,
							]),
						),
					},
				];
			}),
		),
	} as SystemOneResult<Questions>;
}

type IntakePlan = Record<
	string,
	{ language?: string; fails?: boolean; blocks?: boolean }
>;

/** Intake judgments by source text: answered, failed after 10 ms, or held until aborted. */
function intakeJudge(plan: IntakePlan): DumgenOptions["judge"] {
	return async (request, options) => {
		const { sourceText } = request.state as { sourceText: string };
		const item = plan[sourceText] ?? {};
		if (item.fails) {
			await sleep(10);
			throw Error("offline");
		}
		if (item.blocks)
			return new Promise((_resolve, reject) =>
				options?.signal?.addEventListener(
					"abort",
					() => reject(Error("Canceled")),
					{ once: true },
				),
			);
		return choiceAnswers(request.questions, (id) =>
			id === "language"
				? (item.language ?? "de")
				: id === "validity"
					? "Accepted"
					: "Unchanged",
		);
	};
}

const analysed = (sentenceId: string) =>
	// The stored Segments stay unsplit when the analysis names another text.
	Effect.succeed({ sentenceId, stitchedText: "" } as never);

/**
 * submitText through a real Dumgen and the orchestrator, summarised the way
 * the submitText action does. `interruptOnce` interrupts the submission.
 */
async function submit(input: {
	readonly sourceText: string;
	readonly judge: DumgenOptions["judge"];
	readonly analyzeSentence?: Dumgen["analyzeSentence"];
	readonly requestBudget?: number;
	readonly analysisConcurrency?: number;
	readonly interruptOnce?: Promise<void>;
}) {
	const intake = createIntakeRunRecorder(
		splitInSentences(input.sourceText).length,
	);
	const dumgen = createDumgen({
		judge: input.judge,
		execute: async () => {
			throw Error("Unexpected stitching");
		},
		...(input.requestBudget ? { requestBudget: input.requestBudget } : {}),
		onOperation: intake.operation,
	});
	const submitted: SubmittedSentence[][] = [];
	const orchestrator = createTfDemoOrchestrator({
		dumgen: {
			...dumgen,
			analyzeSentence:
				input.analyzeSentence ??
				(() =>
					Effect.fail(
						new DumgenFailure(
							"NotImplemented",
							"analyzeSentence",
							"No analysis fixture",
						),
					)),
		},
		dictionary: {
			findStoredReadings: () => {
				throw Error("Intake reads no Readings");
			},
		},
		persistence: {
			async persistSubmittedText(value: {
				readonly sentences: readonly SubmittedSentence[];
			}) {
				submitted.push([...value.sentences]);
				return { textId: "text-1" };
			},
		} as never,
		intake,
		...(input.analysisConcurrency
			? { analysisConcurrency: input.analysisConcurrency }
			: {}),
	});
	const controller = new AbortController();
	void input.interruptOnce?.then(() => controller.abort());
	let attempt: Pick<IntakeRun, "outcome" | "failureTag" | "textId">;
	try {
		const result = await Effect.runPromise(
			orchestrator.submitText({
				submissionKey: "key",
				sourceText: input.sourceText,
			}),
			{ signal: controller.signal },
		);
		attempt = {
			outcome: "Accepted",
			textId: result.persisted.textId as IntakeRun["textId"],
		};
	} catch (error) {
		attempt = attemptOutcomeOf(error);
	}
	return {
		run: intake.summary({
			runId: "run",
			submissionKey: "key",
			...attempt,
			durationMs: 1,
			createdAt: 1,
		}),
		submitted,
	};
}

test("an accepted submission summarises each sentence's segmentation and analysis and the calls", async () => {
	const { run } = await submit({
		sourceText: "Hallo. The house.",
		judge: intakeJudge({ "The house.": { language: "en" } }),
		analyzeSentence: ({ sentence }) => analysed(sentence.id),
	});
	expect(run).toMatchObject({
		outcome: "Accepted",
		textId: "text-1",
		sentenceCount: 2,
		sentences: [
			{ segmentation: "Accepted", language: "de", analysis: "Analysed" },
			{
				segmentation: "Accepted",
				language: "en",
				analysis: "NotApplicable",
			},
		],
		stages: {
			segment: { calls: 2, failed: 0, interrupted: 0 },
			analyzeSentence: { calls: 0 },
		},
	});
	expect(run.stages.segment.totalDurationMs).toBeGreaterThanOrEqual(
		run.stages.segment.maxDurationMs,
	);
});

test("a ProviderFailure segmenting one sentence keeps finished outcomes, interrupts running ones and leaves queued ones NotStarted", async () => {
	let analyses = 0;
	const { run, submitted } = await submit({
		sourceText:
			"Hallo. The house. Kaputt. Läuft noch. Wartet. Wartet auch.",
		judge: intakeJudge({
			"The house.": { language: "en" },
			"Kaputt.": { fails: true },
			"Läuft noch.": { blocks: true },
			"Wartet.": { blocks: true },
			"Wartet auch.": { blocks: true },
		}),
		analyzeSentence: ({ sentence }) => {
			analyses++;
			return analysed(sentence.id);
		},
		requestBudget: 3,
	});
	expect(run).toMatchObject({
		outcome: "Failed",
		failureTag: "ProviderFailure",
		sentences: [
			{
				segmentation: "Accepted",
				language: "de",
				analysis: "NotStarted",
			},
			{
				segmentation: "Accepted",
				language: "en",
				analysis: "NotApplicable",
			},
			{
				segmentation: "Failed",
				segmentationTag: "ProviderFailure",
				analysis: "NotApplicable",
			},
			{ segmentation: "Interrupted", analysis: "NotApplicable" },
			{ segmentation: "Interrupted", analysis: "NotApplicable" },
			{ segmentation: "NotStarted", analysis: "NotApplicable" },
		],
		stages: { segment: { calls: 5, failed: 1, interrupted: 2 } },
	});
	expect(run.textId).toBeUndefined();
	expect(run.stages.segment.queueWaitMs).toBeGreaterThan(0);
	expect(analyses).toBe(0);
	expect(submitted).toHaveLength(0);
});

test("interrupting a submission during analysis keeps finished analyses and marks running and queued ones", async () => {
	const second = Promise.withResolvers<void>();
	let calls = 0;
	const { run, submitted } = await submit({
		sourceText: "Eins ist gut. Zwei ist gut. Drei ist gut.",
		judge: intakeJudge({}),
		analyzeSentence: ({ sentence }) =>
			++calls === 1
				? analysed(sentence.id)
				: Effect.zipRight(
						Effect.sync(() => second.resolve()),
						Effect.never,
					),
		analysisConcurrency: 1,
		interruptOnce: second.promise,
	});
	expect(run).toMatchObject({
		outcome: "Interrupted",
		sentences: [
			{ segmentation: "Accepted", analysis: "Analysed" },
			{ segmentation: "Accepted", analysis: "Interrupted" },
			{ segmentation: "Accepted", analysis: "NotStarted" },
		],
	});
	expect(run.textId).toBeUndefined();
	expect(submitted).toHaveLength(0);
});

test("a failed and a defective analysis both store their sentence and say Failed with the tag or Defect", async () => {
	const warn = spyOn(console, "warn").mockImplementation(() => {});
	const error = spyOn(console, "error").mockImplementation(() => {});
	try {
		const { run, submitted } = await submit({
			sourceText: "Eins ist gut. Zwei ist gut.",
			judge: intakeJudge({}),
			analyzeSentence: ({ sentence }) =>
				sentence.segments[0]?.text === "Eins"
					? Effect.fail(
							new DumgenFailure(
								"ProviderFailure",
								"analyzeSentence",
								"offline",
							),
						)
					: Effect.die(new TypeError("analysis bug")),
		});
		expect(submitted[0]).toHaveLength(2);
		expect(run).toMatchObject({
			outcome: "Accepted",
			sentences: [
				{ analysis: "Failed", analysisTag: "ProviderFailure" },
				{ analysis: "Failed", analysisTag: "Defect" },
			],
		});
	} finally {
		warn.mockRestore();
		error.mockRestore();
	}
});

// ------------------------------------------------ the submitText action

/** Intake accepts both sentences; every other judgment, such as analysis, is unavailable. */
const bankTexts = (): Pick<DumgenOptions, "execute" | "judge"> => {
	const intake = intakeJudge({ "The banks.": { language: "en" } });
	return {
		judge: async (request, options) => {
			if (!Object.hasOwn(request.questions, "language"))
				throw Error("unavailable");
			return intake(request, options);
		},
		execute: async () => {
			throw Error("Unexpected stitching");
		},
	};
};

async function submitBankTexts(t: TestConvexDb, submissionKey: string) {
	const providers = fakeProviders(bankTexts());
	const warn = spyOn(console, "warn").mockImplementation(() => {});
	try {
		return await t.action(api.orchestration.submitText, {
			visitorId: "visitor-1",
			submissionKey,
			sourceText: "Die Banken. The banks.",
		});
	} finally {
		providers.restore();
		warn.mockRestore();
	}
}

const intakeRuns = (t: TestConvexDb) =>
	t.run((ctx) => ctx.db.query("intakeRuns").collect());

test("submitText records one summary row per attempt, with no text, prompt or model output", async () => {
	const t = createTestConvex();
	const first = await submitBankTexts(t, "banks");
	const [row] = await intakeRuns(t);
	expect(first).toMatchObject({ status: "Accepted" });
	expect(row).toMatchObject({
		submissionKey: "banks",
		textId: first.status === "Accepted" ? first.textId : "missing",
		outcome: "Accepted",
		sentenceCount: 2,
		sentences: [
			{
				segmentation: "Accepted",
				language: "de",
				// The fake providers answer no analysis question.
				analysis: "Failed",
				analysisTag: "ProviderFailure",
			},
			{
				segmentation: "Accepted",
				language: "en",
				analysis: "NotApplicable",
			},
		],
		stages: {
			segment: { calls: 2, failed: 0, interrupted: 0 },
			analyzeSentence: { failed: 1 },
		},
	});
	expect(Object.keys(row ?? {}).sort()).toEqual([
		"_creationTime",
		"_id",
		"createdAt",
		"durationMs",
		"outcome",
		"runId",
		"sentenceCount",
		"sentences",
		"stages",
		"submissionKey",
		"textId",
	]);
	const stored = JSON.stringify(row);
	for (const text of ["Banken", "banks.", "Repair", "Determine"])
		expect(stored).not.toContain(text);

	await submitBankTexts(t, "banks-again");
	const rows = await intakeRuns(t);
	expect(rows.map((item) => item.submissionKey)).toEqual([
		"banks",
		"banks-again",
	]);
	expect(new Set(rows.map((item) => item.runId)).size).toBe(2);
});

test("re-submitting an analyzed Text returns it without any model call", async () => {
	const t = createTestConvex();
	const first = await submitBankTexts(t, "banks");
	const providers = fakeProviders(bankTexts());
	try {
		expect(
			await t.action(api.orchestration.submitText, {
				visitorId: "visitor-1",
				submissionKey: "banks",
				sourceText: "Die Banken. The banks.",
			}),
		).toEqual(first);
		expect(providers.requests).toEqual([]);
	} finally {
		providers.restore();
	}
	expect(await t.run((ctx) => ctx.db.query("texts").collect())).toHaveLength(
		1,
	);
});

test("a re-submission whose stored analysis differs throws a coded Conflict", async () => {
	const t = createTestConvex();
	await submitBankTexts(t, "banks");
	// A strip in progress has removed one stored Segment.
	await t.run(async (ctx) => {
		const segment = await ctx.db.query("segments").first();
		if (segment) await ctx.db.delete(segment._id);
	});

	await expect(submitBankTexts(t, "banks")).rejects.toMatchObject({
		data: {
			code: "Conflict",
			message: expect.stringContaining("retry after stripping"),
		},
	});
	expect((await intakeRuns(t)).map(({ outcome }) => outcome)).toEqual([
		"Accepted",
		"Failed",
	]);
});

test("a submission that fails before a Text exists is recorded without a Text ID", async () => {
	const t = createTestConvex();
	const providers = unavailableProviders();
	try {
		await expect(
			t.action(api.orchestration.submitText, {
				visitorId: "visitor-1",
				submissionKey: "unavailable",
				sourceText: "Die Banken.",
			}),
		).rejects.toThrow();
	} finally {
		providers.restore();
	}
	const [row] = await intakeRuns(t);
	expect(row).toMatchObject({
		outcome: "Failed",
		failureTag: "ProviderFailure",
		sentences: [
			{
				segmentation: "Failed",
				segmentationTag: "ProviderFailure",
				analysis: "NotApplicable",
			},
		],
	});
	expect(row?.textId).toBeUndefined();
});

test("a failed summary write is logged and changes neither the result nor the error", async () => {
	const t = createTestConvexWith({
		"intakeRuns.ts": async () => ({
			record: internalMutation({
				args: intakeRunValidator.fields,
				returns: v.null(),
				handler: async () => {
					throw Error("write failed");
				},
			}),
		}),
	});
	const error = spyOn(console, "error").mockImplementation(() => {});
	try {
		const result = await submitBankTexts(t, "unrecorded");
		expect(result).toMatchObject({ status: "Accepted" });
		const texts = await t.run((ctx) => ctx.db.query("texts").collect());
		expect(texts.map((text) => text._id)).toEqual([
			result.status === "Accepted" ? result.textId : "missing",
		]);
		expect(String(error.mock.calls.at(-1)?.[0])).toContain(
			"could not be recorded",
		);

		const providers = unavailableProviders();
		try {
			await expect(
				t.action(api.orchestration.submitText, {
					visitorId: "visitor-1",
					submissionKey: "unavailable",
					sourceText: "Die Banken.",
				}),
			).rejects.toThrow("unavailable");
		} finally {
			providers.restore();
		}
	} finally {
		error.mockRestore();
	}
	expect(await intakeRuns(t)).toEqual([]);
});
