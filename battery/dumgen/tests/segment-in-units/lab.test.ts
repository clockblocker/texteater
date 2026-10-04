import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SegmentInUnitsInput } from "../../src/evaluation/spec-corpus/segment-in-units.js";
import type { Answers } from "../../src/segment/ask.js";
import type { JevAsk } from "../../src/segment/jev.js";
import { arms } from "../../src/segment-in-units/de/arms/index.js";
import {
	currentSetHash,
	type LabCase,
	type LabSet,
	loadSet,
	storeSet,
} from "../../src/segment-in-units/lab/corpus.js";
import { JevCache } from "../../src/segment-in-units/lab/jev-cache.js";
import { summarizePolicy } from "../../src/segment-in-units/lab/metrics.js";
import { runArm } from "../../src/segment-in-units/lab/run.js";
import { segmentsOf } from "../spec-corpus/fixtures.js";

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

/**
 * A judge that knows the gold: sich and an take zog as host, zu, m and
 * Glück are fixed words of one expression, and each gold group gets its
 * gold route. Everything else is answered no: a Noul 0.1, a Choice its
 * last option (`none`, `Other`, …).
 */
const goldJudge: JevAsk = async (request) => {
	const known: Record<string, string> = {
		s_reflexive_3: "p2",
		s_particle_4: "p2",
		r_1: "Lexeme/PRON",
		r_2_3_4: "Lexeme/VERB",
		r_5_6_7: "Locution/ADV",
	};
	const fixed = new Set(["f_5", "f_6", "f_7", "e_5_6", "e_5_7", "e_6_7"]);
	const answers = Object.fromEntries(
		Object.entries(request.questions).map(([id, question]) => {
			if (question.type === "noul")
				return [id, { type: "noul", noul: fixed.has(id) ? 0.9 : 0.1 }];
			const keys = Object.keys(
				question.type === "choice" ? question.criteria : {},
			);
			const wanted = known[id] ?? keys[keys.length - 1];
			return [
				id,
				{
					type: "choice",
					choice: wanted,
					confidence: 1,
					probabilities: Object.fromEntries(
						keys.map((key) => [key, key === wanted ? 1 : 0]),
					),
				},
			];
		}),
	);
	return {
		model: request.model,
		answers: answers as Answers,
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
