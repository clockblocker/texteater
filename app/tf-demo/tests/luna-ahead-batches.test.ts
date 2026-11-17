import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { pollWaitMs } from "../convex/lunaAheadBatchActions";
import { operationSteps } from "../server/inspectionCapture";
import type { StoredUnit } from "../server/storedSegments";
import { foliosOf, requestAndRun, submitBook } from "./support/books";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";
import {
	clickGrammar,
	fakeDeployment,
	fakeLunaBatch,
	isEmojiDraft,
	membersOf,
	responseBody,
} from "./support/luna-ahead-batches";

/**
 * Once Intake has processed a Folio, or a paste or link whole, the Luna
 * request every unit's click sends before jev answers (the canonical
 * guess, or the emoji draft of a headword code writes) is asked ahead
 * through OpenAI's Batch API, and a click finds its answer stored
 * (#1351). Scheduled functions stay unrun (fake timers): each test runs
 * the submission and the polls itself.
 */

let restore: (() => void) | undefined;

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
	restore?.();
	restore = undefined;
});

const de = (family: "Lexeme", kind: "ADJ" | "CCONJ" | "NOUN" | "PRON") =>
	({ language: "de", family, kind }) as const;

// Er0 _1 liest2 _3 eine4 _5 merkwürdige6 _7 Geschichte8 .9
const sentence = [
	"Er",
	" ",
	"liest",
	" ",
	"eine",
	" ",
	"merkwürdige",
	" ",
	"Geschichte",
	".",
];
const units: StoredUnit[] = [
	{
		segments: [0],
		route: de("Lexeme", "PRON"),
		identity: { kind: "PRON", canonicalForm: "er", pronType: "Prs" },
	},
	{ segments: [2], route: "Unresolved" },
	{ segments: [4], route: "Unresolved" },
	{ segments: [6], route: de("Lexeme", "ADJ") },
	{ segments: [8], route: de("Lexeme", "NOUN") },
];

/** The paste, stored as Intake stores it. */
const paste = (t: TestConvexDb) =>
	submitText(t, [sentence], { units: [units] });

const batches = (t: TestConvexDb) =>
	t.run((ctx) => ctx.db.query("lunaAheadBatches").collect());

const scheduled = (t: TestConvexDb, name: string) =>
	t.run(async (ctx) =>
		(await ctx.db.system.query("_scheduled_functions").collect()).filter(
			(job) => job.name.includes(name) && job.state.kind === "pending",
		),
	);

/** Submits the paste's batch and returns its row. */
async function submitted(t: TestConvexDb, scrollId: Id<"scrolls">) {
	await t.action(internal.lunaAheadBatchActions.submit, { scrollId });
	const [row] = await batches(t);
	if (!row) throw Error("Expected a batch");
	return row;
}

/** Writes what a sure Luna writes: the Canonical Form and each member as it stands. */
const writesMembers = (request: Parameters<typeof membersOf>[0]) => {
	const members = membersOf(request);
	return responseBody({ canonicalForm: members.join(" "), members });
};

test("a paste stored whole schedules its batch; a re-submission does not", async () => {
	const t = createTestConvex();
	await paste(t);
	expect(await scheduled(t, "lunaAheadBatchActions")).toHaveLength(1);
	await paste(t);
	expect(await scheduled(t, "lunaAheadBatchActions")).toHaveLength(1);
});

test("a Folio Intake has processed schedules its own batch, over its Sentences alone", async () => {
	const t = createTestConvex();
	const [, scrollId] = await submitBook(t);
	if (!scrollId) throw Error("Expected a chapter Scroll");
	expect(await scheduled(t, "lunaAheadBatchActions")).toHaveLength(0);
	const [folio] = await foliosOf(t, scrollId);
	if (!folio) throw Error("Expected a Folio");
	await requestAndRun(t, folio._id);
	const [job] = await scheduled(t, "lunaAheadBatchActions:submit");
	expect(job?.args).toEqual([{ scrollId, folioId: folio._id }]);
	const ahead = await t.query(internal.lunaAheadBatches.unitsAhead, {
		scrollId,
		folioId: folio._id,
	});
	const positions = await t.run((ctx) =>
		Promise.all(
			ahead.map(
				async ({ sentenceId }) =>
					(await ctx.db.get(sentenceId))?.position,
			),
		),
	);
	expect(positions.length).toBeGreaterThan(0);
	for (const position of positions) {
		expect(position).toBeGreaterThanOrEqual(folio.start);
		expect(position).toBeLessThan(folio.end);
	}
});

