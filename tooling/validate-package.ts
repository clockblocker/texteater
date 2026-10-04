/**
 * A package's policy stages: manifest policy and architecture
 * (dependency-cruiser). Turbo's `validate` task runs them after the package's
 * `check`, `lint`, `test` and `generate:check` tasks (turbo.json). Run outside Turbo, as
 * `bun validate` in a package, it hands that whole graph to Turbo.
 *
 * Unused files, exports and dependencies are not a stage here: whether an
 * export is used depends on the packages that import it, which a package's
 * Turbo cache key doesn't cover. `bun run knip` (tooling/knip.ts) checks them
 * against the whole repository.
 */
import { join } from "node:path";
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
// Turbo sets TURBO_HASH in every task it runs. Launched from a package
// directory, Turbo scopes the run to that package.
if (process.env.TURBO_HASH === undefined) {
	const turbo = Bun.spawn(
		[join(repositoryRoot, "node_modules/.bin/turbo"), "run", "validate"],
		{ cwd: packageDir, stdio: ["inherit", "inherit", "inherit"] },
	);
	process.exit(await turbo.exited);
}
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
