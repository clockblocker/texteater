import { expect, test } from "bun:test";
import type { z } from "zod";
import { ParsingError, type ParsingIssue } from "../src/runtime";

type Expect<Value extends true> = Value;
type _IssuesRemainStructurallyCompatible = Expect<
	ParsingIssue extends z.ZodIssue ? true : false
>;
type ParsingErrorProjection = Pick<ParsingError, "issues" | "message" | "name">;
type ZodErrorProjection = Pick<z.ZodError, "issues" | "message" | "name">;
type _ErrorProjectionRemainsStructurallyCompatible = Expect<
	ParsingErrorProjection extends ZodErrorProjection ? true : false
>;

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