test("the batch holds the canonical request of each open-route unit, and none for a closed or Unresolved one", async () => {
	const fake = fakeLunaBatch();
	restore = fakeDeployment(fake.batch).restore;
	const t = createTestConvex();
	const { scrollId } = await paste(t);
	const row = await submitted(t, scrollId);
	expect(fake.sent).toHaveLength(1);
	expect(
		fake.sent[0]?.map(({ request }) => membersOf(request)).sort(),
	).toEqual([["Geschichte"], ["merkwürdige"]]);
	// Sent as the click sends it: before jev has judged, with its output limit.
	for (const { request, maxOutputTokens } of fake.sent[0] ?? []) {
		expect(request.input).not.toHaveProperty("judged");
		expect(maxOutputTokens).toBe(512);
	}
	expect(row).toMatchObject({
		state: "Submitted",
		openAIBatchId: "batch_1",
		unitCount: 2,
		requestCount: 2,
		stageCounts: { canonical: 2 },
		polls: 0,
	});
	expect(await scheduled(t, "lunaAheadBatchActions:poll")).toHaveLength(1);
});

test("a click whose canonical request the completed batch answered asks Luna nothing, and its trace says so", async () => {
	const fake = fakeLunaBatch();
	const deployment = fakeDeployment(fake.batch);
	restore = deployment.restore;
	const t = createTestConvex();
	const { scrollId, sentenceIds } = await paste(t);
	const row = await submitted(t, scrollId);
	// Still running: the poll counts the look and comes again later.
	await t.action(internal.lunaAheadBatchActions.poll, { batchId: row._id });
	expect((await batches(t))[0]?.polls).toBe(1);
	fake.end("completed", writesMembers);
	await t.action(internal.lunaAheadBatchActions.poll, { batchId: row._id });
	expect((await batches(t))[0]).toMatchObject({
		state: "Completed",
		answerCount: 2,
		failedCount: 0,
		tokens: { input: 3000, cachedInput: 2800, output: 40 },
	});
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw Error("Expected the Sentence");
	const { result, canonical } = await clickGrammar(t, sentenceId, 6);
	expect(result._tag).toBe("Resolved");
	expect(deployment.luna.stages).not.toContain("canonical");
	expect(canonical).toHaveLength(1);
	expect(canonical[0]).toMatchObject({
		storedAnswer: "batch_1",
		inputTokens: 0,
		outputTokens: 0,
	});
	// A second paste of the same units asks nothing already answered.
	await t.action(internal.lunaAheadBatchActions.submit, { scrollId });
	expect(fake.sent).toHaveLength(1);
});

// Aber0 _1 die2 _3 Geschichte4 _5 endet6 .7: code writes the
// conjunction's headword, and with no stored or authored Reading of aber
// its click drafts the Emoji Description beside jev.
const coded = (t: TestConvexDb) =>
	submitText(
		t,
		[["Aber", " ", "die", " ", "Geschichte", " ", "endet", "."]],
		{
			units: [
				[
					{ segments: [0], route: de("Lexeme", "CCONJ") },
					{ segments: [2], route: "Unresolved" },
					{ segments: [4], route: de("Lexeme", "NOUN") },
					{ segments: [6], route: "Unresolved" },
				],
			],
		},
	);

test("a unit whose headword code writes has its emoji draft asked ahead, and its click drafts from the stored answer", async () => {
	const fake = fakeLunaBatch();
	const deployment = fakeDeployment(fake.batch);
	restore = deployment.restore;
	const t = createTestConvex();
	const { scrollId, sentenceIds } = await coded(t);
	const row = await submitted(t, scrollId);
	expect(row).toMatchObject({
		unitCount: 2,
		requestCount: 2,
		stageCounts: { canonical: 1, emojiDescription: 1 },
	});
	const draft = fake.sent[0]?.find(({ request }) => isEmojiDraft(request));
	expect(draft?.request.input).toEqual({
		markedSentence: "<TARGET>Aber</TARGET> die Geschichte endet.",
		lemma: "aber",
	});
	expect(draft?.maxOutputTokens).toBe(128);
	fake.end("completed", (request) =>
		isEmojiDraft(request) ? responseBody("➕") : writesMembers(request),
	);
	await t.action(internal.lunaAheadBatchActions.poll, { batchId: row._id });
	expect((await batches(t))[0]).toMatchObject({
		state: "Completed",
		answerCount: 2,
	});
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw Error("Expected the Sentence");
	const { result, trace, emojiDescription, canonical } = await clickGrammar(
		t,
		sentenceId,
		0,
	);
	expect(result).toMatchObject({ _tag: "Resolved", drafted: "➕" });
	expect(deployment.luna.stages).toEqual([]);
	expect(canonical).toEqual([]);
	expect(emojiDescription).toHaveLength(1);
	expect(emojiDescription[0]).toMatchObject({
		storedAnswer: "batch_1",
		inputTokens: 0,
		outputTokens: 0,
	});
	if (!trace) throw Error("Expected the click's trace");
	expect(operationSteps(trace).map(({ name }) => name)).toContain(
		"emojiDescription · stored answer",
	);
	// The noun's click finds its canonical guess stored too.
	const noun = await clickGrammar(t, sentenceId, 4);
	expect(noun.canonical[0]?.storedAnswer).toBe("batch_1");
	expect(deployment.luna.stages).toEqual([]);
});

