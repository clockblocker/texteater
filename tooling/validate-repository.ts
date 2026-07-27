import { join } from "node:path";
import { reportFailures, runAll } from "./lib/process";
import { toolPaths } from "./lib/tools";
import { discoverWorkspaces, findRepositoryRoot } from "./lib/workspaces";

const repositoryRoot = await findRepositoryRoot(process.cwd());
const workspaces = await discoverWorkspaces(repositoryRoot);
const tools = toolPaths(repositoryRoot);
const commands = [
	{
		args: [
			"bun",
			join(repositoryRoot, "tooling/manifest-policy.ts"),
			"repository",
		],
		cwd: repositoryRoot,
		label: "repository manifest policy",
	},
	{
		args: [
			"bun",
			join(repositoryRoot, "tooling/validate-repository-architecture.ts"),
		],
		cwd: repositoryRoot,
		label: "repository dependency architecture",
	},
	{
		args: ["bun", "test", join(repositoryRoot, "tooling")],
		cwd: repositoryRoot,
		label: "tooling tests",
	},
	{
		args: [
			"bun",
			tools.biome,
			"format",
			"--config-path",
			join(repositoryRoot, "tooling/biome/base.json"),
			join(repositoryRoot, "tooling"),
		],
		cwd: repositoryRoot,
		label: "tooling format",
	},
	{
		args: [
			"bun",
			tools.biome,
			"lint",
			"--config-path",
			join(repositoryRoot, "tooling/biome/base.json"),
			join(repositoryRoot, "tooling"),
		],
		cwd: repositoryRoot,
		label: "tooling lint",
	},
	{
		args: [
			"bun",
			tools.tsgo,
			"-p",
			join(repositoryRoot, "tooling/tsconfig.json"),
			"--noEmit",
		],
		cwd: repositoryRoot,
		label: "tooling types",
	},
	...workspaces.map((workspace) => ({
		args: ["bun", "validate"],
		cwd: workspace.dir,
		label: `${workspace.relativePath}: validate`,
	})),
];
process.exitCode = reportFailures(await runAll(commands));
