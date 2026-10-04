import { ciGates } from "./lib/ci-gates";
import { reportFailures, runAll } from "./lib/process";
import { findRepositoryRoot } from "./lib/workspaces";

const requested = process.argv.slice(2);
const names = new Set<string>(ciGates.map((gate) => gate.name));
if (requested.some((name) => !names.has(name))) {
	console.error(`Usage: bun tooling/ci.ts [${[...names].join(" | ")}]...`);
	process.exit(2);
}
const gates =
	requested.length > 0
		? ciGates.filter((gate) => requested.includes(gate.name))
		: ciGates;

const repositoryRoot = await findRepositoryRoot(process.cwd());
const results = await runAll(
	gates.map((gate) => ({
		args: [...gate.args],
		cwd: repositoryRoot,
		label: gate.name,
	})),
);
process.exitCode = reportFailures(results);
