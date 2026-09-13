import { expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { preparePublishedRuntime } from "../dum-entrypoint-rss/published-runtime";
import { findRepositoryRoot } from "../lib/workspaces";

test("RSS probes resolve built dependencies without development TypeScript aliases and report bytes", async () => {
	const root = await preparePublishedRuntime(
		await findRepositoryRoot(import.meta.dir),
	);
	try {
		const resolution = Bun.spawn(
			[
				process.execPath,
				"-e",
				`console.log(Bun.resolveSync("dumling", ${JSON.stringify(join(root, "node_modules/dumrel/dist"))})); console.log(Bun.resolveSync("dumrel", ${JSON.stringify(join(root, "node_modules/dumdict/dist"))}));`,
			],
			{ cwd: root, stdout: "pipe", stderr: "pipe" },
		);
		expect(
			(await new Response(resolution.stdout).text()).trim().split("\n"),
		).toEqual([
			join(root, "node_modules/dumling/dist/index.js"),
			join(root, "node_modules/dumrel/dist/index.js"),
		]);
		expect(await resolution.exited).toBe(0);
		const baseline = Bun.spawn(
			[
				process.execPath,
				join(root, "tooling/dum-entrypoint-rss/runner.ts"),
				"--mode",
				"baseline",
			],
			{ cwd: root, stdout: "pipe", stderr: "pipe" },
		);
		const bytes = Number(await new Response(baseline.stdout).text());
		expect(await baseline.exited).toBe(0);
		// A Bun process uses megabytes, not the few thousand bytes produced when KiB are mislabeled.
		expect(bytes).toBeGreaterThan(1024 * 1024);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
