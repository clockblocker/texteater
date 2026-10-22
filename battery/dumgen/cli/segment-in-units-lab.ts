/**
 * The German `segment.inUnits` lab: freezes the case sets, runs an arm with
 * repetitions, reports and compares runs, measures the noise floor and keeps
 * the ledger and the iteration table.
 *
 *   bun run segment-in-units-lab freeze [--force]
 *   bun run segment-in-units-lab run --arm pairwise --subset smoke --reps 1 [--opt render=tagged]
 *       [--parent <runId>] [--hypothesis "<one line>"] [--allow-dirty] [--model jev-1.13.0]
 *   bun run segment-in-units-lab replay --run <runId>
 *   bun run segment-in-units-lab report --run <runId> [--subset slice300]
 *   bun run segment-in-units-lab compare --left <runId>[:policy] --right <runId>[:policy]
 *       [--noise <noiseRunId>] [--record [--verdict "<text>"]]
 *   bun run segment-in-units-lab noise --run <runId> [--reps 3] [--offset 1000]
 *   bun run segment-in-units-lab sweep --run <runId> [--policy <baseline>] [--replay <runId>[:policy]]
 *   bun run segment-in-units-lab ledger [--table]
 *   bun run segment-in-units-lab round [--repin --reason "<why>"]
 *   bun run segment-in-units-lab round --open <id> --cap <tokens> --stop-line <tokens> [--note "<text>"]
 *
 * `run`, `noise` and `limit-qpc` count against the current round
 * (`lab/segmentation/harness/round.ts`): `--estimate` prices a run offline and stops, a live run
 * refuses to start when its projected spend would cross the round's stop
 * line or when dumcorpus's prompt inputs moved since the round was pinned
 * (`--repin` accepts today's dumcorpus), and every run stops at the line.
 *
 * Raw runs, their outcomes and the answer cache live under
 * `.runs/segment-in-units-lab/` (gitignored). The frozen sets, each run's
 * manifest and summary, and the ledger live under
 * `evidence/segment-in-units-lab/`.
 *
 * Each command lives in its module under `cli/segment-in-units-lab/`.
 */

import {
	currentSetHash,
	freezeSets,
} from "../lab/segmentation/harness/corpus.js";
import { compare } from "./segment-in-units-lab/compare.js";
import {
	positionals,
	repository,
	setsRoot,
	values,
} from "./segment-in-units-lab/context.js";
import { ledger, roundCommand } from "./segment-in-units-lab/ledger.js";
import { limitQuestionsPerCall } from "./segment-in-units-lab/limit-qpc.js";
import { replayRun } from "./segment-in-units-lab/replay.js";
import { report } from "./segment-in-units-lab/report.js";
import { noise, run } from "./segment-in-units-lab/run.js";
import { sweep } from "./segment-in-units-lab/sweep.js";

async function freeze() {
	for (const name of ["dev", "heldout"] as const)
		if (currentSetHash(setsRoot, name) !== undefined && !values.force)
			throw Error(`${name} is frozen already; pass --force to refreeze`);
	for (const set of await freezeSets(setsRoot, repository))
		console.log(
			`${set.name}: ${set.cases.length} cases (${set.cases.filter((labCase) => labCase.facts.coverage === "Full").length} Full), ${set.cases.reduce((total, labCase) => total + labCase.idealOutput.units.length, 0)} gold units, hash ${set.hash}, git ${set.gitHead.slice(0, 8)}, ${set.dirtyRecordFiles} uncommitted record files, withheld ${set.withheld?.join(", ") || "none"}`,
		);
}

const command = positionals[0];
if (command === "freeze") await freeze();
else if (command === "run") await run();
else if (command === "report") await report(values.run ?? "");
else if (command === "compare") await compare();
else if (command === "replay") await replayRun();
else if (command === "noise") await noise();
else if (command === "sweep") await sweep();
else if (command === "ledger") await ledger();
else if (command === "limit-qpc") await limitQuestionsPerCall();
else if (command === "round") await roundCommand();
else
	throw Error(
		"Commands: freeze, run, replay, report, compare, noise, sweep, ledger, round, limit-qpc",
	);
