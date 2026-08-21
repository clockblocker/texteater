import { expect, test } from "bun:test";
import { ParsingError } from "../src";

test("ParsingError exposes Zod-familiar issues without Zod runtime identity", () => {
	const issues = [
		{
			expected: "string" as const,
			code: "invalid_type" as const,
			path: ["canonicalForm"],
			message: "Invalid input: expected string, received number",
		},
	];
	const error = new ParsingError(issues);

	expect(error).toBeInstanceOf(Error);
	expect(error.name).toBe("ParsingError");
	expect(error.issues).toEqual(issues);
	expect(error.message).toBe(JSON.stringify(issues, null, 2));
});
