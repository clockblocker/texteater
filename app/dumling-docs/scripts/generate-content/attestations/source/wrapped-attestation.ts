import type { EntityValue } from "dumling/types";
import type { AttestationSource } from "../../shared/types";
import { isEntityValue, isRecord } from "../entity/guards";

export function getWrappedAttestation(
	moduleExports: Record<string, unknown>,
	sourcePath: string,
): Omit<AttestationSource, "sourcePath"> | undefined {
	const wrapped = moduleExports.attestation;
	if (wrapped === undefined) {
		return undefined;
	}
	if (!isRecord(wrapped)) {
		throw new Error(
			`${sourcePath} exports attestation, but it is not an object.`,
		);
	}

	const entityEntries = [
		["lemma", wrapped.lemma, isEntityValue(wrapped.lemma)],
		["surface", wrapped.surface, isEntityValue(wrapped.surface)],
		["attestation", wrapped.attestation, isRecord(wrapped.attestation)],
	].filter(([, , isCandidate]) => isCandidate);

	if (entityEntries.length !== 1) {
		throw new Error(
			`${sourcePath} attestation must contain exactly one lemma, surface, or attestation.`,
		);
	}

	const order =
		typeof wrapped.order === "number" && Number.isFinite(wrapped.order)
			? wrapped.order
			: undefined;
	const sentenceMarkdown =
		typeof wrapped.sentenceMarkdown === "string"
			? wrapped.sentenceMarkdown
			: undefined;
	const title =
		typeof wrapped.title === "string" && wrapped.title.length > 0
			? wrapped.title
			: undefined;
	const classifierNotes =
		typeof wrapped.classifierNotes === "string"
			? wrapped.classifierNotes
			: undefined;
	const classificationMistakes =
		typeof wrapped.classificationMistakes === "string"
			? wrapped.classificationMistakes
			: undefined;
	const isVerified = wrapped.isVerified === true ? true : undefined;

	return {
		classifierNotes,
		classificationMistakes,
		entity: entityEntries[0]?.[1] as EntityValue,
		isVerified,
		order,
		sentenceMarkdown,
		title,
		wrappedEntityKind: entityEntries[0]?.[0] as
			| "attestation"
			| "lemma"
			| "surface",
	};
}
