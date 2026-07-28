import { describe, expect, test } from "bun:test";
import {
	intAndNumericString,
	nullableNumericStringAndNullishInt,
	nullishIntAndNullableNumericString,
	numericStringAndInt,
} from "../src/v3/codec-builders/strict-field-adapter/field-codecs/molecules/int-and-numeric-string";

describe("numericStringAndInt", () => {
	test("serializes ints to numeric strings with strict schemas", () => {
		expect(numericStringAndInt.fromInput(42)).toBe("42");
		expect(numericStringAndInt.outputSchema.parse("42")).toBe("42");
		expect(numericStringAndInt.outputSchema.parse("42.5")).toBe("42.5");
		expect(() =>
			numericStringAndInt.inputSchema.parse(undefined),
		).toThrow();
		expect(() =>
			intAndNumericString.inputSchema.parse(undefined),
		).toThrow();
	});

	test("parses numeric strings back to ints by flooring", () => {
		expect(numericStringAndInt.fromOutput("42")).toBe(42);
		expect(numericStringAndInt.fromOutput("42.9")).toBe(42);
		expect(intAndNumericString.fromInput("42.9")).toBe(42);
		expect(intAndNumericString.fromOutput(42)).toBe("42");
	});
});

describe("nullableNumericStringAndNullishInt", () => {
	test("keeps the nullable/nullish variant available", () => {
		expect(
			nullableNumericStringAndNullishInt.fromInput(undefined),
		).toBeNull();
		expect(nullableNumericStringAndNullishInt.fromInput(42)).toBe("42");
		expect(nullishIntAndNullableNumericString.fromInput("42.9")).toBe(42);
		expect(nullishIntAndNullableNumericString.fromOutput(42)).toBe("42");
	});
});
