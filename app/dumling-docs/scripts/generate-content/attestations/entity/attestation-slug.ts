import { createHash } from "node:crypto";
import { getLanguageApi } from "dumling";
import type { EntityValue } from "dumling/types";
import { isAttestation } from "./guards";
import { lemmaForEntity } from "./helpers";

/** A filesystem-safe projection of structural identity, not a domain ID. */
export function attestationSlugForEntity(entity: EntityValue): string {
	if (isAttestation(entity)) {
		throw new Error(
			"Attestation routes require docs-owned occurrence wrapper evidence.",
		);
	}
	const language = lemmaForEntity(entity).language;
	const structuralIdentity = String(
		getLanguageApi(language).id.encode.asCsv(entity),
	);
	const digest = createHash("sha256")
		.update(structuralIdentity)
		.digest("base64url");
	return `sha256-${digest}`;
}

export function attestationSlugForSource(source: {
	entity: EntityValue;
	sentenceMarkdown?: string;
}): string {
	if (!isAttestation(source.entity)) {
		return attestationSlugForEntity(source.entity);
	}
	if (source.sentenceMarkdown === undefined) {
		throw new Error(
			"Occurrence Attestation routes require docs-owned sentenceMarkdown.",
		);
	}
	const occurrenceKey = JSON.stringify({
		sentenceMarkdown: source.sentenceMarkdown,
	});
	const digest = createHash("sha256")
		.update(occurrenceKey)
		.digest("base64url");
	return `sha256-${digest}`;
}
