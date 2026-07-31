import { createHash } from "node:crypto";
import { getLanguageApi } from "dumling";
import type { EntityValue } from "dumling/types";
import { isSelection } from "./guards";
import { lemmaForEntity } from "./helpers";

/** A filesystem-safe projection of structural identity, not a domain ID. */
export function attestationSlugForEntity(entity: EntityValue): string {
	const language = lemmaForEntity(entity).language;
	const languageApi = getLanguageApi(language);
	if (isSelection(entity)) {
		return String(languageApi.id.encode.asBase64Url(entity));
	}
	const structuralIdentity = languageApi.id.encode.asCsv(entity);
	const digest = createHash("sha256")
		.update(String(structuralIdentity))
		.digest("base64url");
	return `sha256-${digest}`;
}
