import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { git, gitOutput } from "../../lab/git.js";

const directory = await mkdtemp(join(tmpdir(), "dumgen-git-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

test("a failing git call names the command and carries git's stderr", () => {
	expect(() => git(["rev-parse", "HEAD"], directory)).toThrow(
		/^git rev-parse HEAD in .* exited 128: fatal: not a git repository/,
	);
});

test("an accepted exit status returns stdout untrimmed", async () => {
	await writeFile(join(directory, "a.txt"), "a\n");
	const patch = gitOutput(
		["diff", "--no-index", "--", "/dev/null", "a.txt"],
		directory,
		[1],
	);
	expect(patch).toStartWith("diff --git");
	expect(patch).toEndWith("+a\n");
	expect(() =>
		gitOutput(
			["diff", "--no-index", "--", "/dev/null", "a.txt"],
			directory,
		),
	).toThrow(/exited 1/);
});
