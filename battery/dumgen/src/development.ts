/**
 * The experiments `cli/evaluate.ts` and the Laboratory list and run. The
 * German `segment.inUnits` experiments load with this module. The legacy
 * pipeline's experiments load behind it: while their modules fail to load,
 * they are left out of the list and refused by id, and nothing else breaks
 * (#701).
 */
import { fileURLToPath } from "node:url";
import type * as Legacy from "./legacy-experiments.js";
import {
	evaluateSegmentInUnitsExperiment,
	isSegmentInUnitsExperiment,
	listSegmentInUnitsExperiments,
	segmentInUnitsMetrics,
} from "./segment-in-units/de/experiment.js";

export { disagreementsFileName } from "./evaluation/spec-review.js";

const legacy: { readonly module: typeof Legacy } | { readonly error: string } =
	await import("./legacy-experiments.js").then(
		(module) => ({ module }),
		(error: unknown) => ({
			error: error instanceof Error ? error.message : String(error),
		}),
	);

function legacyExperiments(): typeof Legacy {
	if ("error" in legacy)
		throw Error(`The legacy experiments do not load: ${legacy.error}`);
	return legacy.module;
}

function listLegacy(): {
	readonly entries: ReturnType<typeof Legacy.listExperiments>;
	readonly error?: string;
} {
	try {
		return { entries: legacyExperiments().listExperiments() };
	} catch (error) {
		return {
			entries: [],
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

export function listExperiments() {
	return [...listSegmentInUnitsExperiments(), ...listLegacy().entries];
}

/** Why the legacy experiments are missing from `listExperiments`, if they are. */
export const unavailableExperiments = () => listLegacy().error;

export const getExperiment: typeof Legacy.getExperiment = (id) =>
	legacyExperiments().getExperiment(id);

export const operationExperiment: typeof Legacy.operationExperiment = (
	id,
	options,
) => legacyExperiments().operationExperiment(id, options);

export const resolveOrGenerateTranslation: typeof Legacy.resolveOrGenerateTranslation =
	(options, raw) =>
		legacyExperiments().resolveOrGenerateTranslation(options, raw);

export function reviewEvaluationRun(
	run: Parameters<typeof Legacy.reviewEvaluationRun>[0],
) {
	return isSegmentInUnitsExperiment(run.manifest.experimentId)
		? undefined
		: legacyExperiments().reviewEvaluationRun(run);
}

/** The evaluator's metrics over a run, for experiments whose evaluator counts more than a contract pass. */
export function evaluationMetrics(
	run: Parameters<typeof segmentInUnitsMetrics>[0] & {
		readonly manifest: { readonly experimentId: string };
	},
) {
	return isSegmentInUnitsExperiment(run.manifest.experimentId)
		? segmentInUnitsMetrics(run)
		: undefined;
}

export async function evaluateExperiment(
	args: Parameters<typeof Legacy.evaluateExperiment>[0] & {
		/** Answer jev from the lab's cache only; a miss fails its case. `segment.inUnits` only. */
		readonly offline?: boolean;
	},
) {
	if (isSegmentInUnitsExperiment(args.experimentId)) {
		if (args.configuration)
			throw Error(
				`${args.experimentId} asks jev only; choose its version with --judgment-model`,
			);
		if (!args.judge)
			throw Error(`${args.experimentId} requires a judgment executor`);
		return evaluateSegmentInUnitsExperiment({
			experimentId: args.experimentId,
			judge: args.judge,
			...(args.judgmentConfiguration?.model
				? { judgmentModel: args.judgmentConfiguration.model }
				: {}),
			offline: args.offline ?? false,
			sourceRevision: args.sourceRevision,
			...(args.outputDirectory
				? { outputDirectory: args.outputDirectory }
				: {}),
			...(args.signal ? { signal: args.signal } : {}),
		});
	}
	if (args.offline)
		throw Error(
			`${args.experimentId} has no answer cache; --offline applies to segment.inUnits experiments`,
		);
	return legacyExperiments().evaluateExperiment(args);
}

/** Repository default; consumers can always supply a different output directory. */
export const defaultRunOutputDirectory = fileURLToPath(
	new URL("../../.runs/dumgen/", import.meta.resolve("dumgen/package.json")),
);
