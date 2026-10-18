/** A staged file over this many tokens fails `bun run check:file-tokens`. */
export const tokenLimit = 5_000;

const bytesPerToken = 4;

/** `.gitattributes` marks the files agents don't author with these. */
const exemptingAttributes = ["linguist-generated", "linguist-vendored"];

export interface StagedFile {
	path: string;
	tokens: number;
}

interface StagedBlob {
	object: string;
	path: string;
}

/**
 * The staged files under `cwd` that agents author, measured by their staged
 * content. Paths are relative to the repository root.
 */
export async function stagedAuthoredFiles(cwd: string): Promise<StagedFile[]> {
	const root = (await git(cwd, ["rev-parse", "--show-toplevel"])).trim();
	const prefix = (await git(cwd, ["rev-parse", "--show-prefix"])).trim();
	const diff = [
		"diff",
		"--cached",
		"--no-renames",
		"--diff-filter=ACMT",
		"-z",
	];
	const blobs = parseRaw(
		await git(root, [...diff, "--raw", "--no-abbrev"]),
	).filter((blob) => blob.path.startsWith(prefix));
	if (blobs.length === 0) return [];

	const binary = parseBinaryPaths(await git(root, [...diff, "--numstat"]));
	const exempt = parseSetPaths(
		await git(
			root,
			["check-attr", "--cached", "-z", "--stdin", ...exemptingAttributes],
			blobs.map((blob) => `${blob.path}\0`).join(""),
		),
	);
	const authored = blobs.filter(
		(blob) => !binary.has(blob.path) && !exempt.has(blob.path),
	);
	if (authored.length === 0) return [];

	const sizes = (
		await git(
			root,
			["cat-file", "--batch-check=%(objectsize)"],
			authored.map((blob) => `${blob.object}\n`).join(""),
		)
	)
		.trim()
		.split("\n");
	return authored.map((blob, index) => ({
		path: blob.path,
		tokens: Math.ceil(Number(sizes[index]) / bytesPerToken),
	}));
}

/** `git diff --raw -z`: `:<mode> <mode> <object> <object> <status>\0<path>\0`. */
function parseRaw(output: string): StagedBlob[] {
	const fields = output.split("\0");
	const blobs: StagedBlob[] = [];
	for (let index = 0; index + 1 < fields.length; index += 2) {
		const [, mode, , object] = (fields[index] ?? "").slice(1).split(" ");
		const path = fields[index + 1];
		// A submodule's object is a commit, not file content.
		if (mode === "160000" || object === undefined || path === undefined) {
			continue;
		}
		blobs.push({ object, path });
	}
	return blobs;
}

/** `git diff --numstat -z`: `<added>\t<deleted>\t<path>\0`, `-` when binary. */
function parseBinaryPaths(output: string): Set<string> {
	const paths = new Set<string>();
	for (const line of output.split("\0")) {
		const [added, , path] = line.split("\t");
		if (added === "-" && path !== undefined) paths.add(path);
	}
	return paths;
}

/** `git check-attr -z`: `<path>\0<attribute>\0<value>\0`. */
function parseSetPaths(output: string): Set<string> {
	const fields = output.split("\0");
	const paths = new Set<string>();
	for (let index = 0; index + 2 < fields.length; index += 3) {
		const path = fields[index];
		const value = fields[index + 2];
		if (path !== undefined && (value === "set" || value === "true")) {
			paths.add(path);
		}
	}
	return paths;
}

async function git(cwd: string, args: string[], input?: string) {
	const child = Bun.spawn(["git", ...args], {
		cwd,
		stdin: input === undefined ? "ignore" : Buffer.from(input),
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (exitCode !== 0) {
		throw new Error(`git ${args.join(" ")} failed: ${stderr.trim()}`);
	}
	return stdout;
}
