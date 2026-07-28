import { describe, expect, test } from "bun:test";
import { z } from "zod/v4";
import { codecBuilder4 as codecBuilder } from "../../src/v4";
import {
	buildStrictFieldAdapter,
	buildStrictFieldAdapterCodec,
	type ShapeOfStrictFieldAdapter,
	type ShapeOfStrictFieldAdapterCodec,
} from "../../src/v4/codec-builders/strict-field-adapter/build-strict-field-adapter-codec";
import { yesNoAndBoolean } from "../../src/v4/codec-builders/strict-field-adapter/field-codecs/atoms/core-non-nullable-codecs/yes-no-and-boolean";
import { pipeCodecs } from "../../src/v4/core/pipe-codecs";

// -- Assertions --

const c = codecBuilder.fieldCodec;
const yesNoBool = yesNoAndBoolean;

type Properties<T> = {
	[K in keyof T]-?: z.ZodType<T[K], T[K]>;
};

interface Counterparty {
	id: number | null;
}

interface Client {
	id: number;
	counterparties: Counterparty[];
}

function ClientSchemaWidened(): z.ZodObject<Properties<Client>> {
	return z.object({
		id: z.number(),
		counterparties: z.array(
			z.object({
				id: z.number().nullable(),
			}),
		),
	}) as unknown as z.ZodObject<Properties<Client>>;
}

const counterpartyCodec = {
	id: c.noOp,
};

const widened = buildStrictFieldAdapterCodec(ClientSchemaWidened(), {
	id: c.noOp,
	counterparties: c.arrayOf(counterpartyCodec),
});

const widenedAdapter = buildStrictFieldAdapter<Client>()({
	id: c.noOp,
	counterparties: c.arrayOf(counterpartyCodec),
});

buildStrictFieldAdapterCodec(ClientSchemaWidened(), {
	// @ts-expect-error widened scalar number field cannot use yes/no codec
	id: yesNoBool,
	counterparties: c.arrayOf(counterpartyCodec),
});

const widenedScalarCannotUseArrayShape = () =>
	buildStrictFieldAdapterCodec(ClientSchemaWidened(), {
		// @ts-expect-error widened scalar number field cannot use array shape
		id: c.arrayOf(counterpartyCodec),
		counterparties: c.arrayOf(counterpartyCodec),
	});

type WidenedOutput = z.infer<typeof widened.out>;
const widenedArrayCheck: WidenedOutput["counterparties"] = [{ id: 1 }];
type CounterpartyId = WidenedOutput["counterparties"][number]["id"];
type WidenedAdapterOutput = ReturnType<typeof widenedAdapter.decode>;
type AdapterCounterpartyId =
	WidenedAdapterOutput["counterparties"][number]["id"];

type IsAny<T> = 0 extends 1 & T ? true : false;
type Assert<T extends true> = T;
type AssertFalse<T extends false> = T;
type _wideSchemaHasWideTypeName = Assert<
	z.core.$ZodTypeDef["type"] extends z.ZodType<
		Counterparty[],
		Counterparty[]
	>["_zod"]["def"]["type"]
		? true
		: false
>;

type _counterpartyIdIsNotAny = AssertFalse<IsAny<CounterpartyId>>;
type _counterpartyIdMatches = Assert<
	CounterpartyId extends number | null ? true : false
>;
type _adapterCounterpartyIdIsNotAny = AssertFalse<IsAny<AdapterCounterpartyId>>;
type _adapterCounterpartyIdMatches = Assert<
	AdapterCounterpartyId extends number | null ? true : false
>;

const strict = z.object({
	id: z.number(),
});

buildStrictFieldAdapterCodec(strict, {
	// @ts-expect-error number field cannot use yes/no codec
	id: yesNoBool,
});

const strictScalarCannotUseArrayShape = () =>
	buildStrictFieldAdapterCodec(strict, {
		// @ts-expect-error scalar field cannot use array shape
		id: c.arrayOf(counterpartyCodec),
	});

buildStrictFieldAdapter<{ id: number }>()({
	// @ts-expect-error number field cannot use yes/no codec
	id: yesNoBool,
});

