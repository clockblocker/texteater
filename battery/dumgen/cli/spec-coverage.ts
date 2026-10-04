/**
 * Prints, for each prompt projected from the Spec Records, its case counts,
 * exclusions, skips and the records dumcorpus leaves out, split by Reviewed
 * and Draft. `--list <n>` lists the records of every group of at most n.
 */
import { parseArgs } from "node:util";
import {
	coverageOf,
	formatCoverage,
} from "../src/evaluation/spec-corpus/coverage.js";
import { loadGold } from "../src/evaluation/spec-corpus/gold.js";
import { projectCorpus } from "../src/evaluation/spec-corpus/projection.js";
import { segmentInUnits } from "../src/evaluation/spec-corpus/segment-in-units.js";

const { values } = parseArgs({
	args: Bun.argv.slice(2),
	options: { list: { type: "string", default: "8" } },
});
const gold = loadGold();
for (const projection of [segmentInUnits])
	process.stdout.write(
		formatCoverage(
			coverageOf(
				projectCorpus(projection, gold),
				gold,
				projection.language,
			),
			Number(values.list),
		),
	);
