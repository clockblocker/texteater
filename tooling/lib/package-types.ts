import { isAbsolute, relative, sep } from "node:path";

export interface TypeCheckArgsOptions {
	/** Whether the tsconfig lists project `references`. */
	hasReferences: boolean;
	/** Pass `--pretty`, since tsc only formats for a terminal it owns. */
	pretty: boolean;
	tsconfig: string;
	typescriptPath: string;
}

/**
 * `tsc -p` ignores `references`, so a solution-style tsconfig checks nothing
 * under it. Build mode follows the references; `--force` keeps it a full check
 * whatever build info exists, so the listed files always describe the run.
 * `--listFiles` reports the checked program from the same run, at no extra
 * build.
 */
export function typeCheckArgs(options: TypeCheckArgsOptions): string[] {
	const mode = options.hasReferences
		? ["-b", options.tsconfig, "--force"]
		: ["-p", options.tsconfig, "--noEmit"];
	return [
		"bun",
		options.typescriptPath,
		...mode,
		"--listFiles",
		...(options.pretty ? ["--pretty"] : []),
	];
}

export function hasProjectReferences(tsconfig: unknown): boolean {
	if (typeof tsconfig !== "object" || tsconfig === null) return false;
	const references = (tsconfig as { references?: unknown }).references;
	return Array.isArray(references) && references.length > 0;
}

export interface TypeCheckOutput {
	/** Every line that is not a listed file, in order. */
	diagnostics: string[];
	listedFiles: string[];
}

/**
 * `--listFiles` prints absolute paths of existing files; diagnostics name
 * files relative to the working directory, so they never match.
 */
export function splitTypeCheckOutput(
	output: string,
	fileExists: (path: string) => boolean,
): TypeCheckOutput {
	const diagnostics: string[] = [];
	const listedFiles: string[] = [];
	const lines = output.split("\n");
	if (lines.at(-1) === "") lines.pop();
	for (const line of lines) {
		if (isAbsolute(line) && fileExists(line)) {
			listedFiles.push(line);
		} else {
			diagnostics.push(line);
		}
	}
	return { diagnostics, listedFiles };
}

/** Listed files that belong to the package, outside its node_modules. */
export function packageOwnFiles(
	listedFiles: string[],
	packageDir: string,
): string[] {
	const own = new Set<string>();
	for (const file of listedFiles) {
		const path = relative(packageDir, file);
		if (path === "" || path.startsWith("..") || isAbsolute(path)) continue;
		if (path.split(sep).includes("node_modules")) continue;
		own.add(file);
	}
	return [...own];
}
