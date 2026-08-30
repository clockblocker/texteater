import { join } from "node:path";
import { biomeFormatAndAssistArgs } from "./lib/biome-validation";
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
		args: [
			"bun",
			join(repositoryRoot, "tooling/documentation-integrity.ts"),
		],
		cwd: repositoryRoot,
		label: "documentation integrity",
	},
	{
		args: ["bun", "test", join(repositoryRoot, "tooling")],
		cwd: repositoryRoot,
		label: "tooling tests",
	},
	{
		args: biomeFormatAndAssistArgs({
			biomePath: tools.biome,
			configPath: join(repositoryRoot, "tooling/biome/base.json"),
			scope: join(repositoryRoot, "tooling"),
		}),
		cwd: repositoryRoot,
		label: "tooling format and assists",
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
			tools.typescript,
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
