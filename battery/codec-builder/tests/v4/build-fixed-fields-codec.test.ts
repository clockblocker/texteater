import { describe, expect, test } from "bun:test";
import { z } from "zod/v4";

import { codecBuilder4 } from "../../src/v4";

const canonicalSchema = z.strictObject({
	language: z.literal("de"),
	family: z.enum(["Lexeme", "Phraseme"]),
	kind: z.literal("NOUN"),
	canonicalForm: z.string().min(1),
	coreFeatures: z.strictObject({ gender: z.enum(["Fem", "Masc", "Neut"]) }),
});

const codec = codecBuilder4.buildFixedFieldsCodec(canonicalSchema, {
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
});

type ModelValue = z.input<typeof codec>;
type CanonicalValue = z.output<typeof codec>;

const modelValue = {
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem" },
} satisfies ModelValue;

const canonicalValue = {
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem" },
} satisfies CanonicalValue;

// @ts-expect-error fixed fields are absent from the inferred model type
const modelValueWithLanguage: ModelValue = { ...modelValue, language: "de" };
// @ts-expect-error the inferred canonical type still requires fixed fields
const canonicalValueWithoutLanguage: CanonicalValue = modelValue;

function typeErrors(): void {
	// @ts-expect-error fixed field names must belong to the canonical schema
	codecBuilder4.buildFixedFieldsCodec(canonicalSchema, { locale: "de" });
	// @ts-expect-error fixed field values must match their canonical field types
	codecBuilder4.buildFixedFieldsCodec(canonicalSchema, { language: "en" });
}

describe("buildFixedFieldsCodec", () => {
	test("decodes, encodes, and round-trips multiple fixed fields", () => {
		expect(codec.in).toBeInstanceOf(z.ZodObject);
		expect(codec.out).toBe(canonicalSchema);
		expect(codec.decode(modelValue)).toEqual(canonicalValue);
		expect(codec.encode(canonicalValue)).toEqual(modelValue);
		expect(codec.decode(codec.encode(canonicalValue))).toEqual(
			canonicalValue,
		);
	});

	test("preserves strict validation in both directions", () => {
		expect(() =>
			codec.decode({ ...modelValue, unexpected: true } as never),
		).toThrow();
		expect(() =>
			codec.encode({ ...canonicalValue, unexpected: true } as never),
		).toThrow();
	});

	test("rejects a canonical value whose fixed field does not match", () => {
		expect(() =>
			codec.encode({ ...canonicalValue, family: "Phraseme" }),
		).toThrow(/fixed field "family" does not equal "Lexeme"/);
	});

	test("validates configured fixed values when building the codec", () => {
		expect(() =>
			codecBuilder4.buildFixedFieldsCodec(canonicalSchema, {
				language: "en",
			} as never),
		).toThrow();
		expect(() =>
			codecBuilder4.buildFixedFieldsCodec(canonicalSchema, {
				locale: "de",
			} as never),
		).toThrow(/unknown field "locale"/);
	});

	test("works as a nested codec", () => {
		const requestCodec = z.strictObject({
			markedContext: z.string(),
			lemma: codec,
		});
		const modelRequest = {
			markedContext: "Die <TARGET>Bank</TARGET>",
			lemma: modelValue,
		};
		const canonicalRequest = {
			markedContext: "Die <TARGET>Bank</TARGET>",
			lemma: canonicalValue,
		};

		expect(z.decode(requestCodec, modelRequest)).toEqual(canonicalRequest);
		expect(z.encode(requestCodec, canonicalRequest)).toEqual(modelRequest);
	});
});

void modelValueWithLanguage;
void canonicalValueWithoutLanguage;
void typeErrors;
