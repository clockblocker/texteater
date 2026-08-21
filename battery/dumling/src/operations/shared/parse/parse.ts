import type { SupportedLanguage } from "../../../types/public-types.js";
import type { LanguageApi } from "../../api-shape.js";
import { parseDumlingRoute } from "../../parsing/lightweight-parsers.js";
import {
	compatibilityAttestationValidationRoute,
	compatibilityLemmaValidationRoute,
	compatibilitySurfaceValidationRoute,
} from "../../parsing/validation-routes.js";
import { compatibilityParseResult } from "./parse-result.js";

export function buildParseOperations<L extends SupportedLanguage>(
	language: L,
): LanguageApi<L>["parse"] {
	return {
		attestation(input: unknown) {
			const surface = nestedRecord(input, "surface");
			const lemma = nestedRecord(surface, "lemma");
			return compatibilityParseResult(
				language,
				parseDumlingRoute(
					input,
					compatibilityAttestationValidationRoute(
						language,
						stringField(surface, "surfaceKind"),
						stringField(lemma, "family"),
						stringField(lemma, "kind"),
					),
					true,
				),
			);
		},
		lemma(input: unknown) {
			return compatibilityParseResult(
				language,
				parseDumlingRoute(
					input,
					compatibilityLemmaValidationRoute(
						language,
						stringField(input, "family"),
						stringField(input, "kind"),
					),
					true,
				),
			);
		},
		surface(input: unknown) {
			const lemma = nestedRecord(input, "lemma");
			return compatibilityParseResult(
				language,
				parseDumlingRoute(
					input,
					compatibilitySurfaceValidationRoute(
						language,
						stringField(input, "surfaceKind"),
						stringField(lemma, "family"),
						stringField(lemma, "kind"),
					),
					true,
				),
			);
		},
	};
}

function nestedRecord(value: unknown, key: string): unknown {
	return value !== null && typeof value === "object"
		? Reflect.get(value, key)
		: undefined;
}

function stringField(value: unknown, key: string): string {
	const field = nestedRecord(value, key);
	return typeof field === "string" ? field : "<invalid>";
}
