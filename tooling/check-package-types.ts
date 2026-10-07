import { existsSync, realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
	hasProjectReferences,
	packageOwnFiles,
	splitTypeCheckOutput,
	typeCheckArgs,
	uncoveredFiles,
} from "./lib/package-types";
import { toolPaths } from "./lib/tools";
import { findRepositoryRoot } from "./lib/workspaces";

// Real, so it matches the real paths packageOwnFiles returns and git ls-files
// paths joined onto it do too.
const packageDir = realpathSync(process.cwd());
const repositoryRoot = await findRepositoryRoot(packageDir);
const tsconfig = "tsconfig.json";
const hasReferences = hasProjectReferences(
	Bun.JSONC.parse(await readFile(join(packageDir, tsconfig), "utf8")),
);

const child = Bun.spawn(
	typeCheckArgs({
		hasReferences,
		pretty: process.stdout.isTTY === true,
		tsconfig,
		typescriptPath: toolPaths(repositoryRoot).typescript,
	}),
	{
		cwd: packageDir,
		env: process.env,
		stdin: "inherit",
		stdout: "pipe",
		stderr: "inherit",
	},
);
const [output, exitCode] = await Promise.all([
	new Response(child.stdout).text(),
	child.exited,
]);
const { diagnostics, listedFiles } = splitTypeCheckOutput(output, existsSync);
if (diagnostics.length > 0) console.log(diagnostics.join("\n"));

const checkedFiles = packageOwnFiles(listedFiles, packageDir, realpathSync);
if (exitCode !== 0) {
	process.exitCode = exitCode;
} else if (checkedFiles.length === 0) {
	console.error(
		`${tsconfig} type-checked no files of this package. Give it "include" or "files", or "references" to projects that have them.`,
	);
	process.exitCode = 1;
} else {
	const uncovered = uncoveredFiles(await packageFiles(), checkedFiles);
	if (uncovered.length > 0) {
		console.error(
			[
				`These TypeScript files of this package are in none of the projects ${tsconfig} checks. Include each in one:`,
				...uncovered.map((file) => `  ${relative(packageDir, file)}`),
			].join("\n"),
		);
		process.exitCode = 1;
	} else {
		console.log(
			`Type-checked ${checkedFiles.length} package files (${hasReferences ? "tsc -b" : "tsc -p"}).`,
		);
	}
}

/** Tracked and untracked-but-not-ignored files under the package, as absolute paths. */
async function packageFiles(): Promise<string[]> {
	const git = Bun.spawn(
		["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
		{ cwd: packageDir, stdout: "pipe", stderr: "inherit" },
	);
	const [listing, gitExitCode] = await Promise.all([
		new Response(git.stdout).text(),
		git.exited,
	]);
	if (gitExitCode !== 0) {
		throw new Error(`git ls-files exited with ${gitExitCode}`);
	}
	return listing
		.split("\0")
		.filter((path) => path !== "")
		.map((path) => join(packageDir, path))
		.filter((file) => existsSync(file));
}
