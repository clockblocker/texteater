import { realpath } from "node:fs/promises";
import { join, relative } from "node:path";

async function git(
	directory: string,
	args: readonly string[],
): Promise<string | undefined> {
	// Read-only: no optional locks, so a status never rewrites the index
	// under another session's feet.
	const child = Bun.spawn(
		["git", "--no-optional-locks", "-C", directory, ...args],
		{
			stdout: "pipe",
			stderr: "ignore",
			env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
		},
	);
	const [output, exit] = await Promise.all([
		new Response(child.stdout).text(),
		child.exited,
	]);
	return exit === 0 ? output : undefined;
}

/**
 * The record ids under `recordsDirectory` whose files git sees as changed,
 * staged or untracked, or null when the directory is outside a git work
 * tree. Runs read-only git commands only.
 */
export async function changedRecordIds(
	recordsDirectory: string,
): Promise<ReadonlySet<string> | null> {
	const directory = await realpath(recordsDirectory);
	const top = (
		await git(directory, ["rev-parse", "--show-toplevel"])
	)?.trim();
	if (!top) return null;
	const status = await git(directory, [
		"status",
		"--porcelain=v1",
		"-z",
		"--untracked-files=all",
		"--",
		".",
	]);
	if (status === undefined) return null;
	const changed = new Set<string>();
	const entries = status.split("\0");
	for (let index = 0; index < entries.length; index++) {
		const entry = entries[index] ?? "";
		if (entry.length < 4) continue;
		// A rename or copy names its source in the next entry.
		if (entry[0] === "R" || entry[0] === "C") index++;
		const path = relative(directory, join(top, entry.slice(3)));
		if (path.endsWith(".json") && !path.startsWith(".."))
			changed.add(path.slice(0, -".json".length));
	}
	return changed;
}
