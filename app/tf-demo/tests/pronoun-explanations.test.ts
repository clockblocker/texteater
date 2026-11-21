import {
	afterEach,
	beforeEach,
	expect,
	jest,
	setSystemTime,
	test,
} from "bun:test";
import { JevTransport, type LunaAsk, LunaTransport } from "dumgen";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { replaceModelTransports } from "../convex/model/deploymentDumgen";
import { STALE_PENDING_MS } from "../convex/pronounExplanations";
import type { StoredUnit } from "../server/storedSegments";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";

const VISITOR = "visitor-one";

let restore: (() => void) | undefined;

beforeEach(() => {
	// Scheduled runs stay unrun; each test runs the action itself.
	jest.useFakeTimers();
	setSystemTime(new Date("2026-01-01T12:00:00Z"));
});

afterEach(() => {
	setSystemTime();
	jest.useRealTimers();
	restore?.();
	restore = undefined;
});

/** A Luna answering every request with `answer`, keeping what it was sent. */
function fakeLuna(answer: (input: Record<string, unknown>) => unknown) {
	const sent: Record<string, unknown>[] = [];
	const ask: LunaAsk = async (request) => {
		const input = request.input as Record<string, unknown>;
		sent.push(input);
		const output = answer(input);
		if (output instanceof Error) throw output;
		return { output, metadata: { usage: {} } };
	};
	restore = replaceModelTransports({
		jev: () =>
			JevTransport.fromAsk(async () => {
				throw Error("No jev call is expected.");
			}),
		luna: () => LunaTransport.fromAsk(ask),
	});
	return sent;
}

const route = (kind: string) =>
	({ language: "de", family: "Lexeme", kind }) as StoredUnit["route"];

/** "Der Hund sah die Katze." then "Er bellte laut.", with their units routed. */
async function scroll(t: TestConvexDb) {
	return submitText(
		t,
		[
			["Der", " ", "Hund", " ", "sah", " ", "die", " ", "Katze", "."],
			["Er", " ", "bellte", " ", "laut", "."],
		],
		{
			units: [
				[
					{ segments: [0], route: route("DET") },
					{ segments: [2], route: route("NOUN") },
					{ segments: [4], route: route("VERB") },
					{ segments: [6], route: route("DET") },
					{ segments: [8], route: route("NOUN") },
				],
				[
					{ segments: [0], route: route("PRON") },
					{ segments: [2], route: route("VERB") },
					{ segments: [4], route: route("ADV") },
				],
			],
		},
	);
}

const scheduledRuns = (t: TestConvexDb) =>
	t.run(async (ctx) =>
		(await ctx.db.system.query("_scheduled_functions").collect()).filter(
			({ name }) => name === "pronounExplanationActions:explain",
		),
	);

const explanations = (t: TestConvexDb) =>
	t.run((ctx) => ctx.db.query("pronounExplanations").collect());

async function runScheduled(t: TestConvexDb) {
	for (const { args } of await scheduledRuns(t))
		await t.action(
			internal.pronounExplanationActions.explain,
			args[0] as {
				explanationId: Id<"pronounExplanations">;
				run: number;
				inspectRequestId?: string;
			},
		);
}

