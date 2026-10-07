/**
 * resolve.reading's evaluation sets (#873):
 *
 *   bun cli/resolve-reading.ts freeze
 *   bun cli/resolve-reading.ts subset <baselineRunId> [--seed N] [--guard N] [--out <file>]
 *
 * `freeze` freezes dev (the Draft records with the Reading layer) and
 * held-out (the records reviewed through Reading or deeper) into the
 * tracked `evidence/resolve-reading/sets`, with the git commit and a hash
 * of the cases; a refreeze keeps the set it replaces under its hash.
 *
 * `subset` freezes a round's subset of dev from a saved whole-set baseline
 * run (`subset.ts`): the cases with an attempt that was not right, and a
 * seeded guard of the cases right throughout, stratified by route, into
 * `evidence/resolve-reading/round-2-subset.json`. Runs, their price and
 * their re-scores go through `bun run evaluate`, `--subset` taking that
 * file.
 */
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { messageOf } from "common-utils";
import type { OperationEvaluationRun } from "promptsmith/evaluation";
import { loadRun } from "promptsmith/storage";
import {
	freezeReadingSets,
	loadReadingSet,
	trackedReadingSetsRoot,
} from "../lab/evaluation/resolve-reading/cases.js";
import { readingAttempts } from "../lab/evaluation/resolve-reading/experiment.js";
import {
	readingSubsetCaseIds,
	saveReadingSubset,
	selectReadingSubset,
} from "../lab/evaluation/resolve-reading/subset.js";
import { defaultRunOutputDirectory } from "../lab/run-directory.js";

const repository = resolve(import.meta.dir, "../../..");
const defaultReadingSubsetPath = resolve(
	import.meta.dir,
	"../evidence/resolve-reading/round-2-subset.json",
);

async function runResolveReadingCli(
	argv: readonly string[],
	options: {
		runDirectory?: string;
		subsetPath?: string;
		setsRoot?: string;
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
	const [command, runId] = positionals;
	const root = options.setsRoot ?? trackedReadingSetsRoot;
	if (command === "subset") {
		if (!runId)
			throw Error(
				"Use `bun cli/resolve-reading.ts subset <baselineRunId>`",
			);
		const loaded = await loadRun(
			options.runDirectory ?? defaultRunOutputDirectory,
			runId,
		);
		if (loaded.manifest.version !== 2)
			throw Error("The run is an operation run (manifest version 2)");
		const run = loaded as OperationEvaluationRun;
		const settings = run.manifest.configurations.judgment.settings as {
			setHash?: string;
			caseFilter?: unknown;
		};
		if (!settings.setHash || settings.caseFilter)
			throw Error(
				"The subset is read from a whole-set resolve.reading run",
			);
		const set = await loadReadingSet(root, "dev");
		if (set.hash !== settings.setHash)
			throw Error(
				`The baseline ran on set ${settings.setHash}, not the frozen ${set.hash}`,
			);
		const subset = selectReadingSubset({
			baselineRunId: run.manifest.runId,
			experimentId: run.manifest.experimentId,
			setHash: settings.setHash,
			attempts: readingAttempts(run),
			seed: Number(values.seed ?? 877),
			guardSize: Number(values.guard ?? 200),
		});
		await saveReadingSubset(
			values.out
				? resolve(values.out)
				: (options.subsetPath ?? defaultReadingSubsetPath),
			subset,
		);
		const ids = readingSubsetCaseIds(subset);
		const routes = (caseIds: readonly string[]) => {
			const routeOf = new Map(
				set.cases.map(({ id, attestation }) => [
					id,
					`${attestation.surface.lemma.family}/${attestation.surface.lemma.kind}`,
				]),
			);
			const counts: Record<string, number> = {};
			for (const id of caseIds) {
				const route = routeOf.get(id) ?? "?";
				counts[route] = (counts[route] ?? 0) + 1;
			}
			return counts;
		};
		const summary = {
			baselineRunId: subset.baselineRunId,
			seed: subset.seed,
			missed: ids.missed.length,
			guard: ids.guard.length,
			missedByRoute: routes(ids.missed),
			guardByRoute: routes(ids.guard),
		};
		console.log(JSON.stringify(summary, null, 2));
		return summary;
	}
	if (command !== "freeze")
		throw Error(
			"Use `bun cli/resolve-reading.ts freeze` or `bun cli/resolve-reading.ts subset <baselineRunId>`",
		);
	const sets = await freezeReadingSets(root, repository);
	const summary = sets.map(
		({ name, hash, gitHead, dirtyRecordFiles, cases }) => ({
			name,
			hash,
			gitHead,
			dirtyRecordFiles,
			cases: cases.length,
			records: new Set(cases.map(({ record }) => record)).size,
			authored: cases.filter(({ authored }) => authored).length,
			folded: cases.filter(({ rejected }) => rejected.length > 0).length,
		}),
	);
	console.log(JSON.stringify(summary, null, 2));
	return summary;
}

if (import.meta.main)
	runResolveReadingCli(process.argv.slice(2)).catch((error) => {
		console.error(messageOf(error));
		process.exitCode = 1;
	});
