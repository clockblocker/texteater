/**
 * knowledge.produce's evaluation sets (#887):
 *
 *   bun cli/knowledge.ts freeze
 *
 * Freezes dev (the Readings of Draft records with a Reading layer),
 * held-out (the Readings of records reviewed to Knowledge depth) and the
 * spot-check set (a seeded dev sample and #545's six slips) under
 * `.runs/knowledge/sets`, with the git commit and a hash of the cases; a
 * refreeze keeps the set it replaces under its hash. Runs, their price
 * and their re-scores go through `bun run evaluate --experiment
 * knowledge/de:<set>`.
 */
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { freezeKnowledgeSets } from "../src/evaluation/knowledge/cases.js";
import { defaultKnowledgeRoot } from "../src/evaluation/knowledge/experiment.js";

const repository = resolve(import.meta.dir, "../../..");

export async function runKnowledgeCli(
	argv: readonly string[],
	options: { readonly root?: string } = {},
) {
	const { positionals } = parseArgs({
		args: [...argv],
		allowPositionals: true,
	});
	if (positionals[0] !== "freeze")
		throw Error("Use `bun cli/knowledge.ts freeze`");
	const sets = await freezeKnowledgeSets(
		options.root ?? defaultKnowledgeRoot,
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
