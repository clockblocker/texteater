import type { z } from "zod";
import type {
	Attestation,
	Lemma,
	SupportedLanguage,
	Surface,
} from "../../../types/public-types.js";
import type { LanguageApi } from "../../api-shape.js";
import { canonicalizeNullableProperties } from "./canonicalize-nullable.js";
import { parseWithSchema } from "./parse-result.js";

type RuntimeSchemaSet<L extends SupportedLanguage> = {
	attestation: z.ZodType<Attestation<L>>;
	lemma: z.ZodType<Lemma<L>>;
	surface: z.ZodType<Surface<L>>;
};

export function buildParseOperations<L extends SupportedLanguage>(
	language: L,
	runtimeSchemas: RuntimeSchemaSet<L>,
): LanguageApi<L>["parse"] {
	return {
		attestation(input: unknown) {
			return parseWithSchema(
				language,
				runtimeSchemas.attestation,
				canonicalizeNullableProperties(
					runtimeSchemas.attestation,
					input,
				),
			);
		},
		lemma(input: unknown) {
			return parseWithSchema(
				language,
				runtimeSchemas.lemma,
				canonicalizeNullableProperties(runtimeSchemas.lemma, input),
			);
		},
		surface(input: unknown) {
			return parseWithSchema(
				language,
				runtimeSchemas.surface,
				canonicalizeNullableProperties(runtimeSchemas.surface, input),
			);
		},
	};
}
