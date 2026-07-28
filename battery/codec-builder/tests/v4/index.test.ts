import { describe, expect, test } from "bun:test";
import { z } from "zod/v4";
import { codecBuilder4 as codecBuilder } from "../../src/v4";

describe("codecBuilder.helpers", () => {
	const c = codecBuilder.fieldCodec;

	test("namespaces field codecs by value family and nullability", () => {
		expect(c.optional.date.and.isoString).toBeDefined();
		expect(c.nullish.date.and.isoString).toBeDefined();
		expect(c.nonNullish.string.and.nullish.string).toBeDefined();
		expect(c.nullable.string.and.string).toBeDefined();
		expect(c.optional.number.and.numericString).toBeDefined();
		expect(c.nullish.number.and.numericString).toBeDefined();
		expect(c.nonNullish.number.and.nullish.numericString).toBeDefined();
		expect(c.nullable.number.and.numericString).toBeDefined();
		expect(c.optional.numericString.and.number).toBeDefined();
		expect(c.optional.numericString.and.int).toBeDefined();
		expect(c.nullish.numericString.and.number).toBeDefined();
		expect(c.nullish.numericString.and.int).toBeDefined();
		expect(c.nonNullish.numericString.and.int).toBeDefined();
		expect(c.nonNullish.numericString.and.nullish.number).toBeDefined();
		expect(c.nonNullish.numericString.and.nullish.int).toBeDefined();
		expect(c.nullable.numericString.and.number).toBeDefined();
		expect(c.nullable.numericString.and.int).toBeDefined();
		expect(c.optional.isoString.and.date).toBeDefined();
		expect(c.nullish.isoString.and.date).toBeDefined();
		expect(c.nonNullish.date.and.isoString).toBeDefined();
		expect(c.nonNullish.date.and.nullish.isoString).toBeDefined();
		expect(c.nullable.date.and.isoString).toBeDefined();
		expect(c.nonNullish.isoString.and.date).toBeDefined();
		expect(c.nonNullish.isoString.and.nullish.date).toBeDefined();
		expect(c.nullable.isoString.and.date).toBeDefined();
		expect(c.optional.yesNo.and.boolean).toBeDefined();
		expect(c.nullish.yesNo.and.boolean).toBeDefined();
		expect(c.nonNullish.yesNo.and.boolean).toBeDefined();
		expect(c.nonNullish.yesNo.and.nullish.boolean).toBeDefined();
		expect(c.nullable.yesNo.and.boolean).toBeDefined();
		expect(c.optional.boolean.and.yesNo).toBeDefined();
		expect(c.nullish.boolean.and.yesNo).toBeDefined();
		expect(c.nonNullish.boolean.and.yesNo).toBeDefined();
		expect(c.nonNullish.boolean.and.nullish.yesNo).toBeDefined();
		expect(c.nullable.boolean.and.yesNo).toBeDefined();
		expect(c.optional.int.and.numericString).toBeDefined();
		expect(c.nullish.int.and.numericString).toBeDefined();
		expect(c.nonNullish.int.and.numericString).toBeDefined();
		expect(c.nonNullish.int.and.nullish.numericString).toBeDefined();
		expect(c.nullable.int.and.numericString).toBeDefined();
		expect("emptiableStringAndNullishString" in c).toBeFalse();
		expect("numericStringAndInt" in c).toBeFalse();
	});

	test("exposes lifted date and iso-string codecs through the new nullable and nullish paths", () => {
		const nullableDateCodec = c.nullable.date.and.isoString;
		expect(nullableDateCodec.fromInput(undefined)).toBeNull();
		expect(nullableDateCodec.fromInput("2024-01-02")).toEqual(
			new Date("2024-01-02"),
		);
		expect(
			nullableDateCodec.fromOutput(new Date("2024-01-02T03:04:05.000Z")),
		).toBe("2024-01-02T03:04:05.000Z");

		const optionalDateCodec = c.optional.date.and.isoString;
		expect(optionalDateCodec.fromInput(undefined)).toBeUndefined();
		expect(
			optionalDateCodec.fromOutput(new Date("2024-01-02T03:04:05.000Z")),
		).toBe("2024-01-02T03:04:05.000Z");

		const nullishDateCodec = c.nullish.date.and.isoString;
		expect(nullishDateCodec.fromInput(undefined)).toBeUndefined();
		expect(nullishDateCodec.fromInput(null)).toBeNull();
		expect(nullishDateCodec.fromInput("2024-01-02")).toEqual(
			new Date("2024-01-02"),
		);

		const defaultedDateCodec = c.nonNullish.date.and.nullish.isoString;
		expect(defaultedDateCodec.fromInput("2024-01-02")).toEqual(
			new Date("2024-01-02"),
		);
		expect(defaultedDateCodec.fromInput(undefined)).toBeInstanceOf(Date);
		expect(
			defaultedDateCodec.fromOutput(new Date("2024-01-02T03:04:05.000Z")),
		).toBe("2024-01-02T03:04:05.000Z");
		expect(defaultedDateCodec.inputSchema.parse(undefined)).toBeUndefined();
		expect(
			defaultedDateCodec.outputSchema.parse(new Date("2024-01-02")),
		).toEqual(new Date("2024-01-02"));

		const nullableIsoStringCodec = c.nullable.isoString.and.date;
		expect(nullableIsoStringCodec.fromInput(undefined)).toBeNull();
		expect(
			nullableIsoStringCodec.fromInput(
				new Date("2024-01-02T03:04:05.000Z"),
			),
		).toBe("2024-01-02T03:04:05.000Z");

		const optionalIsoStringCodec = c.optional.isoString.and.date;
		expect(optionalIsoStringCodec.fromInput(undefined)).toBeUndefined();
		expect(
			optionalIsoStringCodec.fromInput(
				new Date("2024-01-02T03:04:05.000Z"),
			),
		).toBe("2024-01-02T03:04:05.000Z");

		const nullishIsoStringCodec = c.nullish.isoString.and.date;
		expect(nullishIsoStringCodec.fromInput(undefined)).toBeUndefined();
		expect(nullishIsoStringCodec.fromInput(null)).toBeNull();

		const defaultedIsoStringCodec = c.nonNullish.isoString.and.nullish.date;
		expect(
			defaultedIsoStringCodec.fromInput(
				new Date("2024-01-02T03:04:05.000Z"),
			),
		).toBe("2024-01-02T03:04:05.000Z");
		expect(typeof defaultedIsoStringCodec.fromInput(undefined)).toBe(
			"string",
		);
		expect(
			defaultedIsoStringCodec.fromOutput("2024-01-02T03:04:05.000Z"),
		).toEqual(new Date("2024-01-02T03:04:05.000Z"));
	});

	test("exposes lifted scalar codecs through the new nullable and nullish paths", () => {
		expect(c.nullable.string.and.string.fromInput(undefined)).toBeNull();
		expect(
			c.nonNullish.string.and.nullish.string.fromInput(undefined),
		).toBe("");
		expect(c.nonNullish.string.and.nullish.string.fromOutput("x")).toBe(
			"x",
		);

		expect(
			c.nullable.numericString.and.number.fromInput(undefined),
		).toBeNull();
		expect(c.optional.numericString.and.number.fromInput(undefined)).toBe(
			undefined,
		);
		expect(c.nullish.numericString.and.number.fromInput(undefined)).toBe(
			undefined,
		);
		expect(c.nullish.numericString.and.number.fromInput(null)).toBeNull();
		expect(
			c.nonNullish.numericString.and.nullish.number.fromInput(undefined),
		).toBe("0");
		expect(
			c.nullable.numericString.and.int.fromInput(undefined),
		).toBeNull();
		expect(c.optional.numericString.and.int.fromInput(undefined)).toBe(
			undefined,
		);
		expect(c.nullish.numericString.and.int.fromInput(null)).toBeNull();
		expect(
			c.nonNullish.numericString.and.nullish.int.fromInput(undefined),
		).toBe("0");

		expect(
			c.nullable.number.and.numericString.fromInput(undefined),
		).toBeNull();
		expect(c.optional.number.and.numericString.fromInput(undefined)).toBe(
			undefined,
		);
		expect(c.nullish.number.and.numericString.fromInput(null)).toBeNull();
		expect(
			c.nonNullish.number.and.nullish.numericString.fromInput(undefined),
		).toBe(0);

		expect(c.nullable.yesNo.and.boolean.fromInput(undefined)).toBeNull();
		expect(
			c.optional.yesNo.and.boolean.fromInput(undefined),
		).toBeUndefined();
		expect(c.nullish.yesNo.and.boolean.fromInput(null)).toBeNull();
		expect(
			c.nonNullish.yesNo.and.nullish.boolean.fromInput(undefined),
		).toBe("No");

		expect(c.nullable.boolean.and.yesNo.fromInput(undefined)).toBeNull();
		expect(
			c.optional.boolean.and.yesNo.fromInput(undefined),
		).toBeUndefined();
		expect(c.nullish.boolean.and.yesNo.fromInput(null)).toBeNull();
		expect(
			c.nonNullish.boolean.and.nullish.yesNo.fromInput(undefined),
		).toBe(false);

		expect(
			c.nullable.int.and.numericString.fromInput(undefined),
		).toBeNull();
		expect(c.optional.int.and.numericString.fromInput(undefined)).toBe(
			undefined,
		);
		expect(c.nullish.int.and.numericString.fromInput(null)).toBeNull();
		expect(
			c.nonNullish.int.and.nullish.numericString.fromInput(undefined),
		).toBe(0);
	});

	test("namespaces helper builders under helpers", () => {
		expect(codecBuilder.buildStrictFieldAdapter).toBeDefined();
		expect(codecBuilder.helpers.toArrayOf).toBeDefined();
		expect(codecBuilder.helpers.toOptional).toBeDefined();
		expect(codecBuilder.helpers.toNullable).toBeDefined();
		expect(codecBuilder.helpers.toNullish).toBeDefined();
		expect(codecBuilder.helpers.toNonNullishWithDefault).toBeDefined();
		expect(
			codecBuilder.helpers.buildNullableUnionAndNullishString,
		).toBeDefined();
		expect(
			codecBuilder.helpers.buildFilteredNullishArrayCodec,
		).toBeDefined();
		expect(codecBuilder.helpers.pipeCodecs).toBeDefined();

		expect("toArrayOf" in codecBuilder).toBeFalse();
		expect("toOptional" in codecBuilder).toBeFalse();
		expect("toNullable" in codecBuilder).toBeFalse();
		expect("toNullish" in codecBuilder).toBeFalse();
		expect("toNonNullishWithDefault" in codecBuilder).toBeFalse();
		expect(
			"buildNullableUnionAndNullishString" in codecBuilder,
		).toBeFalse();
		expect("buildFilteredNullishArrayCodec" in codecBuilder).toBeFalse();
		expect("pipeCodecs" in codecBuilder).toBeFalse();
	});

	test("builds a strict field adapter without schemas", () => {
		const adapter = codecBuilder.buildStrictFieldAdapter<{
			id: number;
			dates: string[];
			nested: { enabled: "Yes" | "No" };
		}>()({
			id: codecBuilder.fieldCodec.nonNullish.numericString.and.number,
			dates: codecBuilder.fieldCodec.arrayOf(
				codecBuilder.fieldCodec.nonNullish.date.and.isoString,
			),
			nested: {
				enabled: codecBuilder.fieldCodec.nonNullish.boolean.and.yesNo,
			},
		});

		expect(
			adapter.fromInput({
				id: 42,
				dates: ["2024-01-02T03:04:05.000Z"],
				nested: { enabled: "Yes" },
			}),
		).toEqual({
			id: "42",
			dates: [new Date("2024-01-02T03:04:05.000Z")],
			nested: { enabled: true },
		});

		expect(
			adapter.fromOutput({
				id: "42",
				dates: [new Date("2024-01-02T03:04:05.000Z")],
				nested: { enabled: true },
			}),
		).toEqual({
			id: 42,
			dates: ["2024-01-02T03:04:05.000Z"],
			nested: { enabled: "Yes" },
		});
	});

	test("maps empty string date fields to null through a nullable object codec", () => {
		const adapter = codecBuilder.buildStrictFieldAdapter<{
			submittedAt: string | null | undefined;
		}>()({
			submittedAt: codecBuilder.fieldCodec.nullable.date.and.isoString,
		});

		expect(
			adapter.fromInput({
				submittedAt: "",
			}),
		).toEqual({
			submittedAt: null,
		});
	});

	test("exposes working helper builders through the nested helpers object", () => {
		const arrayOfCodec = codecBuilder.helpers.toArrayOf(
			c.nonNullish.string.and.nullish.string,
		);
		expect(arrayOfCodec.fromInput([undefined, "a", null])).toEqual([
			"",
			"a",
			"",
		]);
		expect(arrayOfCodec.fromOutput(["", "a"])).toEqual(["", "a"]);

		const nullableUnionCodec =
			codecBuilder.helpers.buildNullableUnionAndNullishString([
				"draft",
				"published",
			] as const);
		expect(nullableUnionCodec.fromInput(undefined)).toBeNull();
		expect(nullableUnionCodec.fromInput("draft")).toBe("draft");
		expect(nullableUnionCodec.fromInput("invalid")).toBeNull();

		const filteredArrayCodec =
			codecBuilder.helpers.buildFilteredNullishArrayCodec(
				z.string().nullish(),
				z.string().min(1),
			);
		expect(
			filteredArrayCodec.fromInput(["a", "", null, undefined, "b"]),
		).toEqual(["a", "b"]);

		const nullableWrappedCodec = codecBuilder.helpers.toNullable(
			c.nonNullish.numericString.and.int,
		);
		expect(nullableWrappedCodec.fromInput(undefined)).toBeNull();
		expect(nullableWrappedCodec.fromOutput(null)).toBeNull();
		expect(nullableWrappedCodec.fromInput(4)).toBe("4");

		const optionalWrappedCodec = codecBuilder.helpers.toOptional(
			c.nonNullish.numericString.and.int,
		);
		expect(optionalWrappedCodec.fromInput(undefined)).toBeUndefined();
		expect(optionalWrappedCodec.fromOutput(undefined)).toBeUndefined();
		expect(optionalWrappedCodec.fromInput(4)).toBe("4");
		expect(
			optionalWrappedCodec.inputSchema.parse(undefined),
		).toBeUndefined();
		expect(
			optionalWrappedCodec.outputSchema.parse(undefined),
		).toBeUndefined();
		expect(() => optionalWrappedCodec.outputSchema.parse(null)).toThrow();

		const nullishWrappedCodec = codecBuilder.helpers.toNullish(
			c.nonNullish.numericString.and.int,
		);
		expect(nullishWrappedCodec.fromInput(undefined)).toBeUndefined();
		expect(nullishWrappedCodec.fromInput(null)).toBeNull();
		expect(nullishWrappedCodec.fromOutput(undefined)).toBeUndefined();
		expect(nullishWrappedCodec.fromOutput(null)).toBeNull();
		expect(nullishWrappedCodec.inputSchema.parse(null)).toBeNull();
		expect(
			nullishWrappedCodec.outputSchema.parse(undefined),
		).toBeUndefined();
		expect(nullishWrappedCodec.outputSchema.parse(null)).toBeNull();

		const defaultedWrappedCodec =
			codecBuilder.helpers.toNonNullishWithDefault(
				nullableWrappedCodec,
				"0",
			);
		expect(defaultedWrappedCodec.fromInput(4)).toBe("4");
		expect(defaultedWrappedCodec.fromInput(undefined)).toBe("0");
		expect(defaultedWrappedCodec.fromOutput("4")).toBe(4);
		expect(
			defaultedWrappedCodec.inputSchema.parse(undefined),
		).toBeUndefined();
		expect(() => defaultedWrappedCodec.outputSchema.parse(null)).toThrow();

		const liftedNumericStringCodec = codecBuilder.helpers.toNullable(
			c.nonNullish.numericString.and.number,
		);
		expect(liftedNumericStringCodec.fromInput(undefined)).toBeNull();
		expect(liftedNumericStringCodec.fromInput(4)).toBe("4");
		expect(liftedNumericStringCodec.outputSchema.parse(null)).toBeNull();

		const strictStringCodec = codecBuilder.helpers.toNonNullishWithDefault(
			{
				fromInput: (value: string | null | undefined) => value ?? null,
				fromOutput: (value: string | null) =>
					value == null || value === "" ? undefined : value,
				inputSchema: z.string().nullish(),
				outputSchema: z.string().nullable(),
			},
			"",
		);
		expect(strictStringCodec.fromInput("x")).toBe("x");
		expect(strictStringCodec.fromInput(undefined)).toBe("");
		expect(strictStringCodec.fromOutput("")).toBeUndefined();
		expect(strictStringCodec.fromOutput("x")).toBe("x");
	});

	test("pipes codecs through the nested helpers object", () => {
		const numberToString = {
			fromInput: (value: number) => String(value),
			fromOutput: (value: string) => Number(value),
			inputSchema: z.number(),
			outputSchema: z.string(),
		};

		const stringToWrappedString = {
			fromInput: (value: string) => `[${value}]`,
			fromOutput: (value: string) => value.slice(1, -1),
			inputSchema: z.string(),
			outputSchema: z.string(),
		};

		const pipedCodec = codecBuilder.helpers.pipeCodecs(
			numberToString,
			stringToWrappedString,
		);

		expect(pipedCodec.fromInput(1234)).toBe("[1234]");
		expect(pipedCodec.fromOutput("[3]")).toBe(3);
		expect(pipedCodec.inputSchema.parse(5)).toBe(5);
		expect(pipedCodec.outputSchema.parse("[2]")).toBe("[2]");
	});
});
