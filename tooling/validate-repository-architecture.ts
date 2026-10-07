/**
 * `bun run validate:imports`: the source import policy and the repository's
 * dependency-cruiser layer rules. At the repository root every finding
 * counts. Inside a workspace, only findings that touch that workspace do:
 * imports from it, imports into it, and cycles through it.
 */
import { join } from "node:path";
import { reportFailures, runAll } from "./lib/process";
import {
	conventionalArchitectureInputs,
	validateSourceImports,
} from "./lib/source-import-policy";
import { toolPaths } from "./lib/tools";
import {
	discoverWorkspaces,
	findRepositoryRoot,
	workspaceScope,
} from "./lib/workspaces";

const repositoryRoot = await findRepositoryRoot(process.cwd());
const workspaces = await discoverWorkspaces(repositoryRoot);
const scope = workspaceScope(process.cwd(), repositoryRoot, workspaces);
const label = scope?.relativePath ?? "the repository";
const importIssues = await validateSourceImports({
	repositoryRoot,
	scope: scope?.relativePath,
	workspaces,
});
if (importIssues.length > 0) {
	console.error(`Import policy failed for ${label}:`);
	for (const issue of importIssues) {
		console.error(`- ${issue.file}: ${issue.message} (${issue.specifier})`);
	}
} else {
	console.log(`Import policy passed for ${label}.`);
}

const escapeRegExp = (path: string) =>
	path.replaceAll("\\", "/").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const tools = toolPaths(repositoryRoot);
const results = await runAll([
	{
		args: [
			"bun",
			tools.dependencyCruiser,
			"--config",
			join(repositoryRoot, "tooling/dependency-cruiser.repository.cjs"),
			// Keeps the scope's modules and their direct neighbours, so edges
			// into the workspace are checked along with edges out of it.
			...(scope
				? ["--focus", `^${escapeRegExp(scope.relativePath)}/`]
				: []),
			"--",
			...workspaces.flatMap((workspace) =>
				conventionalArchitectureInputs(workspace.dir).map((input) =>
					join(workspace.relativePath, input),
				),
			),
		],
		cwd: repositoryRoot,
		label: `repository dependency-cruiser rules for ${label}`,
	},
]);
process.exitCode =
	importIssues.length > 0 || reportFailures(results) !== 0 ? 1 : 0;