test("concurrent clicks ask once, and every Visitor reads the stored answer", async () => {
	const t = createTestConvex();
	const { scrollId, sentenceIds } = await scroll(t);
	const sentenceId = sentenceIds[1] as Id<"sentences">;
	const ask = { sentenceId, pronoun: [0] };
	const answers = await Promise.all([
		t.mutation(api.pronounExplanations.request, {
			visitorId: VISITOR,
			...ask,
		}),
		t.mutation(api.pronounExplanations.request, {
			visitorId: "visitor-two",
			...ask,
		}),
	]);
	expect(answers).toEqual([{ kind: "Asked" }, { kind: "Asked" }]);
	expect(await scheduledRuns(t)).toHaveLength(1);
	expect(
		await t.query(api.pronounExplanations.forScroll, {
			scrollId,
			visitorId: "visitor-three",
		}),
	).toEqual([
		{ sentenceId, pronoun: [0], state: "Pending", antecedents: [] },
	]);

	const sent = fakeLuna(() => ({ refersTo: "Candidates", ids: ["n1"] }));
	await runScheduled(t);
	expect(sent).toEqual([
		{
			passage: "Der [n1:Hund] sah die [n2:Katze]. <<Er>> bellte laut.",
			pronoun: "Er",
			candidates: [
				{ id: "n1", text: "Hund" },
				{ id: "n2", text: "Katze" },
			],
		},
	]);
	expect(
		await t.query(api.pronounExplanations.forScroll, {
			scrollId,
			visitorId: "visitor-three",
		}),
	).toEqual([
		{
			sentenceId,
			pronoun: [0],
			state: "Resolved",
			antecedents: [
				{
					sentenceId: sentenceIds[0] as Id<"sentences">,
					segments: [2],
				},
			],
		},
	]);
	// Asked again, it is answered already: no new run.
	await t.mutation(api.pronounExplanations.request, {
		visitorId: VISITOR,
		...ask,
	});
	expect(await scheduledRuns(t)).toHaveLength(1);
});

test("only a pronoun unit is explained", async () => {
	const t = createTestConvex();
	const { sentenceIds } = await scroll(t);
	for (const pronoun of [[2], [0, 2]])
		expect(
			await t.mutation(api.pronounExplanations.request, {
				visitorId: VISITOR,
				sentenceId: sentenceIds[1] as Id<"sentences">,
				pronoun,
			}),
		).toEqual({
			kind: "Rejected",
			message: "Only a pronoun can be explained.",
		});
	expect(await explanations(t)).toEqual([]);
});

test("a failed run is asked again by the next click, as is a Pending one whose run died", async () => {
	const t = createTestConvex();
	const { sentenceIds } = await scroll(t);
	const ask = {
		visitorId: VISITOR,
		sentenceId: sentenceIds[1] as Id<"sentences">,
		pronoun: [0],
	};
	await t.mutation(api.pronounExplanations.request, ask);
	fakeLuna(() => Error("OpenAI is down"));
	await runScheduled(t);
	expect((await explanations(t))[0]?.state).toMatchObject({
		kind: "Failed",
		run: 1,
	});

	await t.mutation(api.pronounExplanations.request, ask);
	expect((await explanations(t))[0]?.state).toMatchObject({
		kind: "Pending",
		run: 2,
	});
	// Still in flight: a click asks nothing new.
	await t.mutation(api.pronounExplanations.request, ask);
	expect((await explanations(t))[0]?.state).toMatchObject({ run: 2 });
	setSystemTime(new Date(Date.now() + STALE_PENDING_MS));
	await t.mutation(api.pronounExplanations.request, ask);
	expect((await explanations(t))[0]?.state).toMatchObject({
		kind: "Pending",
		run: 3,
	});
	// The dead run's late answer changes nothing.
	await t.mutation(internal.pronounExplanations.settle, {
		explanationId: (await explanations(t))[0]
			?._id as Id<"pronounExplanations">,
		run: 2,
		outcome: { kind: "Resolved", antecedents: [] },
	});
	expect((await explanations(t))[0]?.state).toMatchObject({
		kind: "Pending",
		run: 3,
	});
});

test("settling keeps only noun units of the Scroll; none is an answer too", async () => {
	const t = createTestConvex();
	const { sentenceIds } = await scroll(t);
	const [first, second] = sentenceIds as [Id<"sentences">, Id<"sentences">];
	await t.mutation(api.pronounExplanations.request, {
		visitorId: VISITOR,
		sentenceId: second,
		pronoun: [0],
	});
	const [row] = await explanations(t);
	await t.mutation(internal.pronounExplanations.settle, {
		explanationId: row?._id as Id<"pronounExplanations">,
		run: 1,
		outcome: {
			kind: "Resolved",
			antecedents: [
				{ sentenceId: first, segments: [8] },
				{ sentenceId: first, segments: [4] },
				{ sentenceId: second, segments: [0] },
			],
		},
	});
	expect((await explanations(t))[0]?.state).toEqual({
		kind: "Resolved",
		antecedents: [{ sentenceId: first, segments: [8] }],
	});
});

