import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalJson } from "common-utils";
import { runOperationExperiment } from "promptsmith/evaluation";
import { compareRuns, loadRun, saveRun } from "promptsmith/storage";
import { goldOf } from "../../../../lab/evaluation/spec-corpus/gold.js";
import { projectCorpus } from "../../../../lab/evaluation/spec-corpus/projection.js";
import {
	type SegmentInUnitsInput,
	type SegmentInUnitsOutput,
	segmentInUnits,
} from "../../../../lab/evaluation/spec-corpus/segment-in-units.js";
import { evaluateSegmentInUnits } from "../../../../lab/evaluation/spec-corpus/segment-in-units-evaluation.js";
import { emptySidecar, specRecord } from "./fixtures.js";

const records = [
	specRecord({
		id: "de/nora-hat-bereits-gegessen",
		sentence: "Nora hat bereits gegessen.",
		targets: [[[2, 6], "Lexeme/VERB"]],
	}),
	specRecord({
		id: "de/sie-geht",
		sentence: "Sie geht.",
		targets: [
			[[0], "Lexeme/PRON"],
			[[2], "Lexeme/VERB"],
		],
		coverage: "Full",
	}),
	specRecord({
		id: "de/wir-lachen",
		sentence: "Wir lachen.",
		targets: [[[2], "Lexeme/VERB"]],
	}),
];
const projected = projectCorpus(
	segmentInUnits,
	goldOf({ records, sidecar: emptySidecar }),
);
const demonstrations = projected.corpus.select(["de/wir-lachen"]);
const ideal = new Map(
	Object.values(projected.corpus.cases).map((golden) => [
		canonicalJson(golden.input),
		golden.idealOutput,
	]),
);

/**
 * A fake segmenter: the gold units, with every other ResolvableText Segment
 * a unit of its own. `flaky` splits `hat gegessen` on two calls of three.
 */
function fakeSegmenter(flaky: boolean) {
	let calls = 0;
	return async (
		input: SegmentInUnitsInput,
	): Promise<SegmentInUnitsOutput> => {
		calls++;
		const gold = ideal.get(canonicalJson(input));
		if (!gold) throw Error("Unknown input");
		const units = gold.units.flatMap((unit) =>
			flaky && calls % 3 !== 1 && unit.segments.length > 1
				? unit.segments.map((segment) => ({
						...unit,
						segments: [segment],
					}))
				: [unit],
		);
		const covered = new Set(units.flatMap(({ segments }) => segments));
		const rest = input.segments.flatMap(({ kind }, index) =>
			kind === "ResolvableText" && !covered.has(index)
				? [{ segments: [index], route: "Unresolved" as const }]
				: [],
		);
		return { units: [...units, ...rest] };
	};
}

const directory = await mkdtemp(join(tmpdir(), "segment-in-units-run-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

async function run(runId: string, flaky: boolean) {
	const segment = fakeSegmenter(flaky);
	const evaluation = await runOperationExperiment({
		experiment: {
			corpus: projected.corpus,
			evaluation: projected.testSet(demonstrations),
			demonstrations,
			run: (input) => segment(input),
			evaluator: evaluateSegmentInUnits(projected.facts),
		},
		experimentId: "segment-in-units-de",
		operationVersion: "fake",
		evaluatorVersion: "1",
		sourceRevision: "test",
		configurations: {
			generation: { model: "fake", settings: {} },
			judgment: { model: "fake", settings: {} },
		},
		runId,
		repetitions: 3,
	});
	await saveRun(directory, evaluation);
	return loadRun(directory, runId);
}

test("a fake segmenter's repeated runs are stored and compared field by field", async () => {
	const steady = await run("steady", false);
	const flaky = await run("flaky", true);
	expect(steady.manifest.corpus.caseIds).toEqual([
		"de/nora-hat-bereits-gegessen",
		"de/sie-geht",
	]);
	expect(steady.summary.stability).toMatchObject({ flipped: 0 });
	expect(steady.summary.quality).toMatchObject({ passed: 2, failed: 0 });
	expect(flaky.summary.stability).toMatchObject({ flipped: 1 });

	const comparison = compareRuns(steady, flaky);
	expect(comparison.sameCorpus).toBe(true);
	expect(comparison.changedVerdicts).toEqual([
		"de/nora-hat-bereits-gegessen",
	]);
	const [changed] = comparison.cases;
	expect(changed?.verdict).toEqual({ left: "Passed", right: "Mixed" });
	// Two of three repetitions split the verb, so that is the compared output.
	expect(changed?.outputChanges).toContainEqual({
		path: "units[0].segments[1]",
		change: "Removed",
		left: 6,
	});
});
