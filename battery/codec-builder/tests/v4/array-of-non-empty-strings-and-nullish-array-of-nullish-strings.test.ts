import { describe, expect, test } from "bun:test";
import { z } from "zod/v4";
import { arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings } from "../../src/v4/codec-builders/strict-field-adapter/field-codecs/molecules/array-of-non-empty-strings-and-nullish-array-of-nullish-strings";

describe("arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings", () => {
	test("normalizes nullish arrays to an empty array", () => {
		expect(
			arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings.decode(
				undefined,
			),
		).toEqual([]);
		expect(
			arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings.decode(null),
		).toEqual([]);
		expect(
			arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings.in.parse(
				undefined,
			),
		).toBeUndefined();
		expect(
			arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings.in.parse(
				null,
			),
		).toBeNull();
	});

	test("drops nullish and empty string items", () => {
		expect(
			arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings.decode([
				"a",
				null,
				"",
				undefined,
				"b",
			]),
		).toEqual(["a", "b"]);
	});

	test("keeps non-empty strings when converting back", () => {
		expect(
			arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings.encode([
				"a",
				"b",
			]),
		).toEqual(["a", "b"]);
	});

	test("uses non-empty strings in the output schema", () => {
		expect(() =>
			arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings.out.parse([
				"",
			]),
		).toThrow();
		expect(
			arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings.out.parse([
				"a",
			]),
		).toEqual(["a"]);
	});
});

const nullishArrayOfNullishStringsAndArrayOfNonEmptyStrings = z.invertCodec(
	arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings,
);

describe("nullishArrayOfNullishStringsAndArrayOfNonEmptyStrings", () => {
	test("filters nullish and empty values on encode", () => {
		expect(
			nullishArrayOfNullishStringsAndArrayOfNonEmptyStrings.encode([
				"a",
				null,
				"",
				undefined,
			]),
		).toEqual(["a"]);
	});
});