test("Analysis Stripping removes a Sentence's explanations with its units", async () => {
	const t = createTestConvex();
	const { scrollId, sentenceIds } = await scroll(t);
	await t.mutation(api.pronounExplanations.request, {
		visitorId: VISITOR,
		sentenceId: sentenceIds[1] as Id<"sentences">,
		pronoun: [0],
	});
	let fromPosition = 0;
	for (let hasMore = true; hasMore; ) {
		const step = await t.mutation(
			internal.analysisStripping.stripScrollAnalysisGraphBatch,
			{ scrollId, fromPosition },
		);
		hasMore = step.hasMore;
		fromPosition = step.nextPosition;
	}
	expect(await explanations(t)).toEqual([]);
});

test("under TF_INSPECTION, an inspected pronoun explanation records its click, steps, and model payload", async () => {
	const previous = process.env.TF_INSPECTION;
	process.env.TF_INSPECTION = "1";
	try {
		const t = createTestConvex();
		const { sentenceIds } = await scroll(t);
		const sentenceId = sentenceIds[1] as Id<"sentences">;
		const requestId = "pronoun-req-1";
		await t.mutation(api.pronounExplanations.request, {
			visitorId: VISITOR,
			sentenceId,
			pronoun: [0],
			requestId,
			inspect: true,
		});
		fakeLuna(() => ({ refersTo: "Candidates", ids: ["n1"] }));
		await runScheduled(t);

		const detail = await t.query(api.resolutionInspection.detail, {
			visitorId: VISITOR,
			requestId,
		});
		expect(detail).toMatchObject({
			state: "Complete",
			click: {
				requestId,
				visitorId: VISITOR,
				sentenceId,
				selectedSegment: "Er",
				sentence: "Er bellte laut.",
				selectionKind: "PronounExplanation",
				resolutionState: "Complete",
			},
		});
		expect(detail?.finishedAt).toEqual(expect.any(Number));

		const steps = await t.query(api.resolutionInspection.steps, {
			visitorId: VISITOR,
			requestId,
			paginationOpts: { numItems: 50, cursor: null },
		});
		const names = steps.page.map((step) => step.name);
		expect(names).toEqual(
			expect.arrayContaining([
				"Explain pronoun · schedule run",
				"Explain pronoun",
				"Load pronoun passage",
				"explain.pronoun",
				"Settle pronoun explanation",
			]),
		);
		expect(steps.page.some((step) => step.kind === "LLM")).toBe(true);
	} finally {
		if (previous === undefined) delete process.env.TF_INSPECTION;
		else process.env.TF_INSPECTION = previous;
	}
});

test("without TF_INSPECTION, an inspected pronoun explanation captures nothing", async () => {
	const previous = process.env.TF_INSPECTION;
	delete process.env.TF_INSPECTION;
	try {
		const t = createTestConvex();
		const { sentenceIds } = await scroll(t);
		const sentenceId = sentenceIds[1] as Id<"sentences">;
		await t.mutation(api.pronounExplanations.request, {
			visitorId: VISITOR,
			sentenceId,
			pronoun: [0],
			requestId: "pronoun-req-off",
			inspect: true,
		});
		fakeLuna(() => ({ refersTo: "Candidates", ids: ["n1"] }));
		await runScheduled(t);

		const clicks = await t.run((ctx) =>
			ctx.db.query("inspectionClicks").collect(),
		);
		expect(clicks).toEqual([]);
	} finally {
		if (previous === undefined) delete process.env.TF_INSPECTION;
		else process.env.TF_INSPECTION = previous;
	}
});
