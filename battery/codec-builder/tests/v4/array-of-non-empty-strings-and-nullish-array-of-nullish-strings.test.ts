import { describe, expect, test } from "bun:test";
import { arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings } from "../../src/v4/codec-builders/strict-field-adapter/field-codecs/molecules/array-of-non-empty-strings-and-nullish-array-of-nullish-strings";
import { reverseCodecDirections } from "../../src/v4/codec-builders/strict-field-adapter/helpers/casters/reverse-codec-directions";

describe("arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings", () => {
	test("normalizes nullish arrays to an empty array", () => {
		expect(
			arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings.fromInput(
				undefined,
			),
		).toEqual([]);
		expect(
			arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings.fromInput(
				null,
			),
		).toEqual([]);
		expect(
			arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings.inputSchema.parse(
				undefined,
			),
		).toBeUndefined();
		expect(
			arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings.inputSchema.parse(
				null,
			),
		).toBeNull();
	});

	test("drops nullish and empty string items", () => {
		expect(
			arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings.fromInput([
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
			arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings.fromOutput([
				"a",
				"b",
			]),
		).toEqual(["a", "b"]);
	});

	test("uses non-empty strings in the output schema", () => {
		expect(() =>
			arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings.outputSchema.parse(
				[""],
			),
		).toThrow();
		expect(
			arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings.outputSchema.parse(
				["a"],
			),
		).toEqual(["a"]);
	});
});

const nullishArrayOfNullishStringsAndArrayOfNonEmptyStrings =
	reverseCodecDirections(
		arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings,
	);

describe("nullishArrayOfNullishStringsAndArrayOfNonEmptyStrings", () => {
	test("filters nullish and empty values on fromOutput", () => {
		expect(
			nullishArrayOfNullishStringsAndArrayOfNonEmptyStrings.fromOutput([
				"a",
				null,
				"",
				undefined,
			]),
		).toEqual(["a"]);
	});
});
