import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
	ParsingError,
	parseValidationArtifact,
	type ValidationOperations,
} from "../../src/validation";
import { compileZodValidationArtifacts } from "../../src/validation-compiler";

// Zod keeps running a node's checks after a failure: length checks run on any
// value with a `length` unless an issue halted the payload (`continue: false`,
// as `int` reports a non-integer), and other checks run until it is aborted.

function trim(value: string): string {
	return value.trim();
}

function repeat<Value>(values: Value[]): Value[] {
	return [...values, ...values];
}

function double(value: number): number {
	return value * 2;
}

const operations: ValidationOperations = {
	double: (value) => ({ value: double(value as number) }),
	repeat: (value) => ({ value: repeat(value as unknown[]) }),
	trim: (value) => ({ value: trim(value as string) }),
};

const schemas = {
	arrayLength: z.array(z.string()).length(2),
	arrayMax: z.array(z.string()).max(1),
	arrayMin: z.array(z.string()).min(1),
	arrayMinMax: z.array(z.string()).min(2).max(3),
	arrayNonempty: z.array(z.string()).nonempty(),
	arrayOfArrays: z.array(z.array(z.number()).length(2)).max(1),
	arrayOfIntegers: z.array(z.number().int()).min(3),
	checkedElementsThenRepeat: z
		.array(z.string().min(3))
		.min(1)
		.overwrite(repeat)
		.length(4),
	integerMin: z.number().int().min(5),
	integerThenDouble: z.number().int().overwrite(double).max(8),
	minThenDouble: z.number().min(5).overwrite(double).max(8),
	nested: z.object({
		items: z.array(z.number().int()).min(2),
		names: z.array(z.string()).min(2),
		tag: z.string().max(2),
	}),
	repeatThenMin: z.array(z.string()).overwrite(repeat).min(3),
	stringLength: z.string().length(2),
	stringMaxRegexMin: z.string().max(3).regex(/x/u).min(2),
	stringMin: z.string().min(3),
	stringMinThenTrim: z.string().min(3).overwrite(trim).max(5),
	unionElements: z
		.array(z.union([z.number().int(), z.string().min(2)]))
		.max(1),
};

const inputs: readonly unknown[] = [
	"",
	"ab",
	"abcd",
	"  abcdefg  ",
	1.5,
	4,
	6,
	true,
	null,
	undefined,
	{},
	{ length: 0 },
	{ length: 5 },
	{ length: "x" },
	{ length: null },
	(_first: unknown, _second: unknown) => undefined,
	[],
	["a"],
	["ab", "cd"],
	["abc", "defg"],
	["a", "b", "c", "d"],
	[1.5],
	[1, 2.5, 3],
	[[1.5], [1]],
	[[1], [2, 3]],
	[1.5, "a"],
	{ items: [1.5], names: "", tag: [1, 2, 3] },
	{ items: [1], names: [], tag: { length: 9 } },
];

const compiled = compileZodValidationArtifacts({
	operations: [
		{
			construct: "overwrite",
			implementation: double,
			name: "double",
			version: 1,
		},
		{
			construct: "overwrite",
			implementation: repeat,
			name: "repeat",
			version: 1,
		},
		{
			construct: "overwrite",
			implementation: trim,
			name: "trim",
			version: 1,
		},
	],
	schemas,
});

function label(input: unknown): string {
	return typeof input === "function" ? "a function" : JSON.stringify(input);
}

describe("checks after a failure", () => {
	for (const [name, canonical] of Object.entries(schemas)) {
		test(`${name} reports Zod's issues`, () => {
			for (const input of inputs) {
				const expected = canonical.safeParse(input);
				const actual = parseValidationArtifact(
					{
						definitions: compiled.definitions,
						root: compiled.roots[name as keyof typeof schemas],
						version: 1,
					},
					input,
					operations,
				);
				if (expected.success) {
					expect(actual, label(input)).toEqual(expected.data);
					continue;
				}
				expect(actual, label(input)).toBeInstanceOf(ParsingError);
				if (actual instanceof ParsingError)
					expect(actual.issues, label(input)).toEqual(
						expected.error.issues,
					);
			}
		});
	}

	test("an array schema measures a string it rejects", () => {
		const result = parseValidationArtifact(
			{
				definitions: compiled.definitions,
				root: compiled.roots.arrayMin,
				version: 1,
			},
			"",
		);
		expect(result).toBeInstanceOf(ParsingError);
		if (result instanceof ParsingError)
			expect(result.issues.map(({ code }) => code)).toEqual([
				"invalid_type",
				"too_small",
			]);
	});
});
