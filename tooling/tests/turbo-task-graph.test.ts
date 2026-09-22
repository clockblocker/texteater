import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../..");

function plan(cwd: string, args: string[]) {
	const result = Bun.spawnSync(
		[resolve(repositoryRoot, "node_modules/.bin/turbo"), "run", ...args, "--dry=json"],
		{
			cwd,
			env: { ...process.env, TURBO_TELEMETRY_DISABLED: "1" },
			stderr: "pipe",
			stdout: "pipe",
		},
	);
	expect(result.exitCode, result.stderr.toString()).toBe(0);
	return JSON.parse(result.stdout.toString()) as {
		tasks: Array<{ dependencies: string[]; taskId: string }>;
	};
}

test("tf-demo development builds every in-house dependency before starting", () => {
	const manifest = JSON.parse(
		readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
	) as { scripts: Record<string, string> };
	expect(manifest.scripts.build).toContain("turbo run build:package");
	expect(manifest.scripts.demo).toContain(
		"turbo run dev:package --filter=@texteater/tf-demo",
	);

	const graph = plan(repositoryRoot, [
		"dev:package",
		"--filter=@texteater/tf-demo",
	]);
	const dev = graph.tasks.find(
		(task) => task.taskId === "@texteater/tf-demo#dev:package",
	);
	expect(dev?.dependencies.toSorted()).toEqual([
		"common-utils#build:package",
		"dumdict#build:package",
		"dumgen#build:package",
		"dumling#build:package",
		"dumrel#build:package",
		"lego#build:package",
		"promptsmith#build:package",
		"react-resizable-panels#build:package",
	]);
	expect(graph.tasks.map((task) => task.taskId).toSorted()).toEqual([
		"@texteater/tf-demo#dev:package",
		"codegen#build:package",
		"common-utils#build:package",
		"dumdict#build:package",
		"dumgen#build:package",
		"dumling#build:package",
		"dumrel#build:package",
		"dumval#build:package",
		"lego#build:package",
		"promptsmith#build:package",
		"react-resizable-panels#build:package",
	]);
});

test("a battery's build script builds its in-house dependencies first", () => {
	const manifest = JSON.parse(
		readFileSync(resolve(repositoryRoot, "battery/dumgen/package.json"), "utf8"),
	) as { scripts: Record<string, string> };
	expect(manifest.scripts.build).toBe("turbo run build:package");

	// Turbo scopes the run to the package it is launched from.
	const graph = plan(resolve(repositoryRoot, "battery/dumgen"), [
		"build:package",
	]);
	expect(graph.tasks.map((task) => task.taskId).toSorted()).toEqual([
		"codegen#build:package",
		"common-utils#build:package",
		"dumgen#build:package",
		"dumling#build:package",
		"dumrel#build:package",
		"dumval#build:package",
		"promptsmith#build:package",
	]);
});
