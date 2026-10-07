/**
 * knowledge.produce's evaluation sets and round subsets (#887):
 *
 *   bun cli/knowledge.ts freeze
 *   bun cli/knowledge.ts subset <baselineRunId> --out <file> [--seed N] [--guard N]
 *   bun cli/knowledge.ts compare <subsetFile> <runId>
 *
 * Freezes dev (the Readings of Draft records with a Reading layer),
 * held-out (the Readings of records reviewed to Knowledge depth) and the
 * spot-check set (a seeded dev sample and #545's six slips) into the
 * tracked `evidence/knowledge/sets`, with the git commit and a hash of the
 * cases; a refreeze keeps the set it replaces under its hash. Runs, their price
 * and their re-scores go through `bun run evaluate --experiment
 * knowledge/de:<set>`, `--gold-only` keeping the cases with gold and
 * `--subset <file>` a round's subset.
 *
 * `subset` freezes a round's subset of dev from a saved gold-only baseline
 * run (`subset.ts`): its missed cases and a seeded guard. `compare` reads a
 * run on that subset against its baseline on the same case ids.
 */
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import type { OperationEvaluationRun } from "promptsmith/evaluation";
import { loadRun } from "promptsmith/storage";
import {
	freezeKnowledgeSets,
	loadKnowledgeSet,
	trackedKnowledgeSetsRoot,
} from "../lab/evaluation/knowledge/cases.js";
import { knowledgeAttempts } from "../lab/evaluation/knowledge/experiment.js";
import {
	compareKnowledgeRuns,
	knowledgeSubsetCaseIds,
	loadKnowledgeSubset,
	saveKnowledgeSubset,
	selectKnowledgeSubset,
} from "../lab/evaluation/knowledge/subset.js";
import { defaultRunOutputDirectory } from "../lab/run-directory.js";

const repository = resolve(import.meta.dir, "../../..");

async function runKnowledgeCli(
	argv: readonly string[],
	options: {
		readonly setsRoot?: string;
		readonly runDirectory?: string;
	} = {},
) {
	const { positionals, values } = parseArgs({
		args: [...argv],
		allowPositionals: true,
		options: {
			seed: { type: "string" },
			guard: { type: "string" },
			out: { type: "string" },
		},
	});
	const [command, first, second] = positionals;
	const runDirectory = options.runDirectory ?? defaultRunOutputDirectory;
	const operationRun = async (runId: string) => {
		const loaded = await loadRun(runDirectory, runId);
		if (loaded.manifest.version !== 2)
			throw Error("The run is an operation run (manifest version 2)");
		return loaded as OperationEvaluationRun;
	};
	if (command === "subset") {
		if (!first || !values.out)
			throw Error(
				"Use `bun cli/knowledge.ts subset <baselineRunId> --out <file>`",
			);
		const run = await operationRun(first);
		const settings = run.manifest.configurations.judgment.settings as {
			set?: string;
			setHash?: string;
			subset?: unknown;
		};
		if (settings.set !== "dev" || !settings.setHash || settings.subset)
			throw Error("The subset is read from a whole dev run");
		const set = await loadKnowledgeSet(
			options.setsRoot ?? trackedKnowledgeSetsRoot,
			"dev",
		);
		if (set.hash !== settings.setHash)
			throw Error(
				`The baseline ran on set ${settings.setHash}, not the frozen ${set.hash}`,
			);
		const subset = selectKnowledgeSubset({
			baselineRunId: run.manifest.runId,
			experimentId: run.manifest.experimentId,
			setHash: settings.setHash,
			attempts: knowledgeAttempts(run),
			seed: Number(values.seed ?? 887),
			guardSize: Number(values.guard ?? 60),
		});
		await saveKnowledgeSubset(resolve(values.out), subset);
		const ids = knowledgeSubsetCaseIds(subset);
		const aspects: Record<string, number> = {};
		for (const missed of Object.values(subset.missed))
			for (const aspect of missed)
				aspects[aspect] = (aspects[aspect] ?? 0) + 1;
		const summary = {
			baselineRunId: subset.baselineRunId,
			seed: subset.seed,
			missed: ids.missed.length,
			guard: ids.guard.length,
			missedByAspect: aspects,
			guardByRoute: Object.fromEntries(
				Object.entries(subset.guard).map(([route, caseIds]) => [
					route,
					caseIds.length,
				]),
			),
		};
		console.log(JSON.stringify(summary, null, 2));
		return summary;
	}
	if (command === "compare") {
		if (!first || !second)
			throw Error(
				"Use `bun cli/knowledge.ts compare <subsetFile> <runId>`",
			);
		const subset = loadKnowledgeSubset(resolve(first));
		const comparison = compareKnowledgeRuns(
			subset,
			knowledgeAttempts(await operationRun(subset.baselineRunId)),
			knowledgeAttempts(await operationRun(second)),
		);
		console.log(JSON.stringify(comparison, null, 2));
		return comparison;
	}
	if (command !== "freeze")
		throw Error(
			"Use `bun cli/knowledge.ts freeze`, `subset <baselineRunId> --out <file>` or `compare <subsetFile> <runId>`",
		);
	const sets = await freezeKnowledgeSets(
		options.setsRoot ?? trackedKnowledgeSetsRoot,
		repository,
	);
	const summary = sets.map(
		({ name, hash, gitHead, dirtyRecordFiles, cases, slips }) => ({
			name,
			hash,
			gitHead,
			dirtyRecordFiles,
			cases: cases.length,
			withGold: cases.filter(({ gold }) => gold !== undefined).length,
			authored: cases.filter(({ authored }) => authored).length,
			routes: Object.fromEntries(
				[
					...cases.reduce((counts, { reading }) => {
						const route = `${reading.lemma.family}/${reading.lemma.kind}`;
						counts.set(route, (counts.get(route) ?? 0) + 1);
						return counts;
					}, new Map<string, number>()),
				].sort((left, right) => right[1] - left[1]),
			),
			...(slips ? { slips: slips.length } : {}),
		}),
	);
	console.log(JSON.stringify(summary, null, 2));
	return summary;
}

if (import.meta.main)
	runKnowledgeCli(process.argv.slice(2)).catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
