/**
 * `bun run knip`: unused files, exports (entry exports included), types and
 * dependencies, checked against `tooling/knip-baseline.json`.
 *
 * Knip always analyzes the whole repository with `tooling/knip.config.ts`,
 * so an export another workspace imports counts as used. A name a package's
 * public entry point exports counts as used only when another workspace
 * uses it through that entry (#419): the package's own tests, codegen and
 * internal files don't keep it public. Bun runs a package script in its
 * package's directory: at the repository root every finding counts, and
 * inside a workspace only that workspace's findings do.
 *
 * A finding missing from the baseline fails the run. A baseline line knip no
 * longer reports is listed so the baseline can shrink; `--update-baseline`
 * rewrites the baseline for the run's scope.
 */
import { join } from "node:path";
import {
	compareWithBaseline,
	type Findings,
	findingsOf,
	updatedBaseline,
} from "./lib/knip";
import { runKnip } from "./lib/knip-run";
import { toolPaths } from "./lib/tools";
import {
	discoverWorkspaces,
	findRepositoryRoot,
	workspaceScope,
} from "./lib/workspaces";

const args = process.argv.slice(2);
const update = args.includes("--update-baseline");
if (args.some((arg) => arg !== "--update-baseline")) {
	console.error("Usage: bun run knip [--update-baseline]");
	process.exit(2);
}

const repositoryRoot = await findRepositoryRoot(process.cwd());
const workspaces = await discoverWorkspaces(repositoryRoot);
const workspacePaths = workspaces.map((workspace) => workspace.relativePath);
const scope = workspaceScope(
	process.cwd(),
	repositoryRoot,
	workspaces,
)?.relativePath;
const baselineName = "tooling/knip-baseline.json";
const baselinePath = join(repositoryRoot, baselineName);
const tools = toolPaths(repositoryRoot);

const found = findingsOf(
	await runKnip(repositoryRoot, workspaces),
	workspacePaths,
);
const baseline = (await Bun.file(baselinePath).json()) as Findings;
const label = scope ?? "the repository";

if (update) {
	await Bun.write(
		baselinePath,
		JSON.stringify(updatedBaseline(found, baseline, scope)),
	);
	const format = Bun.spawn(
		[
			process.execPath,
			tools.biome,
			"format",
			"--config-path",
			join(repositoryRoot, "tooling/biome/base.json"),
			"--write",
			baselinePath,
		],
		{ cwd: repositoryRoot, stdout: "ignore", stderr: "inherit" },
	);
	if ((await format.exited) !== 0) process.exit(1);
	console.log(`Rewrote ${baselineName} for ${label}.`);
	process.exit(0);
}

const { added, removed } = compareWithBaseline(found, baseline, scope);
const count = (findings: Findings) =>
	Object.values(findings).reduce((total, lines) => total + lines.length, 0);
const print = (findings: Findings, write: (line: string) => void) => {
	for (const [workspace, lines] of Object.entries(findings)) {
		write(`  ${workspace}`);
		for (const line of lines) write(`    ${line}`);
	}
};

if (count(removed) > 0) {
	console.log(
		`${count(removed)} ${baselineName} lines are no longer reported; shrink it with \`bun run knip --update-baseline\`:`,
	);
	print(removed, console.log);
}
if (count(added) > 0) {
	console.error(
		`knip found ${count(added)} unused files, exports or dependencies in ${label} that ${baselineName} doesn't list:`,
	);
	print(added, console.error);
	console.error(
		"Delete them, declare a real entry point in the workspace's knip.json, or, for a finding that must stay, run `bun run knip --update-baseline`. A finding on a package's public entry means no other workspace uses that name through it: drop it from the entry, or delete it if nothing inside uses it either.",
	);
	process.exit(1);
}
const known = count(compareWithBaseline(found, {}, scope).added);
console.log(
	`knip passed for ${label}: ${known} findings, all in ${baselineName}.`,
);
