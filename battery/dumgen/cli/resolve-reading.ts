/**
 * resolve.reading's evaluation sets (#873):
 *
 *   bun cli/resolve-reading.ts freeze
 *
 * freezes dev (the Draft records with the Reading layer) and held-out (the
 * records reviewed through Reading or deeper) under
 * `.runs/resolve-reading/sets`, with the git commit and a hash of the
 * cases; a refreeze keeps the set it replaces under its hash. Runs, their
 * price and their re-scores go through `bun run evaluate`.
 */
import { resolve } from "node:path";
import { freezeReadingSets } from "../src/evaluation/resolve-reading/cases.js";
import { defaultReadingRoot } from "../src/evaluation/resolve-reading/experiment.js";

const repository = resolve(import.meta.dir, "../../..");

export async function runResolveReadingCli(argv: readonly string[]) {
	const [command] = argv;
	if (command !== "freeze")
		throw Error("Use `bun cli/resolve-reading.ts freeze`");
	const sets = await freezeReadingSets(defaultReadingRoot, repository);
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
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
