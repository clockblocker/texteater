import { describe, expect, test } from "bun:test";
import {
	intAndNumericString,
	nullableNumericStringAndNullishInt,
	nullishIntAndNullableNumericString,
	numericStringAndInt,
} from "../../src/v4/codec-builders/strict-field-adapter/field-codecs/molecules/int-and-numeric-string";

describe("numericStringAndInt", () => {
	test("serializes ints to numeric strings with strict schemas", () => {
		expect(numericStringAndInt.decode(42)).toBe("42");
		expect(numericStringAndInt.out.parse("42")).toBe("42");
		expect(numericStringAndInt.out.parse("42.5")).toBe("42.5");
		expect(() => numericStringAndInt.in.parse(undefined)).toThrow();
		expect(() => intAndNumericString.in.parse(undefined)).toThrow();
	});

	test("parses numeric strings back to ints by flooring", () => {
		expect(numericStringAndInt.encode("42")).toBe(42);
		expect(numericStringAndInt.encode("42.9")).toBe(42);
		expect(intAndNumericString.decode("42.9")).toBe(42);
		expect(intAndNumericString.encode(42)).toBe("42");
	});
});

describe("nullableNumericStringAndNullishInt", () => {
	test("keeps the nullable/nullish variant available", () => {
		expect(nullableNumericStringAndNullishInt.decode(undefined)).toBeNull();
		expect(nullableNumericStringAndNullishInt.decode(42)).toBe("42");
		expect(nullishIntAndNullableNumericString.decode("42.9")).toBe(42);
		expect(nullishIntAndNullableNumericString.encode(42)).toBe("42");
	});
});
