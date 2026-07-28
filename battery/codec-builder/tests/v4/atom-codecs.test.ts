import { describe, expect, test } from "bun:test";
import { z } from "zod/v4";
import { numericStringAndNumber } from "../../src/v4/codec-builders/strict-field-adapter/field-codecs/atoms/core-non-nullable-codecs/numeric-string-and-number";
import { yesNoAndBoolean } from "../../src/v4/codec-builders/strict-field-adapter/field-codecs/atoms/core-non-nullable-codecs/yes-no-and-boolean";
import {
	isoStringAndDate,
	nullableDateAndIsoString,
	nullableDateAndNullishIsoString,
	nullableIsoStringAndDate,
	nullableIsoStringAndNullishDate,
} from "../../src/v4/codec-builders/strict-field-adapter/field-codecs/atoms/derived/date";
import {
	nullableNumberAndNumericString,
	nullableNumericStringAndNumber,
	numberAndNullishNumericString,
	numberAndNumericString,
} from "../../src/v4/codec-builders/strict-field-adapter/field-codecs/atoms/derived/number";
import {
	nullishStringAndString,
	stringAndNullish,
} from "../../src/v4/codec-builders/strict-field-adapter/field-codecs/atoms/derived/string";
import {
	booleanAndYesNo,
	nullableBooleanAndYesNo,
	nullableYesNoAndBoolean,
} from "../../src/v4/codec-builders/strict-field-adapter/field-codecs/atoms/derived/yes-no";

describe("numericStringAndNumber", () => {
	test("uses strict non-nullable schemas in both directions", () => {
		expect(numericStringAndNumber).toBeInstanceOf(z.ZodCodec);
		expect(numericStringAndNumber.decode(42)).toBe("42");
		expect(numberAndNumericString.decode("42")).toBe(42);
		expect(() => numericStringAndNumber.in.parse(undefined)).toThrow();
		expect(() => numberAndNumericString.in.parse(undefined)).toThrow();
	});

	test("validates both sides of the native codec contract", () => {
		expect(
			numericStringAndNumber.safeDecode("42" as never).success,
		).toBeFalse();
		expect(
			numericStringAndNumber.safeEncode("not numeric").success,
		).toBeFalse();
	});

	test("defaults nullish numeric strings to zero only for the number-facing codec", () => {
		expect(numberAndNullishNumericString.decode(undefined)).toBe(0);
		expect(numberAndNullishNumericString.decode(null)).toBe(0);
		expect(numberAndNullishNumericString.decode("42")).toBe(42);
	});
});

describe("nullableNumericStringAndNumber", () => {
	test("maps nullish input to null and uses a nullable output schema", () => {
		expect(nullableNumericStringAndNumber.decode(undefined)).toBeNull();
		expect(nullableNumericStringAndNumber.decode(null)).toBeNull();
		expect(nullableNumericStringAndNumber.out.parse(null)).toBeNull();
		expect(() =>
			nullableNumericStringAndNumber.out.parse(undefined),
		).toThrow();
	});

	test("keeps the reverse codec nullish-in and nullable-out", () => {
		expect(nullableNumberAndNumericString.in.parse(null)).toBeNull();
		expect(
			nullableNumberAndNumericString.in.parse(undefined),
		).toBeUndefined();
		expect(nullableNumberAndNumericString.out.parse(null)).toBeNull();
		expect(() =>
			nullableNumberAndNumericString.out.parse(undefined),
		).toThrow();
	});
});

describe("nullableDateAndNullishIsoString", () => {
	test("maps invalid and nullish input to null", () => {
		const date = nullableDateAndNullishIsoString.decode("2024-01-01");
		if (date === null) {
			throw new Error("Expected a valid date");
		}

		expect(date).toBeInstanceOf(Date);
		expect(isoStringAndDate.decode(date)).toBe("2024-01-01T00:00:00.000Z");
		expect(nullableDateAndNullishIsoString.decode("")).toBeNull();
		expect(
			nullableDateAndNullishIsoString.in.parse(undefined),
		).toBeUndefined();
		expect(() => isoStringAndDate.in.parse(undefined)).toThrow();
	});
});

describe("nullableDateAndIsoString", () => {
	test("maps nullish input to null and uses a nullable date output schema", () => {
		expect(nullableDateAndIsoString.decode(undefined)).toBeNull();
		expect(nullableDateAndIsoString.decode(null)).toBeNull();
		expect(nullableDateAndIsoString.out.parse(null)).toBeNull();
		expect(() => nullableDateAndIsoString.out.parse(undefined)).toThrow();
	});

	test("keeps the reverse date codec nullish-in and nullable-out", () => {
		expect(nullableIsoStringAndNullishDate.in.parse(null)).toBeNull();
		expect(nullableIsoStringAndDate.in.parse(null)).toBeNull();
		expect(
			nullableIsoStringAndNullishDate.in.parse(undefined),
		).toBeUndefined();
		expect(nullableIsoStringAndDate.in.parse(undefined)).toBeUndefined();
		expect(nullableIsoStringAndNullishDate.out.parse(null)).toBeNull();
		expect(nullableIsoStringAndDate.out.parse(null)).toBeNull();
		expect(() =>
			nullableIsoStringAndNullishDate.out.parse(undefined),
		).toThrow();
		expect(() => nullableIsoStringAndDate.out.parse(undefined)).toThrow();
	});
});

describe("yesNoAndBoolean", () => {
	test("uses strict non-nullable schemas in both directions", () => {
		expect(yesNoAndBoolean.decode(true)).toBe("Yes");
		expect(booleanAndYesNo.decode("No")).toBe(false);
		expect(() => yesNoAndBoolean.in.parse(undefined)).toThrow();
		expect(() => booleanAndYesNo.in.parse(undefined)).toThrow();
	});
});

describe("nullableYesNoAndBoolean", () => {
	test("maps nullish booleans to null and uses a nullable yes/no output schema", () => {
		expect(nullableYesNoAndBoolean.decode(undefined)).toBeNull();
		expect(nullableYesNoAndBoolean.decode(null)).toBeNull();
		expect(nullableYesNoAndBoolean.out.parse(null)).toBeNull();
		expect(() => nullableYesNoAndBoolean.out.parse(undefined)).toThrow();
	});

	test("keeps the reverse boolean codec nullish-in and nullable-out", () => {
		expect(nullableBooleanAndYesNo.in.parse(null)).toBeNull();
		expect(nullableBooleanAndYesNo.in.parse(undefined)).toBeUndefined();
		expect(nullableBooleanAndYesNo.out.parse(null)).toBeNull();
		expect(() => nullableBooleanAndYesNo.out.parse(undefined)).toThrow();
	});
});

describe("stringAndNullish", () => {
	test("preserves the default-empty-string behavior", () => {
		expect(stringAndNullish.decode(undefined)).toBe("");
		expect(stringAndNullish.encode("")).toBe("");
		expect(nullishStringAndString.decode("")).toBe("");
		expect(nullishStringAndString.encode(undefined)).toBe("");
	});
});
