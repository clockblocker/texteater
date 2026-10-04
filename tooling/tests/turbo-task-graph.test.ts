import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../..");

function plan(cwd: string, args: string[]) {
	const result = Bun.spawnSync(
		[
			resolve(repositoryRoot, "node_modules/.bin/turbo"),
			"run",
			...args,
			"--dry=json",
		],
		{
			cwd,
			env: { ...process.env, TURBO_TELEMETRY_DISABLED: "1" },
			stderr: "pipe",
			stdout: "pipe",
		},
	);
	expect(result.exitCode, result.stderr.toString()).toBe(0);
	return JSON.parse(result.stdout.toString()) as {
		tasks: Array<{
			command: string;
			dependencies: string[];
			taskId: string;
		}>;
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
		"compass#build:package",
		"dumcorpus#build:package",
		"dumdict#build:package",
		"dumgen#build:package",
		"dumling#build:package",
		"dumrel#build:package",
		"lego#build:package",
	]);
	// promptsmith stays in the graph only as Dumgen's dependency.
	expect(graph.tasks.map((task) => task.taskId).toSorted()).toEqual([
		"@texteater/tf-demo#dev:package",
		"codegen#build:package",
		"common-utils#build:package",
		"compass#build:package",
		"dumcorpus#build:package",
		"dumdict#build:package",
		"dumgen#build:package",
		"dumling#build:package",
		"dumrel#build:package",
		"lego#build:package",
		"promptsmith#build:package",
	]);
});

test("a battery's build script builds its in-house dependencies first", () => {
	const manifest = JSON.parse(
		readFileSync(
			resolve(repositoryRoot, "battery/dumgen/package.json"),
			"utf8",
		),
	) as { scripts: Record<string, string> };
	expect(manifest.scripts.build).toBe("turbo run build:package");

	// Turbo scopes the run to the package it is launched from.
	const graph = plan(resolve(repositoryRoot, "battery/dumgen"), [
		"build:package",
	]);
	expect(graph.tasks.map((task) => task.taskId).toSorted()).toEqual([
		"codegen#build:package",
		"common-utils#build:package",
		"dumcorpus#build:package",
		"dumgen#build:package",
		"dumling#build:package",
		"dumrel#build:package",
		"promptsmith#build:package",
	]);
});

test("validate gates each workspace once and builds only for build-output gates", () => {
	const graph = plan(repositoryRoot, ["validate"]);
	const tasks = new Map(
		graph.tasks.map((task) => [task.taskId, task.dependencies]),
	);
	const workspaces = [...tasks.keys()]
		.filter((id) => id.endsWith("#validate"))
		.map((id) => id.slice(0, -"#validate".length));
	expect(workspaces.length).toBeGreaterThan(10);
	for (const workspace of workspaces) {
		expect(tasks.get(`${workspace}#validate`)).toEqual(
			expect.arrayContaining(
				["check", "lint", "test"].map((task) => `${workspace}#${task}`),
			),
		);
	}

	// Packages are read from source (#881); a build runs only where a gate
	// reads its output.
	const builders = [...tasks.entries()]
		.filter(([id]) => !id.endsWith("#build:package"))
		.filter(([, dependencies]) =>
			dependencies.some((dependency) =>
				dependency.endsWith("#build:package"),
			),
		)
		.map(([id]) => id)
		.toSorted();
	expect(builders).toEqual([
		"@dumling/docs-site#check",
		"@dumling/docs-site#test",
		"dumcorpus#test",
		"dumling#test",
		"dumrel#test",
	]);
});

test("generate rewrites each package's generated files after its dependencies'", () => {
	const manifest = JSON.parse(
		readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
	) as { scripts: Record<string, string> };
	expect(manifest.scripts.generate).toBe("turbo run generate");

	const graph = plan(repositoryRoot, ["generate"]);
	const generators = graph.tasks.filter(
		(task) => task.command !== "<NONEXISTENT>",
	);
	const dependencies = new Map(
		generators.map((task) => [task.taskId, task.dependencies]),
	);
	expect([...dependencies.keys()].toSorted()).toEqual([
		"dumcorpus#generate",
		"dumdict#generate",
		"dumling#generate",
		"dumrel#generate",
	]);
	expect(dependencies.get("dumrel#generate")).toContain("dumling#generate");
	expect(dependencies.get("dumcorpus#generate")).toEqual(
		expect.arrayContaining(["dumling#generate", "dumrel#generate"]),
	);
	expect(dependencies.get("dumdict#generate")).toEqual(
		expect.arrayContaining(["dumling#generate", "dumrel#generate"]),
	);
});

test("validate runs every package's generated-file freshness check", () => {
	const graph = plan(repositoryRoot, ["validate"]);
	const checks = graph.tasks
		.filter(
			(task) =>
				task.taskId.endsWith("#generate:check") &&
				task.command !== "<NONEXISTENT>",
		)
		.map((task) => task.taskId.slice(0, -"#generate:check".length))
		.toSorted();
	expect(checks).toEqual(["dumcorpus", "dumdict", "dumling", "dumrel"]);
	for (const workspace of checks)
		expect(
			graph.tasks.find((task) => task.taskId === `${workspace}#validate`)
				?.dependencies,
		).toContain(`${workspace}#generate:check`);
});
