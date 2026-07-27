import type { RuntimeSchemaSet } from "../../../language-packs/contracts";
import type { LanguageTypePackMap } from "../../../language-packs/type-packs";
import { parseWithSchema } from "../../shared/parse-result";

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
