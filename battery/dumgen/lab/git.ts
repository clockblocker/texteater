import { execFileSync } from "node:child_process";

/**
 * Runs `git` in `cwd` and returns its stdout untouched. Other sessions commit
 * to the same working tree, so every call passes `--no-optional-locks`: a
 * read such as `git status` then never takes `index.lock` to refresh the
 * index, and can't collide with a concurrent commit. A failure rethrows with
 * git's stderr, or with the signal that killed it. An exit status listed in
 * `okStatuses` returns its stdout instead, as `git diff --no-index` needs.
 */
export function gitOutput(
	args: readonly string[],
	cwd: string,
	okStatuses: readonly number[] = [],
): string {
	try {
		return execFileSync("git", ["--no-optional-locks", ...args], {
			cwd,
			encoding: "utf8",
			maxBuffer: 1 << 28,
			stdio: ["ignore", "pipe", "pipe"],
		});
	} catch (error) {
		const failure = error as {
			readonly status?: number | null;
			readonly signal?: string | null;
			readonly stdout?: unknown;
			readonly stderr?: unknown;
		};
		if (
			typeof failure.status === "number" &&
			okStatuses.includes(failure.status) &&
			typeof failure.stdout === "string"
		)
			return failure.stdout;
		throw Error(
			`git ${args.join(" ")} in ${cwd} ${failureOf(failure.signal, failure.status, failure.stderr)}`,
			{ cause: error },
		);
	}
}

/** {@link gitOutput}, trimmed. */
export const git = (args: readonly string[], cwd: string) =>
	gitOutput(args, cwd).trim();

function failureOf(
	signal: string | null | undefined,
	status: number | null | undefined,
	stderr: unknown,
): string {
	if (signal)
		return `was killed by ${signal}${signal === "SIGTERM" ? " (a timed-out test's child processes are killed this way)" : ""}`;
	const message = typeof stderr === "string" ? stderr.trim() : "";
	return `exited ${status ?? "abnormally"}${message ? `: ${message}` : ""}`;
}
