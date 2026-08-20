import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { build } from "esbuild";

import { projectRelations } from "../../src/relations";

const packageRoot = resolve(import.meta.dir, "../..");

describe("dumrel/relations topology", () => {
	test("bundles without Dumling, the broad schema module, or Zod locales", async () => {
		const result = await build({
			bundle: true,
			entryPoints: [resolve(packageRoot, "src/relations.ts")],
			format: "esm",
			metafile: true,
			platform: "node",
			write: false,
		});
		const inputs = Object.keys(result.metafile.inputs).map((input) =>
			input.replaceAll("\\", "/"),
		);

		expect(
			inputs.some(
				(input) =>
					input.includes("/battery/dumling/") ||
					input.includes("/node_modules/dumling/"),
			),
		).toBe(false);
		expect(
			inputs.some((input) => input.endsWith("/dumrel/src/schema.ts")),
		).toBe(false);
		expect(inputs.some((input) => input.includes("/zod/v4/locales/"))).toBe(
			false,
		);
		const bundledBytes = result.outputFiles.reduce(
			(total, output) => total + output.contents.byteLength,
			0,
		);
		expect(bundledBytes).toBeLessThan(16 * 1024);
	});

	test("retains graph normalization without the broad schema module", () => {
		expect(
			projectRelations({
				readings: [{ reading: " source ", lemma: " source-lemma " }],
				edges: [
					{
						sourceReading: " source ",
						relation: "hypernym",
						targetLemma: " cafe\u0301 ",
					},
				],
			}),
		).toEqual([
			{
				sourceReading: "source",
				relation: "hypernym",
				targetLemma: "café",
				provenance: "direct",
			},
		]);
	});
});
