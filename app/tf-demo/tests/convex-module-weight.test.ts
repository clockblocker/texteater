import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { build } from "esbuild";

/**
 * Every Convex query or mutation module is evaluated in a fresh V8 context per
 * call, so a request costs roughly hops × module weight. Two budgets keep that
 * weight structural rather than accidental:
 *
 * - No isolate module may reach the generation runtime (Effect, promptsmith,
 *   the dumgen root, or the Effect-based dumdict service). Only "use node"
 *   actions load those.
 * - Bytes from the Dum packages are budgeted separately from the rest, because
 *   the reviewed authored catalog behind `dumgen/authored` is data the
 *   dictionary transaction needs and dominates that share on its own.
 */
const MAX_DUM_PACKAGE_BYTES = 960 * 1024;
const MAX_OTHER_BYTES = 640 * 1024;
const FORBIDDEN_INPUTS = [
	/node_modules\/effect\//,
	/node_modules\/promptsmith\//,
	/battery\/promptsmith\//,
	/\/dumgen\/dist\/index\.js$/,
	/\/dumgen\/dist\/development\.js$/,
	/\/dumdict\/dist\/index\.js$/,
	/\/dumdict\/dist\/runtime\.js$/,
	/\/zod\//,
];
const DUM_PACKAGE_INPUT = /\/(?:dumgen|dumdict|dumling|dumrel|dumval)\/dist\//;

const convexRoot = join(import.meta.dir, "..", "convex");

function walk(directory: string): string[] {
	return readdirSync(directory).flatMap((name) => {
		if (name === "_generated" || name === "node_modules") return [];
		const path = join(directory, name);
		if (statSync(path).isDirectory()) return walk(path);
		return name.endsWith(".ts") ? [path] : [];
	});
}

const isolateModules = walk(convexRoot).filter(
	(path) => !readFileSync(path, "utf8").startsWith('"use node"'),
);

test("isolate-side Convex modules stay light and never load the generation runtime", async () => {
	const overweight: string[] = [];
	const leaking: string[] = [];
	for (const path of isolateModules) {
		const result = await build({
			entryPoints: [path],
			bundle: true,
			platform: "browser",
			format: "esm",
			conditions: ["convex", "module"],
			write: false,
			metafile: true,
			logLevel: "silent",
			target: "esnext",
		});
		const name = relative(convexRoot, path);
		const inputs = Object.entries(result.metafile.inputs);
		const leaks = FORBIDDEN_INPUTS.flatMap((pattern) =>
			inputs.some(([input]) => pattern.test(input))
				? [String(pattern)]
				: [],
		);
		if (leaks.length) leaking.push(`${name}: ${leaks.join(", ")}`);
		let dumBytes = 0;
		let otherBytes = 0;
		for (const [input, { bytes }] of inputs) {
			if (DUM_PACKAGE_INPUT.test(input)) dumBytes += bytes;
			else otherBytes += bytes;
		}
		if (dumBytes > MAX_DUM_PACKAGE_BYTES || otherBytes > MAX_OTHER_BYTES)
			overweight.push(
				`${name}: dum ${Math.round(dumBytes / 1024)} KB, other ${Math.round(otherBytes / 1024)} KB`,
			);
	}
	expect(leaking).toEqual([]);
	expect(overweight).toEqual([]);
}, 120_000);
