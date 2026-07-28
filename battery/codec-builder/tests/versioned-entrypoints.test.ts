import { describe, expect, test } from "bun:test";
import { z as z3 } from "zod/v3";
import { z as z4 } from "zod/v4";
import { codecBuilder3 } from "../src/v3";
import { codecBuilder4 } from "../src/v4";

describe("versioned codec builders", () => {
	test("keeps the existing Zod 3 interface available explicitly", () => {
		const codec =
			codecBuilder3.fieldCodec.nonNullish.numericString.and.number;

		expect(codec.inputSchema).toBeInstanceOf(z3.ZodNumber);
		expect(codec.fromInput(42)).toBe("42");
		expect(codec.fromOutput("42.5")).toBe(42.5);
	});

	test("builds and validates codecs with Zod 4 schemas", () => {
		const codec =
			codecBuilder4.fieldCodec.nonNullish.numericString.and.number;

		expect(codec.in).toBeInstanceOf(z4.ZodNumber);
		expect(codec.decode(42)).toBe("42");
		expect(codec.encode("42.5")).toBe(42.5);

		const adapter = codecBuilder4.buildStrictFieldAdapterCodec(
			z4.object({
				id: z4.number(),
				label: z4.string(),
			}),
			{
				id: codec,
				label: codecBuilder4.fieldCodec.noOp,
			},
		);

		expect(adapter.out.parse({ id: "42", label: "answer" })).toEqual({
			id: "42",
			label: "answer",
		});
		expect(adapter.decode({ id: 42, label: "answer" })).toEqual({
			id: "42",
			label: "answer",
		});
	});

	test("bundles each versioned entrypoint without the other Zod runtime", async () => {
		const [v3Build, v4Build, rootV3Build, rootV4Build] = await Promise.all([
			Bun.build({
				entrypoints: ["src/v3/index.ts"],
				format: "esm",
				packages: "external",
				target: "node",
			}),
			Bun.build({
				entrypoints: ["src/v4/index.ts"],
				format: "esm",
				packages: "external",
				target: "node",
			}),
			Bun.build({
				entrypoints: ["tests/fixtures/import-v3-from-root.ts"],
				format: "esm",
				packages: "external",
				target: "node",
			}),
			Bun.build({
				entrypoints: ["tests/fixtures/import-v4-from-root.ts"],
				format: "esm",
				packages: "external",
				target: "node",
			}),
		]);

		expect(v3Build.success).toBeTrue();
		expect(v4Build.success).toBeTrue();
		expect(rootV3Build.success).toBeTrue();
		expect(rootV4Build.success).toBeTrue();

		const v3Bundle = await v3Build.outputs[0]?.text();
		const v4Bundle = await v4Build.outputs[0]?.text();
		const rootV3Bundle = await rootV3Build.outputs[0]?.text();
		const rootV4Bundle = await rootV4Build.outputs[0]?.text();

		for (const bundle of [v3Bundle, rootV3Bundle]) {
			expect(bundle ?? "").toContain("zod/v3");
			expect(bundle ?? "").not.toContain("zod/v4");
		}
		for (const bundle of [v4Bundle, rootV4Bundle]) {
			expect(bundle ?? "").toContain("zod/v4");
			expect(bundle ?? "").not.toContain("zod/v3");
		}
	});
});
