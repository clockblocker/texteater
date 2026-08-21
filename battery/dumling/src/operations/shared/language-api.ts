import type { SupportedLanguage } from "../../types/public-types.js";
import type { LanguageApi } from "../api-shape.js";
import { buildConvertOperations } from "./convert/convert.js";
import { buildCreateOperations } from "./create/create.js";
import { buildDescribeOperations } from "./describe/describe.js";
import { buildExtractOperations } from "./extract/extract.js";
import { buildIdOperations } from "./id/id.js";

/** Build the canonical language API around package-owned parse operations. */
export function buildLanguageApiFromParseOperations<
	L extends SupportedLanguage,
>(language: L, parse: LanguageApi<L>["parse"]): LanguageApi<L> {
	const create = buildCreateOperations(language);
	return {
		create,
		convert: buildConvertOperations<L>(create.attestation),
		describe: buildDescribeOperations<L>(),
		extract: buildExtractOperations<L>(),
		id: buildIdOperations(language, parse),
		parse,
	};
}
