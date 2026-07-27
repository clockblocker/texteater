import { basename } from "node:path";
import type { AttestationSource } from "../../shared/types";
import { entityKindFor } from "../entity/helpers";
import { expectedEntityKindForPath } from "./expected-entity-kind-for-path";

export function validateAttestationPath(
	source: AttestationSource,
	base64UrlId: string,
): void {
	const expectedKind = expectedEntityKindForPath(source.sourcePath);
	const actualKind = entityKindFor(source.entity);
	if (expectedKind !== undefined && expectedKind !== actualKind) {
		throw new Error(
			`${source.sourcePath} lives under ${expectedKind.toLowerCase()}, but exports ${actualKind}.`,
		);
	}

	const actualBaseName = basename(source.sourcePath, ".ts");
	if (entityKindFor(source.entity) === "Selection") {
		return;
	}
	if (actualBaseName !== base64UrlId) {
		throw new Error(
			`${source.sourcePath} must be named ${base64UrlId}.ts for its generated ID.`,
		);
	}
}
