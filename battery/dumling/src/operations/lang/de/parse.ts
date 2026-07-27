import type { RuntimeSchemaSet } from "../../../language-packs/contracts.js";
import type { LanguageTypePackMap } from "../../../language-packs/type-packs.js";
import { parseWithSchema } from "../../shared/parse-result.js";

export function buildDeParseOperations(
	runtimeSchemas: RuntimeSchemaSet<LanguageTypePackMap["de"]>,
) {
	const operations = {
		lemma(input: unknown) {
			return parseWithSchema("de", runtimeSchemas.lemma, input);
		},
		surface(input: unknown) {
			return parseWithSchema("de", runtimeSchemas.surface, input);
		},
		selection(input: unknown) {
			return parseWithSchema("de", runtimeSchemas.selection, input);
		},
	};

	return operations;
}
