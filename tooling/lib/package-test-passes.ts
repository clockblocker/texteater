import { readdirSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";

/**
 * A DOM test file opts into a DOM (tf-demo's `import "./support/dom";`),
 * whose globals would outlive the file in Bun's shared run. Its name says so,
 * and the shared runner runs such files in their own `bun test` process
 * (#1135).
 */
const domTestFile = /\.dom\.test\.[cm]?[jt]sx?$/;
const domTestFileIgnorePattern = "**/*.dom.test.*";

// Bun's test-file names.
const testFile = /[._](test|spec)\.[cm]?[jt]sx?$/;

// `bun test` options whose value may follow as the next argument. Options
// with an optional value (`--bail`, `--changed`, `--parallel`) take `=`.
const optionsWithValue = new Set([
	"--coverage-dir",
	"--coverage-reporter",
	"--max-concurrency",
	"--parallel-delay",
	"--path-ignore-patterns",
	"--preload",
	"--reporter",
	"--reporter-outfile",
	"--rerun-each",
	"--retry",
	"--seed",
	"--shard",
	"--test-name-pattern",
	"--timeout",
	"--timings",
	"-t",
]);

export function isDomTestFile(path: string): boolean {
	return domTestFile.test(path);
}

/**
 * Test files under `cwd`, relative to it. Like `bun test`, it skips
 * `node_modules` and hidden directories (Dumgen's `.runs` holds 130k files).
 */
export function findTestFiles(cwd: string, directory = ""): string[] {
	return readdirSync(join(cwd, directory), { withFileTypes: true })
		.flatMap((entry) => {
			const path =
				directory === "" ? entry.name : join(directory, entry.name);
			if (entry.isDirectory())
				return entry.name === "node_modules" ||
					entry.name.startsWith(".")
					? []
					: findTestFiles(cwd, path);
			return entry.isFile() && testFile.test(entry.name) ? [path] : [];
		})
		.sort();
}

function splitArguments(args: string[]): {
	filters: string[];
	options: string[];
} {
	const filters: string[] = [];
	const options: string[] = [];
	for (let index = 0; index < args.length; index++) {
		const arg = args[index] as string;
		if (!arg.startsWith("-")) {
			filters.push(arg);
			continue;
		}
		options.push(arg);
		const value = args[index + 1];
		if (optionsWithValue.has(arg) && value !== undefined) {
			options.push(value);
			index++;
		}
	}
	return { filters, options };
}

/**
 * The `bun test` argument lists for one run of a workspace's tests: the main
 * pass, which never loads a DOM test file, then the DOM pass. The DOM pass
 * runs `--isolate`, so each DOM file registers its own DOM and its own
 * cleanup hooks (a support module loads once per registry, so a shared run
 * would hook only the first file); that costs about 15 ms a file. `args` are the
 * runner's forwarded arguments, and `testFiles` the workspace's test files
 * relative to `cwd`. Path filters pick files the way `bun test` does, by
 * substring. A pass with no matching file is left out, unless neither pass
 * matches: the main pass then runs anyway, so Bun's no-match exit fails the
 * run (#999).
 */
export function planTestPasses(
	args: string[],
	testFiles: string[],
	cwd: string,
): string[][] {
	const { filters, options } = splitArguments(args);
	const needles = filters.map((filter) =>
		(isAbsolute(filter) ? relative(cwd, filter) : filter).replace(
			/^(\.\/)+/,
			"",
		),
	);
	const selected = testFiles.filter(
		(path) =>
			needles.length === 0 ||
			needles.some((needle) => path.includes(needle)),
	);
	const domFiles = selected.filter(isDomTestFile);
	const passes: string[][] = [];
	if (domFiles.length === 0 || selected.length > domFiles.length)
		passes.push([
			"--path-ignore-patterns",
			domTestFileIgnorePattern,
			...args,
		]);
	if (domFiles.length > 0)
		passes.push([
			"--isolate",
			...options,
			...domFiles.map((path) => `./${path}`),
		]);
	return passes;
}
