import { ciGates } from "./lib/ci-gates";
import { reportFailures, runAll } from "./lib/process";
import { findRepositoryRoot } from "./lib/workspaces";

const requested = process.argv[2];
const gates = requested
	? ciGates.filter((gate) => gate.name === requested)
	: ciGates;
if (gates.length === 0) {
	const names = ciGates.map((gate) => gate.name).join(", ");
	console.error(`Usage: bun tooling/ci.ts [${names}]`);
	process.exit(2);
}

const repositoryRoot = await findRepositoryRoot(process.cwd());
const results = await runAll(
	gates.map((gate) => ({
		args: [...gate.args],
		cwd: repositoryRoot,
		label: gate.name,
	})),
);
process.exitCode = reportFailures(results);
