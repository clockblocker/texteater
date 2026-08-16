import { expect, test } from "bun:test";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const packageDirectory = dirname(import.meta.dir);

test("dev reports how to stop the process occupying the Convex port", async () => {
	const fixtureDirectory = await mkdtemp(join(tmpdir(), "tf-demo-dev-"));
	try {
		const manifest = JSON.parse(
			await readFile(join(packageDirectory, "package.json"), "utf8"),
		) as { scripts: { dev: string } };
		const convexExecutable = join(fixtureDirectory, "convex");
		const lsofExecutable = join(fixtureDirectory, "lsof");
		await Promise.all([
			writeFile(
				convexExecutable,
				'#!/bin/sh\nprintf "%s\\n" "A local backend is still running on port 3210." >&2\nexit 1\n',
			),
			writeFile(lsofExecutable, '#!/bin/sh\nprintf "%s\\n" "4242"\n'),
		]);
		await Promise.all([
			chmod(convexExecutable, 0o755),
			chmod(lsofExecutable, 0o755),
		]);

		const child = Bun.spawn(["sh", "-c", manifest.scripts.dev], {
			cwd: packageDirectory,
			env: {
				...process.env,
				PATH: `${fixtureDirectory}:${process.env.PATH ?? ""}`,
			},
			stdout: "pipe",
			stderr: "pipe",
		});
		const [stdout, stderr, exitCode] = await Promise.all([
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
			child.exited,
		]);

		expect(exitCode).toBe(1);
		expect(`${stdout}\n${stderr}`).toContain("kill 4242");
	} finally {
		await rm(fixtureDirectory, { recursive: true, force: true });
	}
});
