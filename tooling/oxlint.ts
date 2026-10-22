/**
 * `bun run oxlint [oxlint options] [paths]`: Oxlint with the Effect
 * type-aware rules in the root `.oxlintrc.json`, outside CI for now.
 *
 * Bun runs a package script in its package's directory: at the repository
 * root Oxlint lints the whole repository, and inside a workspace only that
 * workspace. Oxlint runs in that directory with the root config passed
 * explicitly, since it only looks for a config in its working directory.
 * Extra arguments pass through to Oxlint; paths are relative to the scope's
 * directory. The run fails only when Oxlint reports an error.
 */
import { join } from "node:path";
import { toolPaths } from "./lib/tools";
import {
	discoverWorkspaces,
	findRepositoryRoot,
	workspaceScope,
} from "./lib/workspaces";

const repositoryRoot = await findRepositoryRoot(process.cwd());
const scope = workspaceScope(
	process.cwd(),
	repositoryRoot,
	await discoverWorkspaces(repositoryRoot),
);
const oxlint = Bun.spawn(
	[
		process.execPath,
		toolPaths(repositoryRoot).oxlint,
		"--config",
		join(repositoryRoot, ".oxlintrc.json"),
		...process.argv.slice(2),
	],
	{
		cwd: scope?.dir ?? repositoryRoot,
		stdio: ["inherit", "inherit", "inherit"],
	},
);
process.exit(await oxlint.exited);
