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
		expect(nullableDateCodec.decode(undefined)).toBeNull();
		expect(nullableDateCodec.decode("2024-01-02")).toEqual(
			new Date("2024-01-02"),
		);
		expect(
			nullableDateCodec.encode(new Date("2024-01-02T03:04:05.000Z")),
		).toBe("2024-01-02T03:04:05.000Z");

		const optionalDateCodec = c.optional.date.and.isoString;
		expect(optionalDateCodec.decode(undefined)).toBeUndefined();
		expect(
			optionalDateCodec.encode(new Date("2024-01-02T03:04:05.000Z")),
		).toBe("2024-01-02T03:04:05.000Z");

		const nullishDateCodec = c.nullish.date.and.isoString;
		expect(nullishDateCodec.decode(undefined)).toBeUndefined();
		expect(nullishDateCodec.decode(null)).toBeNull();
		expect(nullishDateCodec.decode("2024-01-02")).toEqual(
			new Date("2024-01-02"),
		);

		const defaultedDateCodec = c.nonNullish.date.and.nullish.isoString;
		expect(defaultedDateCodec.decode("2024-01-02")).toEqual(
			new Date("2024-01-02"),
		);
		expect(defaultedDateCodec.decode(undefined)).toBeInstanceOf(Date);
		expect(
			defaultedDateCodec.encode(new Date("2024-01-02T03:04:05.000Z")),
		).toBe("2024-01-02T03:04:05.000Z");
		expect(defaultedDateCodec.in.parse(undefined)).toBeUndefined();
		expect(defaultedDateCodec.out.parse(new Date("2024-01-02"))).toEqual(
			new Date("2024-01-02"),
		);

		const nullableIsoStringCodec = c.nullable.isoString.and.date;
		expect(nullableIsoStringCodec.decode(undefined)).toBeNull();
		expect(
			nullableIsoStringCodec.decode(new Date("2024-01-02T03:04:05.000Z")),
		).toBe("2024-01-02T03:04:05.000Z");

		const optionalIsoStringCodec = c.optional.isoString.and.date;
		expect(optionalIsoStringCodec.decode(undefined)).toBeUndefined();
		expect(
			optionalIsoStringCodec.decode(new Date("2024-01-02T03:04:05.000Z")),
		).toBe("2024-01-02T03:04:05.000Z");

		const nullishIsoStringCodec = c.nullish.isoString.and.date;
		expect(nullishIsoStringCodec.decode(undefined)).toBeUndefined();
		expect(nullishIsoStringCodec.decode(null)).toBeNull();

		const defaultedIsoStringCodec = c.nonNullish.isoString.and.nullish.date;
		expect(
			defaultedIsoStringCodec.decode(
				new Date("2024-01-02T03:04:05.000Z"),
			),
		).toBe("2024-01-02T03:04:05.000Z");
		expect(typeof defaultedIsoStringCodec.decode(undefined)).toBe("string");
		expect(
			defaultedIsoStringCodec.encode("2024-01-02T03:04:05.000Z"),
		).toEqual(new Date("2024-01-02T03:04:05.000Z"));
	});

	test("exposes lifted scalar codecs through the new nullable and nullish paths", () => {
		expect(c.nullable.string.and.string.decode(undefined)).toBeNull();
		expect(c.nonNullish.string.and.nullish.string.decode(undefined)).toBe(
			"",
		);
		expect(c.nonNullish.string.and.nullish.string.encode("x")).toBe("x");

		expect(
			c.nullable.numericString.and.number.decode(undefined),
		).toBeNull();
		expect(c.optional.numericString.and.number.decode(undefined)).toBe(
			undefined,
		);
		expect(c.nullish.numericString.and.number.decode(undefined)).toBe(
			undefined,
		);
		expect(c.nullish.numericString.and.number.decode(null)).toBeNull();
		expect(
			c.nonNullish.numericString.and.nullish.number.decode(undefined),
		).toBe("0");
		expect(c.nullable.numericString.and.int.decode(undefined)).toBeNull();
		expect(c.optional.numericString.and.int.decode(undefined)).toBe(
			undefined,
		);
		expect(c.nullish.numericString.and.int.decode(null)).toBeNull();
		expect(
			c.nonNullish.numericString.and.nullish.int.decode(undefined),
		).toBe("0");

		expect(
			c.nullable.number.and.numericString.decode(undefined),
		).toBeNull();
		expect(c.optional.number.and.numericString.decode(undefined)).toBe(
			undefined,
		);
		expect(c.nullish.number.and.numericString.decode(null)).toBeNull();
		expect(
			c.nonNullish.number.and.nullish.numericString.decode(undefined),
		).toBe(0);

		expect(c.nullable.yesNo.and.boolean.decode(undefined)).toBeNull();
		expect(c.optional.yesNo.and.boolean.decode(undefined)).toBeUndefined();
		expect(c.nullish.yesNo.and.boolean.decode(null)).toBeNull();
		expect(c.nonNullish.yesNo.and.nullish.boolean.decode(undefined)).toBe(
			"No",
		);

		expect(c.nullable.boolean.and.yesNo.decode(undefined)).toBeNull();
		expect(c.optional.boolean.and.yesNo.decode(undefined)).toBeUndefined();
		expect(c.nullish.boolean.and.yesNo.decode(null)).toBeNull();
		expect(c.nonNullish.boolean.and.nullish.yesNo.decode(undefined)).toBe(
			false,
		);

		expect(c.nullable.int.and.numericString.decode(undefined)).toBeNull();
		expect(c.optional.int.and.numericString.decode(undefined)).toBe(
			undefined,
		);
		expect(c.nullish.int.and.numericString.decode(null)).toBeNull();
		expect(
			c.nonNullish.int.and.nullish.numericString.decode(undefined),
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
			adapter.decode({
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
			adapter.encode({
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
			adapter.decode({
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
		expect(arrayOfCodec.decode([undefined, "a", null])).toEqual([
			"",
			"a",
			"",
		]);
		expect(arrayOfCodec.encode(["", "a"])).toEqual(["", "a"]);

		const nullableUnionCodec =
			codecBuilder.helpers.buildNullableUnionAndNullishString([
				"draft",
				"published",
			] as const);
		expect(nullableUnionCodec.decode(undefined)).toBeNull();
		expect(nullableUnionCodec.decode("draft")).toBe("draft");
		expect(nullableUnionCodec.decode("invalid")).toBeNull();

		const filteredArrayCodec =
			codecBuilder.helpers.buildFilteredNullishArrayCodec(
				z.string().nullish(),
				z.string().min(1),
			);
		expect(
			filteredArrayCodec.decode(["a", "", null, undefined, "b"]),
		).toEqual(["a", "b"]);

		const nullableWrappedCodec = codecBuilder.helpers.toNullable(
			c.nonNullish.numericString.and.int,
		);
		expect(nullableWrappedCodec.decode(undefined)).toBeNull();
		expect(nullableWrappedCodec.encode(null)).toBeNull();
		expect(nullableWrappedCodec.decode(4)).toBe("4");

		const optionalWrappedCodec = codecBuilder.helpers.toOptional(
			c.nonNullish.numericString.and.int,
		);
		expect(optionalWrappedCodec.decode(undefined)).toBeUndefined();
		expect(optionalWrappedCodec.encode(undefined)).toBeUndefined();
		expect(optionalWrappedCodec.decode(4)).toBe("4");
		expect(optionalWrappedCodec.in.parse(undefined)).toBeUndefined();
		expect(optionalWrappedCodec.out.parse(undefined)).toBeUndefined();
		expect(() => optionalWrappedCodec.out.parse(null)).toThrow();

		const nullishWrappedCodec = codecBuilder.helpers.toNullish(
			c.nonNullish.numericString.and.int,
		);
		expect(nullishWrappedCodec.decode(undefined)).toBeUndefined();
		expect(nullishWrappedCodec.decode(null)).toBeNull();
		expect(nullishWrappedCodec.encode(undefined)).toBeUndefined();
		expect(nullishWrappedCodec.encode(null)).toBeNull();
		expect(nullishWrappedCodec.in.parse(null)).toBeNull();
		expect(nullishWrappedCodec.out.parse(undefined)).toBeUndefined();
		expect(nullishWrappedCodec.out.parse(null)).toBeNull();

		const defaultedWrappedCodec =
			codecBuilder.helpers.toNonNullishWithDefault(
				nullableWrappedCodec,
				"0",
			);
		expect(defaultedWrappedCodec.decode(4)).toBe("4");
		expect(defaultedWrappedCodec.decode(undefined)).toBe("0");
		expect(defaultedWrappedCodec.encode("4")).toBe(4);
		expect(defaultedWrappedCodec.in.parse(undefined)).toBeUndefined();
		expect(() => defaultedWrappedCodec.out.parse(null)).toThrow();

		const liftedNumericStringCodec = codecBuilder.helpers.toNullable(
			c.nonNullish.numericString.and.number,
		);
		expect(liftedNumericStringCodec.decode(undefined)).toBeNull();
		expect(liftedNumericStringCodec.decode(4)).toBe("4");
		expect(liftedNumericStringCodec.out.parse(null)).toBeNull();

		const strictStringCodec = codecBuilder.helpers.toNonNullishWithDefault(
			z.codec(z.string().nullish(), z.string().nullable(), {
				decode: (value) => value ?? null,
				encode: (value) =>
					value == null || value === "" ? undefined : value,
			}),
			"",
		);
		expect(strictStringCodec.decode("x")).toBe("x");
		expect(strictStringCodec.decode(undefined)).toBe("");
		expect(strictStringCodec.encode("")).toBeUndefined();
		expect(strictStringCodec.encode("x")).toBe("x");
	});

	test("pipes codecs through the nested helpers object", () => {
		const numberToString = z.codec(z.number(), z.string(), {
			decode: (value) => String(value),
			encode: (value) => Number(value),
		});

		const stringToWrappedString = z.codec(z.string(), z.string(), {
			decode: (value) => `[${value}]`,
			encode: (value) => value.slice(1, -1),
		});

		const pipedCodec = codecBuilder.helpers.pipeCodecs(
			numberToString,
			stringToWrappedString,
		);

		expect(pipedCodec.decode(1234)).toBe("[1234]");
		expect(pipedCodec.encode("[3]")).toBe(3);
		expect(pipedCodec.in.parse(5)).toBe(5);
		expect(pipedCodec.out.parse("[2]")).toBe("[2]");
	});
});
