import type { RuntimeSchemaSet } from "../../../language-packs/contracts.js";
import type { LanguageTypePackMap } from "../../../language-packs/type-packs.js";
import { parseWithSchema } from "../../shared/parse-result.js";

export function buildHeParseOperations(
	runtimeSchemas: RuntimeSchemaSet<LanguageTypePackMap["he"]>,
) {
	return {
		lemma(input: unknown) {
			return parseWithSchema("he", runtimeSchemas.lemma, input);
		},
		surface(input: unknown) {
			return parseWithSchema("he", runtimeSchemas.surface, input);
		},
		selection(input: unknown) {
			return parseWithSchema("he", runtimeSchemas.selection, input);
		},
	};
}