buildStrictFieldAdapter<{ id: number }>()({
	// @ts-expect-error scalar field cannot use array shape
	id: c.arrayOf(counterpartyCodec),
});

const numberOrStringInputCodec = z.codec(
	z.union([z.number(), z.string()]),
	z.string(),
	{
		decode: (value) => String(value),
		encode: (value) => Number(value),
	},
) satisfies z.ZodCodec<z.ZodUnion<[z.ZodNumber, z.ZodString]>, z.ZodString>;

buildStrictFieldAdapterCodec(strict, {
	id: numberOrStringInputCodec,
});

const strictMappedWithWiderInputCodec = buildStrictFieldAdapterCodec(strict, {
	id: numberOrStringInputCodec,
});

const strictArray = z.object({
	dates: z.array(z.number()),
});

const numberToDateCodec = z.codec(z.number(), z.date(), {
	decode: (value) => new Date(value),
	encode: (value) => value.getTime(),
}) satisfies z.ZodCodec<z.ZodNumber, z.ZodDate>;

const dateToIsoCodec = z.codec(z.date(), z.string(), {
	decode: (value) => value.toISOString(),
	encode: (value) => new Date(value),
}) satisfies z.ZodCodec<z.ZodDate, z.ZodString>;

const publicCodec = z.codec(z.number(), z.string(), {
	decode: (value) => String(value),
	encode: (value) => Number(value),
}) satisfies z.ZodCodec<z.ZodNumber, z.ZodString>;

const pipedDateToIsoCodec = pipeCodecs(numberToDateCodec, dateToIsoCodec);
type PipedDateToIsoInput = z.infer<typeof pipedDateToIsoCodec.in>;
type PipedDateToIsoOutput = z.infer<typeof pipedDateToIsoCodec.out>;
const pipedDateToIsoInput: PipedDateToIsoInput = 1;
const pipedDateToIsoOutput: PipedDateToIsoOutput = "2020-01-01T00:00:00.000Z";

const strictArrayMapped = buildStrictFieldAdapterCodec(strictArray, {
	dates: c.arrayOf(numberToDateCodec),
});

type StrictArrayMappedOutput = z.infer<typeof strictArrayMapped.out>;
const strictArrayMappedCheck: StrictArrayMappedOutput["dates"] = [new Date()];

buildStrictFieldAdapterCodec(strictArray, {
	// @ts-expect-error number[] item cannot use yes/no codec
	dates: c.arrayOf(yesNoBool),
});

buildStrictFieldAdapter<{ dates: number[] }>()({
	// @ts-expect-error number[] item cannot use yes/no codec
	dates: c.arrayOf(yesNoBool),
});

const strictNested = z.object({
	a: z.object({
		b: z.number(),
		c: z.string(),
	}),
});

const strictNestedShapeWithUnknownKey = () =>
	buildStrictFieldAdapterCodec(strictNested, {
		a: {
			b: c.noOp,
			c: c.noOp,
			packed: c.noOp,
		},
	});

const questionnaireServerSchema = z.object({
	ans_to_q1: z.string(),
	comment_to_q1_: z.string(),
	id: z.number(),
	dateOfConstruction: z.string(),
	answers: z.array(
		z.object({
			ans_to_q2: z.string(),
			comment_to_q2_: z.string(),
		}),
	),
});

type QuestionnaireServer = z.infer<typeof questionnaireServerSchema>;
const questionnaireAnswersItemShape = {
	ans_to_q2: c.noOp,
	comment_to_q2_: c.noOp,
} satisfies ShapeOfStrictFieldAdapterCodec<
	QuestionnaireServer["answers"][number]
>;

const questionnaireAnswersItemAdapterShape = {
	ans_to_q2: c.noOp,
	comment_to_q2_: c.noOp,
} satisfies ShapeOfStrictFieldAdapter<QuestionnaireServer["answers"][number]>;

