/**
 * resolve.grammar's evaluation sets (#873):
 *
 *   bun cli/resolve-grammar.ts freeze
 *   bun cli/resolve-grammar.ts subset <baselineRunId> [--seed N] [--guard N]
 *
 * `freeze` freezes dev (the Draft records with the Attestation layer) and
 * held-out (the records reviewed through Attestation or deeper) under
 * `.runs/resolve-grammar/sets`, with the git commit and a hash of the
 * cases; a refreeze keeps the set it replaces under its hash.
 *
 * `subset` freezes a round's subset of dev from a saved baseline run
 * (`subset.ts`): the cases that missed a line in any repetition, and a
 * seeded guard of passed cases stratified by route, into
 * `evidence/resolve-grammar/round-2-subset.json`. Runs, their price and
 * their re-scores go through `bun run evaluate`, `--subset` taking that
 * file.
 */
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import type { OperationEvaluationRun } from "promptsmith/evaluation";
import { loadRun } from "promptsmith/storage";
import { defaultRunOutputDirectory } from "../src/development.js";
import {
	freezeGrammarSets,
	loadGrammarSet,
} from "../src/evaluation/resolve-grammar/cases.js";
import {
	defaultGrammarRoot,
	grammarAttempts,
} from "../src/evaluation/resolve-grammar/experiment.js";
import {
	saveSubset,
	selectSubset,
	subsetCaseIds,
} from "../src/evaluation/resolve-grammar/subset.js";

const repository = resolve(import.meta.dir, "../../..");
export const defaultSubsetPath = resolve(
	import.meta.dir,
	"../evidence/resolve-grammar/round-2-subset.json",
);

export async function runResolveGrammarCli(
	argv: readonly string[],
	options: { runDirectory?: string; subsetPath?: string } = {},
) {
	const { positionals, values } = parseArgs({
		args: [...argv],
		allowPositionals: true,
		options: {
			seed: { type: "string" },
			guard: { type: "string" },
		},
	});
	const [command, runId] = positionals;
	if (command === "subset") {
		if (!runId)
			throw Error(
				"Use `bun cli/resolve-grammar.ts subset <baselineRunId>`",
			);
		const loaded = await loadRun(
			options.runDirectory ?? defaultRunOutputDirectory,
			runId,
		);
		if (loaded.manifest.version !== 2)
			throw Error(
				"The baseline is an operation run (manifest version 2)",
			);
		const run = loaded as OperationEvaluationRun;
		const settings = run.manifest.configurations.judgment.settings as {
			setHash?: string;
			caseFilter?: unknown;
		};
		if (!settings.setHash || settings.caseFilter)
			throw Error(
				"The baseline is a whole-set resolve.grammar run with its set hash",
			);
		const set = await loadGrammarSet(defaultGrammarRoot, "dev");
		if (set.hash !== settings.setHash)
			throw Error(
				`The baseline ran on set ${settings.setHash}, not the frozen ${set.hash}`,
			);
		const scored = new Set(
			set.cases
				.filter(({ ideal }) => "valencyEvidence" in ideal)
				.map(({ id }) => id),
		);
		const subset = selectSubset({
			scoresValency: (caseId) => scored.has(caseId),
			baselineRunId: run.manifest.runId,
			experimentId: run.manifest.experimentId,
			setHash: settings.setHash,
			attempts: grammarAttempts(run),
			seed: Number(values.seed ?? 876),
			guardSize: Number(values.guard ?? 200),
		});
		await saveSubset(options.subsetPath ?? defaultSubsetPath, subset);
		const ids = subsetCaseIds(subset);
		const summary = {
			baselineRunId: subset.baselineRunId,
			seed: subset.seed,
			missed: ids.missed.length,
			guard: ids.guard.length,
		};
		console.log(JSON.stringify(summary, null, 2));
		return summary;
	}
	if (command !== "freeze")
		throw Error(
			"Use `bun cli/resolve-grammar.ts freeze` or `bun cli/resolve-grammar.ts subset <baselineRunId>`",
		);
	const sets = await freezeGrammarSets(defaultGrammarRoot, repository);
	const summary = sets.map(
		({ name, hash, gitHead, dirtyRecordFiles, cases }) => ({
			name,
			hash,
			gitHead,
			dirtyRecordFiles,
			cases: cases.length,
			records: new Set(cases.map(({ record }) => record)).size,
		}),
	);
	console.log(JSON.stringify(summary, null, 2));
	return summary;
}

if (import.meta.main)
	runResolveGrammarCli(process.argv.slice(2)).catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
