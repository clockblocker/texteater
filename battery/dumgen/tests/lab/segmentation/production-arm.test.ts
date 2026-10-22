import { afterAll, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalJson } from "common-utils";
import type { SegmentInUnitsInput } from "../../../lab/evaluation/spec-corpus/segment-in-units.js";
import type { ArmOptions } from "../../../lab/segmentation/de/arm.js";
import { productionArm } from "../../../lab/segmentation/de/arms/production.js";
import { JevCache } from "../../../lab/segmentation/harness/jev-cache.js";
import { codeRules } from "../../../src/segment/de/code-rules.js";
import type { JevAsk } from "../../../src/segment/jev.js";
import { segmentsOf } from "../evaluation/spec-corpus/fixtures.js";
import { answerEach, type Picks, zogSichAnGold } from "./support.js";

const directory = await mkdtemp(join(tmpdir(), "production-arm-"));
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

const judgeBy =
	(picks: Picks): JevAsk =>
	async (request) => ({
		model: request.model,
		answers: answerEach(request.questions, picks),
		usage: { input_tokens: 1, output_tokens: 0 },
	});

/** A share in [0, 1) that `text` fixes. */
const shareOf = (text: string) =>
	Number.parseInt(
		createHash("sha256").update(text).digest("hex").slice(0, 8),
		16,
	) / 0x1_00_00_00_00;

/** A judge whose every answer its question id fixes, so some links pass a floor and some fail. */
const hashJudge = judgeBy({
	noul: (id) => shareOf(`a${id}`),
	choice: (id, keys) => keys[Math.floor(shareOf(`a${id}`) * keys.length)],
});

/** The arm's result under `options`, and how many distinct requests it put per stage. */
async function runUnder(
	options: ArmOptions,
	{
		sentence = input,
		judge = judgeBy(zogSichAnGold()),
		repetition = 0,
	}: {
		readonly sentence?: SegmentInUnitsInput;
		readonly judge?: JevAsk;
		readonly repetition?: number;
	} = {},
) {
	const stages: Record<string, number> = {};
	const seen = new Set<string>();
	const jev = new JevCache({
		cacheDirectory: await mkdtemp(join(directory, "cache-")),
		transport: judge,
		onRequest: (request) => {
			const key = canonicalJson(request);
			if (seen.has(key)) return;
			seen.add(key);
			stages[request.stage] = (stages[request.stage] ?? 0) + 1;
		},
	});
	const result = await productionArm.run(sentence, {
		jev,
		repetition,
		calls: [],
		options,
	});
	return { result, stages };
}

const { result: plain, stages: plainStages } = await runUnder({});

/** A Sentence whose hashed answers ask the Locution, Verb and Government Choices. */
const weg = {
	sentence: {
		language: "de",
		segments: segmentsOf("Er hat sich auf den Weg gemacht."),
	},
	judge: hashJudge,
} as const;
const { stages: wegStages } = await runUnder({}, weg);

test("production runs the unit stage as intake does and heads its numbers", () => {
	expect(plain.primary).toBe("production");
	expect(Object.keys(plain.outputs)).toEqual(["production"]);
	expect(
		plain.outputs.production?.units.map((unit) => unit.segments),
	).toEqual([[0], [2, 4, 6], [9, 10, 12]]);
	expect(plain.routes?.length).toBeGreaterThan(0);
});

test("X1's grid crosses two floor settings, four Saying assemblies and step 0, offline", async () => {
	const { result, stages } = await runUnder({ grid: "x1" });
	const grid = ["prod", "762"].flatMap((floors) =>
		["maxim@0.6", "maxim@0.7", "maxim@0.8", "saying@0.4"].flatMap(
			(saying) =>
				["", "+nostep0"].map((step) => `${floors}+${saying}${step}`),
		),
	);
	expect(Object.keys(result.outputs)).toEqual(["production", ...grid]);
	// Its groups no batch asked about route Unresolved, unasked, and its
	// nomination without was … für asks what production's did here.
	expect(stages).toEqual(plainStages);
});

test("X7's route variants reroute production's membership at each margin, asking nothing more", async () => {
	const { result, stages } = await runUnder({ variants: "0.1,0.2" });
	expect(Object.keys(result.outputs)).toEqual([
		"production",
		"production+variants@0.1",
		"production+variants@0.2",
	]);
	expect(stages).toEqual(plainStages);
});

test("X3 adds each listed code rule to production's, and all of them together", async () => {
	const { result } = await runUnder({ x3: "was-fuer,anchors" });
	expect(Object.keys(result.outputs)).toEqual([
		"production",
		"production+was-fuer",
		"production+anchors",
		"production+x3",
	]);
	const { result: all } = await runUnder({ x3: "all" });
	expect(Object.keys(all.outputs)).toEqual([
		"production",
		...codeRules.map((rule) => `production+${rule}`),
		"production+x3",
	]);
});

test("X5's Locution Choice variants read the locution request of their rule set", async () => {
	const { result, stages } = await runUnder(
		{ x5: "0.5,0.6-noabsorb,0.6-sc,0.7-sc" },
		weg,
	);
	expect(Object.keys(result.outputs)).toEqual([
		"production",
		"production+x5@0.5",
		"production+x5@0.6-noabsorb",
		"production+x5@0.6-sc",
		"production+x5@0.7-sc",
	]);
	// Production's rules hold saying-closed, so every variant reads production's request.
	expect(wegStages.locution).toBe(1);
	expect(stages).toEqual(wegStages);
});

test("D4's Verb Choice and X4's Government Choice variants each read one request over every family", async () => {
	// Production asks the verb request about three families and the
	// government request about all but weak, which this Sentence lacks.
	const levers = { verb: "0.6,0.5-lassen-recipient", gov: "0.5,0.6-joined" };
	const { result, stages } = await runUnder(levers, weg);
	expect(Object.keys(result.outputs)).toEqual([
		"production",
		"production+verb@0.6",
		"production+verb@0.5-lassen-recipient",
		"production+gov@0.5",
		"production+gov@0.6-joined",
	]);
	expect(wegStages.verb).toBe(1);
	expect(stages.verb).toBe(2);
	expect(wegStages.government).toBe(1);
	expect(stages).toEqual({ ...wegStages, verb: 2 });
});

test("X2 pools every policy over repetitions 0 to 2, the same in each repetition", async () => {
	const options = { pool: "mean,median", variants: "0.2" };
	const { result } = await runUnder(options);
	expect(Object.keys(result.outputs)).toEqual([
		"production",
		"production+variants@0.2",
		"pooled-mean+production",
		"pooled-mean+production+variants@0.2",
		"pooled-median+production",
		"pooled-median+production+variants@0.2",
	]);
	const { result: later } = await runUnder(options, { repetition: 2 });
	expect(later.outputs["pooled-mean+production"]).toEqual(
		result.outputs["pooled-mean+production"],
	);
});

test("production refuses a lever it does not take or a malformed one", async () => {
	for (const [options, message] of [
		[{ final: "1" }, "production takes no --opt final"],
		[{ grid: "x2" }, "must be x1"],
		[{ pool: "mode" }, "lists mean, median"],
		[{ variants: "-1" }, "must list margins"],
		[{ x3: "no-such-rule" }, "lists all"],
		[{ x5: "0.5-nobleiben" }, "noabsorb or sc"],
		[{ verb: "0.5-weak" }, "a variant is a floor"],
		[{ gov: "high" }, "a variant is a floor"],
	] as const)
		await expect(runUnder(options)).rejects.toThrow(message);
});
