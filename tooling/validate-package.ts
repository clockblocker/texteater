import { join } from "node:path";
import { biomeFormatAndAssistArgs } from "./lib/biome-validation";
import { validateManifestPolicy } from "./lib/manifest-policy";
import { type Command, reportFailures, runAll } from "./lib/process";
import { conventionalArchitectureInputs } from "./lib/source-import-policy";
import { toolPaths } from "./lib/tools";
import { findRepositoryRoot, readJson, stringRecord } from "./lib/workspaces";

if (process.env.TOOLING_VALIDATE_ACTIVE === "1") {
	console.error(
		"Recursive validation detected. A validate:* override must not invoke bun validate.",
	);
	process.exit(1);
}

const packageDir = process.cwd();
const repositoryRoot = await findRepositoryRoot(packageDir);
const manifest = await readJson(join(packageDir, "package.json"));
const scripts = stringRecord(manifest.scripts);
const tools = toolPaths(repositoryRoot);
const manifestIssues = await validateManifestPolicy({
	cwd: packageDir,
	mode: "package",
});

if (manifestIssues.length > 0) {
	console.error("Package manifest policy failed:");
	for (const issue of manifestIssues) {
		console.error(`- ${issue.location}: ${issue.message}`);
	}
} else {
	console.log("Package manifest policy passed.");
}

function overrideOrDefault(stage: string, defaultArgs: string[]): Command {
	const override = scripts[`validate:${stage}`];
	return {
		args: override ? ["bun", "run", `validate:${stage}`] : defaultArgs,
		cwd: packageDir,
		env: { TOOLING_VALIDATE_ACTIVE: "1" },
		label: `${manifest.name ?? packageDir}: ${stage}${
			override ? " (override)" : ""
		}`,
	};
}

const commands = [
	overrideOrDefault(
		"format",
		biomeFormatAndAssistArgs({
			biomePath: tools.biome,
			scope: ".",
		}),
	),
	overrideOrDefault("lint", ["bun", tools.biome, "lint", "."]),
	overrideOrDefault("types", [
		"bun",
		tools.typescript,
		"-p",
		"tsconfig.json",
		"--noEmit",
	]),
	overrideOrDefault("test", [
		"bun",
		join(repositoryRoot, "tooling/run-package-tests.ts"),
	]),
	overrideOrDefault("dependencies", [
		"bun",
		tools.knip,
		"--config",
		join(repositoryRoot, "tooling/knip-package.ts"),
		"--no-config-hints",
		"--dependencies",
	]),
	overrideOrDefault("architecture", [
		"bun",
		tools.dependencyCruiser,
		"--config",
		join(repositoryRoot, "tooling/dependency-cruiser.package.cjs"),
		"--ts-config",
		"tsconfig.json",
		"--",
		...conventionalArchitectureInputs(packageDir),
	]),
];

const results = await runAll(commands);
process.exitCode =
	manifestIssues.length > 0 || reportFailures(results) !== 0 ? 1 : 0;
