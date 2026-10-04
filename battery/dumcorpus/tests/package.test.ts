import { beforeAll, expect, test } from "bun:test";
import { resolve } from "node:path";

const packageRoot = resolve(import.meta.dir, "..");
const run = async (command: string[]) => {
	const child = Bun.spawn(command, {
		cwd: packageRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [output, error, exit] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (exit) throw Error(output + error);
	return output;
};
beforeAll(() => run([process.execPath, "run", "build"]), 60_000);

test("a consumer on Node loads the records through the published entry", async () => {
	const output = await run([
		resolve(packageRoot, "../../node_modules/node/bin/node"),
		"--input-type=module",
		"-e",
		`const { loadSpecRecords, findSpecRecord } = await import("dumcorpus");
		const records = loadSpecRecords();
		console.log(JSON.stringify({
			count: records.length,
			found: findSpecRecord(records, "de/pass-auf-dich-auf")?.id,
		}));`,
	]);
	const { count, found } = JSON.parse(output);
	expect(count).toBeGreaterThan(0);
	expect(found).toBe("de/pass-auf-dich-auf");
});

test("a consumer on Node reads the authored inventories through their entry", async () => {
	const output = await run([
		resolve(packageRoot, "../../node_modules/node/bin/node"),
		"--input-type=module",
		"-e",
		`const inventories = await import("dumcorpus/inventories");
		const root = await import("dumcorpus");
		console.log(JSON.stringify({
			count: inventories.authoredMembers.length,
			same: root.authoredMembers === inventories.authoredMembers,
		}));`,
	]);
	const { count, same } = JSON.parse(output);
	expect(count).toBeGreaterThan(300);
	expect(same).toBe(true);
});

test("the inventories entry reads no files and loads no Zod", async () => {
	const files = ["./inventories.js"];
	const external = new Set<string>();
	for (const file of files) {
		const text = await Bun.file(resolve(packageRoot, "dist", file)).text();
		// Anchored to statements, so a string such as "where from" is no import.
		for (const [, specifier = ""] of text.matchAll(
			/^(?:import|export)\b[^";]*?"([^"]+)"/gm,
		))
			if (!specifier.startsWith("./")) external.add(specifier);
			else if (!files.includes(specifier)) files.push(specifier);
	}
	// Dumling's runtime root, for foldCase, loads no Zod either: its own
	// package test pins that.
	expect([...external]).toEqual(["dumling"]);
});
