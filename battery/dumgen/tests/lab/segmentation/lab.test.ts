import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SegmentInUnitsInput } from "../../../lab/evaluation/spec-corpus/segment-in-units.js";
import { arms } from "../../../lab/segmentation/de/arms/index.js";
import {
	currentSetHash,
	type LabCase,
	type LabSet,
	loadSet,
	storeSet,
} from "../../../lab/segmentation/harness/corpus.js";
import { JevCache } from "../../../lab/segmentation/harness/jev-cache.js";
import { summarizePolicy } from "../../../lab/segmentation/harness/metrics.js";
import { runArm } from "../../../lab/segmentation/harness/run.js";
import type { JevAsk } from "../../../src/segment/jev.js";
import { segmentsOf } from "../evaluation/spec-corpus/fixtures.js";
import { answerEach, zogSichAnGold } from "./support.js";

const directory = await mkdtemp(join(tmpdir(), "segment-in-units-lab-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

// "Er zog sich an, zum Glück." with zum split into zu + m.
const input: SegmentInUnitsInput = {
	language: "de",
	segments: [
		...segmentsOf("Er zog sich an, "),
		{ kind: "ResolvableText", text: "zu", surface: "zu" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
		...segmentsOf(" Glück."),
	],
};
// Segments: Er0 _1 zog2 _3 sich4 _5 an6 ,7 _8 zu9 m10 _11 Glück12 .13
const labCase: LabCase = {
	id: "de/er-zog-sich-an",
	record: "de/er-zog-sich-an",
	input,
	idealOutput: {
		units: [
			{
				segments: [0],
				route: { language: "de", family: "Lexeme", kind: "PRON" },
			},
			{
				segments: [2, 4, 6],
				route: { language: "de", family: "Lexeme", kind: "VERB" },
			},
			{
				segments: [9, 10, 12],
				route: { language: "de", family: "Locution", kind: "ADV" },
			},
		],
	},
	facts: {
		coverage: "Full",
		sources: [{ target: 0 }, { target: 1 }, { target: 2 }],
	},
	rules: [],
	ruleExample: false,
};

/** A judge that knows the gold (`zogSichAnGold`). */
const goldJudge: JevAsk = async (request) => {
	const answers = answerEach(request.questions, zogSichAnGold());
	return {
		model: request.model,
		answers,
		usage: { input_tokens: 100, output_tokens: 0 },
	};
};

const set: LabSet = {
	name: "dev",
	createdAt: "",
	gitHead: "test",
	dirtyRecordFiles: 0,
	hash: "test",
	cases: [labCase],
};

test("candidates4 and the reference score every gold unit with a gold judge, through the lab's runner", async () => {
	const jev = new JevCache({
		cacheDirectory: directory,
		transport: goldJudge,
	});
	for (const [arm, options, policy] of [
		[
			arms.candidates4,
			{ final: "1", closed: "1" },
			"step0+saying+maxim@0.7+closed",
		],
		[arms.reference, {}, "idiom=0.6,fixed=0.3,saying=0.4"],
	] as const) {
		if (!arm) throw Error("A kept arm is missing");
		const run = await runArm({
			runId: `test-${arm.id}`,
			arm,
			options,
			set,
			subset: "all",
			cases: [labCase],
			repetitions: 2,
			jev,
			concurrency: 2,
			gitHead: "test",
		});
		const summary = summarizePolicy(
			run,
			new Map([[labCase.id, labCase]]),
			policy,
		);
		// Summed over both repetitions.
		expect(summary.tally).toMatchObject({
			scored: 6,
			match: 6,
			fullPass: 2,
		});
		expect(summary.flips).toBe(0);
	}
	expect(
		arms.candidates4?.run(input, {
			jev,
			repetition: 0,
			calls: [],
			options: { final: "1", closed: "1", span: "1" },
		}),
	).rejects.toThrow("other levers are retired");
});

test("a run's set is read by its hash, after a refreeze replaced it too", async () => {
	const root = join(directory, "sets-root");
	const replaced = { ...set, hash: "older", cases: [] };
	await storeSet(root, replaced);
	expect((await loadSet(root, "dev")).hash).toBe("older");
	await storeSet(root, set);
	expect(currentSetHash(root, "dev")).toBe("test");
	expect((await loadSet(root, "dev")).hash).toBe("test");
	expect((await loadSet(root, "dev", "test")).cases.length).toBe(1);
	expect((await loadSet(root, "dev", "older")).cases.length).toBe(0);
	expect(loadSet(root, "dev", "unknown")).rejects.toThrow(
		"neither the frozen dev@test nor kept",
	);
	expect(loadSet(root, "heldout")).rejects.toThrow("is not frozen");
});

test("a refreeze to a kept hash keeps the set as first frozen", async () => {
	const root = join(directory, "refrozen-root");
	await storeSet(root, set);
	await storeSet(root, { ...set, createdAt: "later" });
	expect((await loadSet(root, "dev")).createdAt).toBe(set.createdAt);
});
