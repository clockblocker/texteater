import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { lunaRequestKey } from "dumgen";
import { internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import {
	FIRST_STRETCH_CHARACTERS,
	firstStretchLength,
} from "../convex/lunaAheadBatches";
import type { StoredUnit } from "../server/storedSegments";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";
import {
	clickGrammar,
	fakeDeployment,
	fakeLunaBatch,
	membersOf,
	responseBody,
} from "./support/luna-ahead-batches";

/**
 * The first stretch a reader sees of a processed text, its first
 * `FIRST_STRETCH_CHARACTERS`, has the Luna requests its clicks send before
 * jev answers asked live at once, in reading order, and stored as each
 * comes; the rest are batched as before (#1351). Each request is asked
 * once, live or batched. Scheduled functions stay unrun (fake timers).
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

const de = (kind: "ADJ" | "NOUN" | "PRON" | "VERB") =>
	({ language: "de", family: "Lexeme", kind }) as const;

/** Words and spaces, each word on the given route (none: Unresolved). */
const sentence = (words: readonly [string, StoredUnit["route"]][]) => {
	const segments = words.flatMap(([word], index) =>
		index === 0 ? [word] : [" ", word],
	);
	const units: StoredUnit[] = words.map(([, route], index) => ({
		segments: [index * 2],
		route,
	}));
	return { segments: [...segments, "."], units };
};

// The first two Sentences fill the first stretch, a Sentence being at
// most 2,000 characters; the second starts inside it, the third past it.
const opening = sentence([
	["Er", "Unresolved"],
	["liest", "Unresolved"],
	["eine", "Unresolved"],
	["merkwürdige", de("ADJ")],
	["Geschichte", de("NOUN")],
	["x".repeat((FIRST_STRETCH_CHARACTERS * 3) / 4), "Unresolved"],
]);
const filler = sentence([
	["x".repeat(FIRST_STRETCH_CHARACTERS / 2), "Unresolved"],
]);
const later = sentence([
	["Sie", "Unresolved"],
	["schreibt", "Unresolved"],
	["eine", "Unresolved"],
	["seltsame", de("ADJ")],
	["Novelle", de("NOUN")],
]);

const paste = (t: TestConvexDb) =>
	submitText(t, [opening.segments, filler.segments, later.segments], {
		units: [opening.units, filler.units, later.units],
	});

/** Writes what a sure Luna writes: the Canonical Form and each member as it stands. */
const writesMembers = (request: Parameters<typeof membersOf>[0]) => {
	const members = membersOf(request);
	return responseBody({ canonicalForm: members.join(" "), members });
};

const rows = (t: TestConvexDb) =>
	t.run((ctx) => ctx.db.query("lunaAheadBatches").collect());
const answers = (t: TestConvexDb) =>
	t.run((ctx) => ctx.db.query("lunaAheadAnswers").collect());

const submit = (t: TestConvexDb, scrollId: Id<"scrolls">) =>
	t.action(internal.lunaAheadBatchActions.submit, { scrollId });

test("the first stretch is the Sentences that start within its characters, the first always", () => {
	const of = (...lengths: number[]) =>
		lengths.map((length) => ({ stitchedText: "a".repeat(length) }));
	expect(firstStretchLength(of(5000, 10))).toBe(1);
	expect(firstStretchLength(of(998, 999, 10), 2_000)).toBe(3);
	expect(firstStretchLength(of(999, 1000, 10), 2_000)).toBe(2);
	expect(firstStretchLength([])).toBe(0);
});

test("the first stretch's requests are asked live in reading order and stored; the rest are batched; none both ways", async () => {
	const fake = fakeLunaBatch();
	const deployment = fakeDeployment(fake.batch, writesMembers);
	restore = deployment.restore;
	const t = createTestConvex();
	const { scrollId } = await paste(t);
	await submit(t, scrollId);
	// Live, as the click sends them: in reading order, with their output limit.
	expect(deployment.live.map(({ request }) => membersOf(request))).toEqual([
		["merkwürdige"],
		["Geschichte"],
	]);
	for (const { request, maxOutputTokens } of deployment.live) {
		expect(request.input).not.toHaveProperty("judged");
		expect(maxOutputTokens).toBe(512);
	}
	expect(fake.sent).toHaveLength(1);
	expect(fake.sent[0]?.map(({ request }) => membersOf(request))).toEqual([
		["seltsame"],
		["Novelle"],
	]);
	const liveKeys = await Promise.all(
		deployment.live.map(({ request }) => lunaRequestKey(request)),
	);
	const batchedKeys = (fake.sent[0] ?? []).map(({ customId }) => customId);
	expect(liveKeys.filter((key) => batchedKeys.includes(key))).toEqual([]);
	const [live, batch] = (await rows(t)).sort(
		(left, right) =>
			Number(left.openAIBatchId !== undefined) -
			Number(right.openAIBatchId !== undefined),
	);
	expect(live).toMatchObject({
		state: "Completed",
		unitCount: 2,
		requestCount: 2,
		stageCounts: { canonical: 2 },
		answerCount: 2,
		failedCount: 0,
		tokens: { input: 3000, cachedInput: 2800, output: 40 },
		polls: 0,
	});
	expect(live?.openAIBatchId).toBeUndefined();
	expect(batch).toMatchObject({
		state: "Submitted",
		openAIBatchId: "batch_1",
		unitCount: 2,
		requestCount: 2,
		stageCounts: { canonical: 2 },
	});
	if (!live) throw Error("Expected the live row");
	const stored = await answers(t);
	expect(stored.map(({ requestKey }) => requestKey).sort()).toEqual(
		[...liveKeys].sort(),
	);
	for (const answer of stored) {
		expect(answer.batchId).toBe(live._id);
		expect(answer.openAIBatchId).toBeUndefined();
	}
	// A second submission asks nothing answered or batched before live.
	await submit(t, scrollId);
	expect(deployment.live).toHaveLength(2);
});

test("a click in the first stretch is answered from storage before the batch lands; one past it asks Luna", async () => {
	const fake = fakeLunaBatch();
	const deployment = fakeDeployment(fake.batch, writesMembers);
	restore = deployment.restore;
	const t = createTestConvex();
	const { scrollId, sentenceIds } = await paste(t);
	await submit(t, scrollId);
	const [first, , second] = sentenceIds;
	if (!first || !second) throw Error("Expected both Sentences");
	const [live] = (await rows(t)).filter(
		({ openAIBatchId }) => openAIBatchId === undefined,
	);
	const inStretch = await clickGrammar(t, first, 8);
	expect(inStretch.result._tag).toBe("Resolved");
	expect(deployment.luna.stages).toEqual([]);
	expect(inStretch.canonical).toHaveLength(1);
	expect(inStretch.canonical[0]).toMatchObject({
		storedAnswer: live?._id,
		inputTokens: 0,
		outputTokens: 0,
	});
	const pastIt = await clickGrammar(t, second, 8);
	expect(pastIt.result._tag).toBe("Resolved");
	expect(deployment.luna.stages).toEqual(["canonical"]);
	expect(pastIt.canonical[0]?.storedAnswer).toBeUndefined();
});

test("a live request that fails is left to its click, and is not batched", async () => {
	const fake = fakeLunaBatch();
	const deployment = fakeDeployment(fake.batch, (request) =>
		membersOf(request)[0] === "Geschichte"
			? undefined
			: writesMembers(request),
	);
	restore = deployment.restore;
	const t = createTestConvex();
	const { scrollId, sentenceIds } = await paste(t);
	await submit(t, scrollId);
	const live = (await rows(t)).find(
		({ openAIBatchId }) => openAIBatchId === undefined,
	);
	expect(live).toMatchObject({
		state: "Completed",
		answerCount: 1,
		failedCount: 1,
	});
	expect(
		fake.sent.flat().map(({ request }) => membersOf(request)),
	).not.toContainEqual(["Geschichte"]);
	const first = sentenceIds[0];
	if (!first) throw Error("Expected the Sentence");
	const click = await clickGrammar(t, first, 8);
	expect(click.result._tag).toBe("Resolved");
	expect(deployment.luna.stages).toEqual(["canonical"]);
});

test("a deployment with no batch transport still asks the first stretch live, and batches nothing", async () => {
	const deployment = fakeDeployment(undefined, writesMembers);
	restore = deployment.restore;
	const t = createTestConvex();
	const { scrollId } = await paste(t);
	await submit(t, scrollId);
	expect(deployment.live).toHaveLength(2);
	expect(await rows(t)).toHaveLength(1);
});
