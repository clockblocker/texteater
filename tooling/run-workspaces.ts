import { reportFailures, runAll } from "./lib/process";
import {
	discoverWorkspaces,
	findRepositoryRoot,
	orderWorkspacesByDependencies,
	stringRecord,
} from "./lib/workspaces";

const script = process.argv[2];
if (!script) {
	console.error(
		"Usage: bun tooling/run-workspaces.ts <script> [--if-present]",
	);
	process.exit(2);
}
const ifPresent = process.argv.includes("--if-present");
const repositoryRoot = await findRepositoryRoot(process.cwd());
const workspaces = orderWorkspacesByDependencies(
	await discoverWorkspaces(repositoryRoot),
);
const commands = workspaces.flatMap((workspace) => {
	const scripts = stringRecord(workspace.manifest.scripts);
	if (!scripts[script]) {
		if (ifPresent) return [];
		return [
			{
				args: ["bun", "-e", `process.exit(1)`],
				cwd: workspace.dir,
				label: `${workspace.relativePath}: missing "${script}" script`,
			},
		];
	}
	return [
		{
			args: ["bun", "run", script],
			cwd: workspace.dir,
			label: `${workspace.relativePath}: ${script}`,
		},
	];
});
process.exitCode = reportFailures(await runAll(commands));
