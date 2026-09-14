import { expect, test } from "bun:test";
import { z } from "zod";
import { ParsingError, parseValidationArtifact } from "../src/runtime";

test("string pipelines preserve canonical array-length issues without invoking overwrites", () => {
	const canonical = z
		.string()
		.overwrite((value) => value.trim())
		.min(1);
	let calls = 0;
	const parsed = parseValidationArtifact(
		{
			version: 1,
			root: [
				"pipe",
				["string"],
				[
					["operation", "trim"],
					["string", ["min", 1]],
				],
			],
		},
		[],
		{
			trim: (value) => {
				calls++;
				return { value };
			},
		},
	);
	const expected = canonical.safeParse([]);
	expect(expected.success).toBe(false);
	expect(parsed).toBeInstanceOf(ParsingError);
	if (parsed instanceof ParsingError && !expected.success)
		expect(parsed.issues).toEqual(expected.error.issues);
	expect(calls).toBe(0);
});
