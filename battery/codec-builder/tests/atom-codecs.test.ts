import { describe, expect, test } from "bun:test";
import { numericStringAndNumber } from "../src/codec-builders/strict-field-adapter/field-codecs/atoms/core-non-nullable-codecs/numeric-string-and-number";
import { yesNoAndBoolean } from "../src/codec-builders/strict-field-adapter/field-codecs/atoms/core-non-nullable-codecs/yes-no-and-boolean";
import {
	isoStringAndDate,
	nullableDateAndIsoString,
	nullableDateAndNullishIsoString,
	nullableIsoStringAndDate,
	nullableIsoStringAndNullishDate,
} from "../src/codec-builders/strict-field-adapter/field-codecs/atoms/derived/date";
import {
	nullableNumberAndNumericString,
	nullableNumericStringAndNumber,
	numberAndNullishNumericString,
	numberAndNumericString,
} from "../src/codec-builders/strict-field-adapter/field-codecs/atoms/derived/number";
import {
	nullishStringAndString,
	stringAndNullish,
} from "../src/codec-builders/strict-field-adapter/field-codecs/atoms/derived/string";
import {
	booleanAndYesNo,
	nullableBooleanAndYesNo,
	nullableYesNoAndBoolean,
} from "../src/codec-builders/strict-field-adapter/field-codecs/atoms/derived/yes-no";

describe("numericStringAndNumber", () => {
	test("uses strict non-nullable schemas in both directions", () => {
		expect(numericStringAndNumber.fromInput(42)).toBe("42");
		expect(numberAndNumericString.fromInput("42")).toBe(42);
		expect(() =>
			numericStringAndNumber.inputSchema.parse(undefined),
		).toThrow();
		expect(() =>
			numberAndNumericString.inputSchema.parse(undefined),
		).toThrow();
	});

	test("defaults nullish numeric strings to zero only for the number-facing codec", () => {
		expect(numberAndNullishNumericString.fromInput(undefined)).toBe(0);
		expect(numberAndNullishNumericString.fromInput(null)).toBe(0);
		expect(numberAndNullishNumericString.fromInput("42")).toBe(42);
	});
});

describe("nullableNumericStringAndNumber", () => {
	test("maps nullish input to null and uses a nullable output schema", () => {
		expect(nullableNumericStringAndNumber.fromInput(undefined)).toBeNull();
		expect(nullableNumericStringAndNumber.fromInput(null)).toBeNull();
		expect(
			nullableNumericStringAndNumber.outputSchema.parse(null),
		).toBeNull();
		expect(() =>
			nullableNumericStringAndNumber.outputSchema.parse(undefined),
		).toThrow();
	});

	test("keeps the reverse codec nullish-in and nullable-out", () => {
		expect(
			nullableNumberAndNumericString.inputSchema.parse(null),
		).toBeNull();
		expect(
			nullableNumberAndNumericString.inputSchema.parse(undefined),
		).toBeUndefined();
		expect(
			nullableNumberAndNumericString.outputSchema.parse(null),
		).toBeNull();
		expect(() =>
			nullableNumberAndNumericString.outputSchema.parse(undefined),
		).toThrow();
	});
});

describe("nullableDateAndNullishIsoString", () => {
	test("maps invalid and nullish input to null", () => {
		const date = nullableDateAndNullishIsoString.fromInput("2024-01-01");
		if (date === null) {
			throw new Error("Expected a valid date");
		}

		expect(date).toBeInstanceOf(Date);
		expect(isoStringAndDate.fromInput(date)).toBe(
			"2024-01-01T00:00:00.000Z",
		);
		expect(nullableDateAndNullishIsoString.fromInput("")).toBeNull();
		expect(
			nullableDateAndNullishIsoString.inputSchema.parse(undefined),
		).toBeUndefined();
		expect(() => isoStringAndDate.inputSchema.parse(undefined)).toThrow();
	});
});

describe("nullableDateAndIsoString", () => {
	test("maps nullish input to null and uses a nullable date output schema", () => {
		expect(nullableDateAndIsoString.fromInput(undefined)).toBeNull();
		expect(nullableDateAndIsoString.fromInput(null)).toBeNull();
		expect(nullableDateAndIsoString.outputSchema.parse(null)).toBeNull();
		expect(() =>
			nullableDateAndIsoString.outputSchema.parse(undefined),
		).toThrow();
	});

	test("keeps the reverse date codec nullish-in and nullable-out", () => {
		expect(
			nullableIsoStringAndNullishDate.inputSchema.parse(null),
		).toBeNull();
		expect(nullableIsoStringAndDate.inputSchema.parse(null)).toBeNull();
		expect(
			nullableIsoStringAndNullishDate.inputSchema.parse(undefined),
		).toBeUndefined();
		expect(
			nullableIsoStringAndDate.inputSchema.parse(undefined),
		).toBeUndefined();
		expect(
			nullableIsoStringAndNullishDate.outputSchema.parse(null),
		).toBeNull();
		expect(nullableIsoStringAndDate.outputSchema.parse(null)).toBeNull();
		expect(() =>
			nullableIsoStringAndNullishDate.outputSchema.parse(undefined),
		).toThrow();
		expect(() =>
			nullableIsoStringAndDate.outputSchema.parse(undefined),
		).toThrow();
	});
});

describe("yesNoAndBoolean", () => {
	test("uses strict non-nullable schemas in both directions", () => {
		expect(yesNoAndBoolean.fromInput(true)).toBe("Yes");
		expect(booleanAndYesNo.fromInput("No")).toBe(false);
		expect(() => yesNoAndBoolean.inputSchema.parse(undefined)).toThrow();
		expect(() => booleanAndYesNo.inputSchema.parse(undefined)).toThrow();
	});
});

describe("nullableYesNoAndBoolean", () => {
	test("maps nullish booleans to null and uses a nullable yes/no output schema", () => {
		expect(nullableYesNoAndBoolean.fromInput(undefined)).toBeNull();
		expect(nullableYesNoAndBoolean.fromInput(null)).toBeNull();
		expect(nullableYesNoAndBoolean.outputSchema.parse(null)).toBeNull();
		expect(() =>
			nullableYesNoAndBoolean.outputSchema.parse(undefined),
		).toThrow();
	});

	test("keeps the reverse boolean codec nullish-in and nullable-out", () => {
		expect(nullableBooleanAndYesNo.inputSchema.parse(null)).toBeNull();
		expect(
			nullableBooleanAndYesNo.inputSchema.parse(undefined),
		).toBeUndefined();
		expect(nullableBooleanAndYesNo.outputSchema.parse(null)).toBeNull();
		expect(() =>
			nullableBooleanAndYesNo.outputSchema.parse(undefined),
		).toThrow();
	});
});

describe("stringAndNullish", () => {
	test("preserves the default-empty-string behavior", () => {
		expect(stringAndNullish.fromInput(undefined)).toBe("");
		expect(stringAndNullish.fromOutput("")).toBe("");
		expect(nullishStringAndString.fromInput("")).toBe("");
		expect(nullishStringAndString.fromOutput(undefined)).toBe("");
	});
});
