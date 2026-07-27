import type { RuntimeSchemaSet } from "../../../language-packs/contracts.js";
import type { LanguageTypePackMap } from "../../../language-packs/type-packs.js";
import { parseWithSchema } from "../../shared/parse-result.js";

export function buildEnParseOperations(
	runtimeSchemas: RuntimeSchemaSet<LanguageTypePackMap["en"]>,
) {
	return {
		lemma(input: unknown) {
			return parseWithSchema("en", runtimeSchemas.lemma, input);
		},
		surface(input: unknown) {
			return parseWithSchema("en", runtimeSchemas.surface, input);
		},
		selection(input: unknown) {
			return parseWithSchema("en", runtimeSchemas.selection, input);
		},
	};
}