test("a click whose emoji draft has no stored answer drafts with Luna", async () => {
	const fake = fakeLunaBatch();
	const deployment = fakeDeployment(fake.batch);
	restore = deployment.restore;
	const t = createTestConvex();
	const { sentenceIds } = await coded(t);
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw Error("Expected the Sentence");
	const { result, emojiDescription } = await clickGrammar(t, sentenceId, 0);
	expect(result).toMatchObject({ _tag: "Resolved", drafted: "🔁" });
	expect(deployment.luna.stages).toEqual(["emojiDescription"]);
	expect(emojiDescription[0]?.storedAnswer).toBeUndefined();
});

test("a click with no stored answer, or an unusable one, asks Luna", async () => {
	const fake = fakeLunaBatch();
	const deployment = fakeDeployment(fake.batch);
	restore = deployment.restore;
	const t = createTestConvex();
	const { scrollId, sentenceIds } = await paste(t);
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw Error("Expected the Sentence");
	// Before the batch is back.
	const before = await clickGrammar(t, sentenceId, 6);
	expect(before.result._tag).toBe("Resolved");
	expect(deployment.luna.stages).toEqual(["canonical"]);
	expect(before.canonical[0]?.storedAnswer).toBeUndefined();
	// Back with an answer Luna's check refuses, and a line that failed.
	const row = await submitted(t, scrollId);
	fake.end("completed", (request) =>
		membersOf(request)[0] === "merkwürdige"
			? responseBody({ canonicalForm: "zwei\nZeilen", members: [] })
			: undefined,
	);
	await t.action(internal.lunaAheadBatchActions.poll, { batchId: row._id });
	expect((await batches(t))[0]).toMatchObject({
		answerCount: 1,
		failedCount: 1,
	});
	const unusable = await clickGrammar(t, sentenceId, 6);
	expect(unusable.result._tag).toBe("Resolved");
	expect(deployment.luna.stages).toEqual(["canonical", "canonical"]);
	expect(
		unusable.canonical.map(({ storedAnswer, failure }) => [
			storedAnswer,
			failure?.tag,
		]),
	).toEqual([
		["batch_1", "InvalidModelOutput"],
		[undefined, undefined],
	]);
	const failedLine = await clickGrammar(t, sentenceId, 8);
	expect(failedLine.result._tag).toBe("Resolved");
	expect(deployment.luna.stages).toHaveLength(3);
});

test("a failed or expired batch is dropped with nothing stored, and its polls stop", async () => {
	for (const [ended, state] of [
		["failed", "Failed"],
		["expired", "Expired"],
	] as const) {
		const fake = fakeLunaBatch();
		restore?.();
		restore = fakeDeployment(fake.batch).restore;
		const t = createTestConvex();
		const { scrollId } = await paste(t);
		const row = await submitted(t, scrollId);
		fake.end(ended, () => responseBody({}));
		await t.action(internal.lunaAheadBatchActions.poll, {
			batchId: row._id,
		});
		const [settled] = await batches(t);
		expect(settled?.state).toBe(state);
		expect(settled?.failure).toContain(ended);
		expect(
			await t.run((ctx) => ctx.db.query("lunaAheadAnswers").collect()),
		).toEqual([]);
		// Only the first poll the submission scheduled was ever pending.
		expect(await scheduled(t, "lunaAheadBatchActions:poll")).toHaveLength(
			1,
		);
	}
});

test("a deployment without an OpenAI key asks nothing ahead", async () => {
	restore = fakeDeployment(undefined).restore;
	const t = createTestConvex();
	const { scrollId } = await paste(t);
	await t.action(internal.lunaAheadBatchActions.submit, { scrollId });
	expect(await batches(t)).toEqual([]);
});

test("polls back off from a minute to ten", () => {
	expect([0, 1, 2, 3, 4, 10].map(pollWaitMs)).toEqual([
		60_000, 120_000, 240_000, 480_000, 600_000, 600_000,
	]);
});
