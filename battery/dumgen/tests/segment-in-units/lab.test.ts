import { afterAll, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TypeSafeExecutor } from "promptsmith/typesafe";
import type { SegmentInUnitsInput } from "../../src/evaluation/spec-corpus/segment-in-units.js";
import { oracleArm } from "../../src/segment-in-units/de/arms/baselines.js";
import { pairwiseArm } from "../../src/segment-in-units/de/arms/pairs.js";
import {
	partitionOf,
	partitionOfUnits,
} from "../../src/segment-in-units/de/partition.js";
import {
	sentenceOf,
	taggedText,
} from "../../src/segment-in-units/de/sentence.js";
import {
	archivedSetPath,
	type LabCase,
	type LabSet,
	loadSet,
	setPath,
} from "../../src/segment-in-units/lab/corpus.js";
import { Jev } from "../../src/segment-in-units/lab/jev.js";
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

test("pieces are numbered from 1, fused pieces keep their written word", () => {
	const sentence = sentenceOf(input);
	expect(sentence.pieces.map((piece) => piece.text)).toEqual([
		"Er",
		"zog",
		"sich",
		"an",
		"zu",
		"m",
		"Glück",
	]);
	expect(sentence.pieces[5]).toMatchObject({
		id: 6,
		surface: "dem",
		fusedWord: "zum",
		clause: 1,
	});
	expect(taggedText(sentence)).toBe(
		"Er[1] zog[2] sich[3] an[4], zu[5]m[6] Glück[7].",
	);
	expect(partitionOfUnits(sentence, labCase.idealOutput.units)).toEqual([
		[1],
		[2, 3, 4],
		[5, 6, 7],
	]);
	expect(partitionOf([1, 2, 3, 4], [[4, 2]])).toEqual([[1], [2, 4], [3]]);
});

/** A judge that links exactly the gold pairs and names the gold route. */
const goldJudge: TypeSafeExecutor = async (request) => {
	const gold: Record<string, string> = {
		"1": "Lexeme/PRON",
		"2_3_4": "Lexeme/VERB",
		"5_6_7": "Locution/ADV",
	};
	const together = (a: number, b: number) =>
		[
			[2, 3, 4],
			[5, 6, 7],
		].some((group) => group.includes(a) && group.includes(b));
	const answers = Object.fromEntries(
		Object.entries(request.questions).map(([id, question]) => {
			if (question.type === "noul") {
				const [, a, b] = id.split("_").map(Number);
				return [
					id,
					{
						type: "noul",
						noul: together(a ?? 0, b ?? 0) ? 0.9 : 0.1,
					},
				];
			}
			const keys = Object.keys(
				question.type === "choice" ? question.criteria : {},
			);
			const wanted = id.startsWith("r_")
				? (gold[id.slice(2)] ?? keys[0])
				: keys[keys.length - 1];
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
		answers,
		usage: { input_tokens: 100, output_tokens: 0 },
	} as never;
};

const set: LabSet = {
	name: "dev",
	createdAt: "",
	gitHead: "test",
	dirtyRecordFiles: 0,
	hash: "test",
	cases: [labCase],
};

test("the pairwise and oracle arms score every gold unit with a gold judge", async () => {
	const jev = new Jev({ cacheDirectory: directory, executor: goldJudge });
	for (const arm of [pairwiseArm, oracleArm]) {
		const run = await runArm({
			runId: `test-${arm.id}`,
			arm,
			options: {},
			set,
			subset: "all",
			cases: [labCase],
			repetitions: 2,
			jev,
			concurrency: 2,
			gitHead: "test",
		});
		const policy = arm.id === "oracle" ? "identity" : "t0.5";
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
});

test("a run's set is read by its hash, from the archive once a refreeze replaced it", async () => {
	const root = join(directory, "sets-root");
	await mkdir(join(root, "sets"), { recursive: true });
	await writeFile(setPath(root, "dev"), JSON.stringify(set));
	const replaced = { ...set, hash: "older", cases: [] };
	await writeFile(
		archivedSetPath(root, "dev", "older"),
		JSON.stringify(replaced),
	);
	expect((await loadSet(root, "dev")).hash).toBe("test");
	expect((await loadSet(root, "dev", "test")).cases.length).toBe(1);
	expect((await loadSet(root, "dev", "older")).cases.length).toBe(0);
	expect(loadSet(root, "dev", "unknown")).rejects.toThrow(
		"neither the frozen dev@test nor archived",
	);
});
