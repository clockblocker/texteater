import type { AttestedAttestation } from "../../../../../../../src/lib/docs/document-shapes.ts";
import { attestationLogbookCsvRow } from "../../../../../attestations/attestation/logbook.ts";
import type { AttestedAttestationRenderer } from "../types";

export const asFullCsv: AttestedAttestationRenderer = (
	attestedAttestation: AttestedAttestation,
): string =>
	attestationLogbookCsvRow({
		classifierNotes: attestedAttestation.classifierNotes,
		classificationMistakes: attestedAttestation.classificationMistakes,
		entity: attestedAttestation.attestation,
		isVerified: attestedAttestation.isVerified,
		sentenceMarkdown: attestedAttestation.sentenceMarkdown,
	});
