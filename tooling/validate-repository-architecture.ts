import { join } from "node:path";
import { reportFailures, runAll } from "./lib/process";
import { validateSourceImports } from "./lib/source-import-policy";
import { toolPaths } from "./lib/tools";
import { discoverWorkspaces, findRepositoryRoot } from "./lib/workspaces";

const repositoryRoot = await findRepositoryRoot(process.cwd());
const workspaces = await discoverWorkspaces(repositoryRoot);
const importIssues = await validateSourceImports({
	repositoryRoot,
	workspaces,
});
if (importIssues.length > 0) {
	console.error("Cross-workspace import policy failed:");
	for (const issue of importIssues) {
		console.error(`- ${issue.file}: ${issue.message} (${issue.specifier})`);
	}
} else {
	console.log("Cross-workspace import policy passed.");
}

const tools = toolPaths(repositoryRoot);
const results = await runAll([
	{
		args: [
			"bun",
			tools.dependencyCruiser,
			"--config",
			join(repositoryRoot, "tooling/dependency-cruiser.repository.cjs"),
			"--",
			"app",
			"battery",
		],
		cwd: repositoryRoot,
		label: "repository dependency-cruiser rules",
	},
]);
process.exitCode =
	importIssues.length > 0 || reportFailures(results) !== 0 ? 1 : 0;
