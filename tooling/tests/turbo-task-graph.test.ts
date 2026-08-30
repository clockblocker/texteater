import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../..");

test("tf-demo development builds every in-house dependency before starting", () => {
	const manifest = JSON.parse(
		readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
	) as { scripts: Record<string, string> };
	expect(manifest.scripts.build).toContain("turbo run build");
	expect(manifest.scripts.demo).toContain(
		"turbo run dev --filter=@texteater/tf-demo",
	);

	const result = Bun.spawnSync(
		[
			resolve(repositoryRoot, "node_modules/.bin/turbo"),
			"run",
			"dev",
			"--filter=@texteater/tf-demo",
			"--dry=json",
		],
		{
			cwd: repositoryRoot,
			env: { ...process.env, TURBO_TELEMETRY_DISABLED: "1" },
			stderr: "pipe",
			stdout: "pipe",
		},
	);

	expect(result.exitCode, result.stderr.toString()).toBe(0);
	const plan = JSON.parse(result.stdout.toString()) as {
		tasks: Array<{ dependencies: string[]; taskId: string }>;
	};
	const dev = plan.tasks.find(
		(task) => task.taskId === "@texteater/tf-demo#dev",
	);
	expect(dev?.dependencies.toSorted()).toEqual([
		"dumdict#build",
		"dumgen#build",
		"dumling#build",
		"dumrel#build",
	]);
	expect(plan.tasks.map((task) => task.taskId).toSorted()).toEqual([
		"@texteater/tf-demo#dev",
		"codec-builder-library#build",
		"codegen#build",
		"common-utils#build",
		"dumdict#build",
		"dumgen#build",
		"dumling#build",
		"dumrel#build",
	]);
});
