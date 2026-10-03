/**
 * resolve.grammar's evaluation sets (#873):
 *
 *   bun cli/resolve-grammar.ts freeze
 *
 * freezes dev (the Draft records with the Attestation layer) and held-out
 * (the records reviewed through Attestation or deeper) under
 * `.runs/resolve-grammar/sets`, with the git commit and a hash of the
 * cases; a refreeze keeps the set it replaces under its hash. Runs, their
 * price and their re-scores go through `bun run evaluate`.
 */
import { resolve } from "node:path";
import { freezeGrammarSets } from "../src/evaluation/resolve-grammar/cases.js";
import { defaultGrammarRoot } from "../src/evaluation/resolve-grammar/experiment.js";

const repository = resolve(import.meta.dir, "../../..");

export async function runResolveGrammarCli(argv: readonly string[]) {
	const [command] = argv;
	if (command !== "freeze")
		throw Error("Use `bun cli/resolve-grammar.ts freeze`");
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