const questionnaireAnswersItemShapeWithWrongKey = {
	ans_to_q2: c.noOp,
	comment_to_q2_: c.noOp,
	// @ts-expect-error typo key should be rejected at declaration site
	comment_to_q2: c.noOp,
} satisfies ShapeOfStrictFieldAdapterCodec<
	QuestionnaireServer["answers"][number]
>;

// -- Tests --

describe("buildStrictFieldAdapterCodec", () => {
	test("preserves widened nullable array item ids through the codec and adapter", () => {
		const input = {
			id: 1,
			counterparties: [{ id: 2 }, { id: null }],
		} satisfies Client;

		expect(widened).toBeInstanceOf(z.ZodCodec);
		expect(widened.decode(input)).toEqual(input);
		expect(widened.encode(input)).toEqual(input);
		expect(widened.out.parse(input)).toEqual(input);
		expect(widenedAdapter.decode(input)).toEqual(input);
		expect(widenedAdapter.encode(input)).toEqual(input);
	});

	test("validates the derived schemas in both directions", () => {
		expect(
			strictMappedWithWiderInputCodec.safeDecode({ id: null } as never)
				.success,
		).toBeFalse();
		expect(
			strictMappedWithWiderInputCodec.safeEncode({ id: 42 } as never)
				.success,
		).toBeFalse();
	});

	test("maps array items and wider-input codecs at runtime", () => {
		const timestamp = Date.UTC(2020, 0, 1);
		const output = strictArrayMapped.decode({ dates: [timestamp] });

		expect(output.dates).toHaveLength(1);
		expect(output.dates[0]).toBeInstanceOf(Date);
		expect(output.dates[0]?.toISOString()).toBe("2020-01-01T00:00:00.000Z");
		expect(
			strictArrayMapped.encode({ dates: [new Date(timestamp)] }),
		).toEqual({ dates: [timestamp] });
		expect(pipedDateToIsoCodec.decode(timestamp)).toBe(
			"2020-01-01T00:00:00.000Z",
		);
		expect(strictMappedWithWiderInputCodec.decode({ id: 42 })).toEqual({
			id: "42",
		});
		expect(strictMappedWithWiderInputCodec.encode({ id: "42" })).toEqual({
			id: 42,
		});
	});

	test("throws when an array shape is used for a scalar schema field", () => {
		expect(widenedScalarCannotUseArrayShape).toThrow(
			"Codec shape expects an array schema.",
		);
		expect(strictScalarCannotUseArrayShape).toThrow(
			"Codec shape expects an array schema.",
		);
	});

	test("throws when a nested runtime shape includes an unknown key", () => {
		expect(strictNestedShapeWithUnknownKey).toThrow(
			'Codec shape key "packed" is not in schema.',
		);
	});

	test("recognizes zod-like array and object schemas structurally", () => {
		const crossBundleItemSchema = {
			_def: { type: "object" },
			shape: {
				id: z.number(),
			},
			safeParse: () => {
				throw new Error("not used in this test");
			},
		} as unknown as z.ZodObject;

		const crossBundleArraySchema = {
			_def: { type: "array" },
			element: crossBundleItemSchema,
			safeParse: () => {
				throw new Error("not used in this test");
			},
		} as unknown as z.ZodArray<z.ZodTypeAny>;

		const crossBundleSchema = {
			shape: {
				counterparties: crossBundleArraySchema,
			},
		} as unknown as z.ZodObject<{
			counterparties: z.ZodArray<
				z.ZodObject<{
					id: z.ZodNumber;
				}>
			>;
		}>;

		const codec = buildStrictFieldAdapterCodec(crossBundleSchema, {
			counterparties: c.arrayOf({
				id: c.noOp,
			}),
		});

		expect(codec.out.shape.counterparties).toBeInstanceOf(z.ZodArray);
	});
});

void widenedArrayCheck;
void strictArrayMappedCheck;
void pipedDateToIsoInput;
void pipedDateToIsoOutput;
void questionnaireAnswersItemShape;
void questionnaireAnswersItemAdapterShape;
void questionnaireAnswersItemShapeWithWrongKey;
void publicCodec;
void strictMappedWithWiderInputCodec;
