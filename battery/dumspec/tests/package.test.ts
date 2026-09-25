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
		`const { loadSpecRecords, findSpecRecord } = await import("dumspec");
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
