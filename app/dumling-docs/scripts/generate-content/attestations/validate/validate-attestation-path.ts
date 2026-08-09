import { basename } from "node:path";
import type { AttestationSource } from "../../shared/types";
import { entityKindFor } from "../entity/helpers";
import { expectedEntityKindForPath } from "./expected-entity-kind-for-path";

export function validateAttestationPath(
	source: AttestationSource,
	attestationSlug: string,
): void {
	const expectedKind = expectedEntityKindForPath(source.sourcePath);
	const actualKind = entityKindFor(source.entity);
	if (expectedKind !== undefined && expectedKind !== actualKind) {
		throw new Error(
			`${source.sourcePath} lives under ${expectedKind.toLowerCase()}, but exports ${actualKind}.`,
		);
	}

	const actualBaseName = basename(source.sourcePath, ".ts");
	if (entityKindFor(source.entity) === "Attestation") {
		return;
	}
	if (actualBaseName !== attestationSlug) {
		throw new Error(
			`${source.sourcePath} must be named ${attestationSlug}.ts for its structural identity slug.`,
		);
	}
}
