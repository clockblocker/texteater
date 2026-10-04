/**
 * Replays one policy of a stored lab run through promptsmith's
 * `runOperationExperiment`, so arms compare case by case with `compareRuns`
 * and carry promptsmith's stability counts. Nothing is called: each
 * repetition returns the output the lab stored.
 */
import { rm } from "node:fs/promises";
import { join } from "node:path";
import {
	defineGoldenCaseCollection,
	defineGoldenCaseGroup,
	defineGoldenCorpus,
	stableJson,
} from "promptsmith";
import {
	type OperationEvaluationRun,
	runOperationExperiment,
} from "promptsmith/evaluation";
import { saveRun } from "promptsmith/storage";
import {
	type SegmentInUnitsOutput,
	segmentInUnitsInputSchema,
	segmentInUnitsOutputSchema,
	segmentInUnitsRoute,
} from "../../evaluation/spec-corpus/segment-in-units.js";
import { evaluateSegmentInUnits } from "../../evaluation/spec-corpus/segment-in-units-evaluation.js";
import type { LabCase } from "./corpus.js";
import type { LabRun } from "./run.js";

export async function exportPolicy(args: {
	readonly run: LabRun;
	readonly cases: ReadonlyMap<string, LabCase>;
	readonly policy: string;
	readonly directory: string;
}): Promise<OperationEvaluationRun> {
	const { run, policy } = args;
	const selected = run.cases.flatMap((caseRun) => {
		const labCase = args.cases.get(caseRun.id);
		return labCase ? [{ caseRun, labCase }] : [];
	});
	const corpus = defineGoldenCorpus({
		route: segmentInUnitsRoute,
		inputSchema: segmentInUnitsInputSchema,
		outputSchema: segmentInUnitsOutputSchema,
		collections: {
			lab: defineGoldenCaseCollection({
				groups: {
					cases: defineGoldenCaseGroup(
						Object.fromEntries(
							selected.map(({ labCase }) => [
								labCase.id,
								{
									input: labCase.input,
									idealOutput: labCase.idealOutput,
									contaminationKeys: [labCase.record],
								},
							]),
						),
					),
				},
				cases: {},
			}),
		},
	});
	const stored = new Map(
		selected.map(({ caseRun, labCase }) => [
			stableJson(labCase.input),
			caseRun,
		]),
	);
	const served = new Map<string, number>();
	const evaluation = await runOperationExperiment({
		experiment: {
			corpus,
			evaluation: corpus.select(
				selected.map(({ labCase }) => labCase.id),
			),
			demonstrations: corpus.select([]),
			async run(input, context) {
				const key = stableJson(input);
				const caseRun = stored.get(key);
				if (!caseRun) throw Error("No stored case for this input");
				const index = served.get(key) ?? 0;
				served.set(key, index + 1);
				const repetition = caseRun.repetitions[index];
				if (!repetition) throw Error("No stored repetition");
				context.recordTrace({
					calls: repetition.calls.map((call) => ({
						executor:
							call.executor === "jev"
								? ("TypeSafe" as const)
								: ("Luna" as const),
						...(call.executor === "jev"
							? {
									output: {
										usage: {
											input_tokens: call.inputTokens,
											output_tokens: call.outputTokens,
										},
									},
								}
							: {
									metadata: {
										usage: {
											input_tokens: call.inputTokens,
											output_tokens: call.outputTokens,
										},
									},
								}),
					})),
				});
				const output = repetition.outputs?.[policy];
				if (!output)
					throw Error(repetition.error ?? `No output for ${policy}`);
				return output as SegmentInUnitsOutput;
			},
			evaluator: evaluateSegmentInUnits(
				Object.fromEntries(
					selected.map(({ labCase }) => [labCase.id, labCase.facts]),
				),
			),
		},
		experimentId: `segment-in-units-lab/${run.arm}`,
		operationVersion: `${run.arm}:${policy}:${stableJson(run.options)}`,
		evaluatorVersion: "757",
		// The commit alone does not name the code that ran; the manifest's code hash does.
		sourceRevision: run.codeHash
			? `${run.gitHead}${run.dirty ? "+dirty" : ""}#${run.codeHash.slice(0, 16)}`
			: run.gitHead,
		configurations: {
			generation: { model: "gpt-5.6-luna", settings: {} },
			judgment: {
				model: run.modelResolved?.join(",") || run.model,
				settings: { ...run.options },
			},
		},
		runId: `${run.runId}--${policy.replace(/[^a-zA-Z0-9_-]/gu, "_")}`,
		repetitions: run.repetitions,
	});
	// A policy exported before is replaced, so re-running compare is idempotent.
	await rm(join(args.directory, evaluation.manifest.runId), {
		recursive: true,
		force: true,
	});
	await saveRun(args.directory, evaluation);
	return evaluation;
}
