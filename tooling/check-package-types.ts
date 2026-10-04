import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	hasProjectReferences,
	packageOwnFiles,
	splitTypeCheckOutput,
	typeCheckArgs,
} from "./lib/package-types";
import { toolPaths } from "./lib/tools";
import { findRepositoryRoot } from "./lib/workspaces";

const packageDir = process.cwd();
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

const checkedFiles = packageOwnFiles(listedFiles, packageDir).length;
if (exitCode !== 0) {
	process.exitCode = exitCode;
} else if (checkedFiles === 0) {
	console.error(
		`${tsconfig} type-checked no files of this package. Give it "include" or "files", or "references" to projects that have them.`,
	);
	process.exitCode = 1;
} else {
	console.log(
		`Type-checked ${checkedFiles} package files (${hasReferences ? "tsc -b" : "tsc -p"}).`,
	);
}
