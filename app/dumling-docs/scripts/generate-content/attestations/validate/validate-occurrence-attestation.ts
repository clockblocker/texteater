import { getLanguageApi } from "dumling";
import type {
	AttestationSource,
	OccurrenceAttestationSource,
} from "../../shared/types";
import { parseAttestedSentenceMarkdown } from "../attestation/parse-attested-sentence-markdown";
import { isRecord, isSupportedLanguage } from "../entity/guards";

function isAttestationCandidate(
	value: unknown,
): value is Record<string, unknown> {
	return (
		isRecord(value) &&
		("members" in value || "realizationCoverage" in value)
	);
}

export function isOccurrenceAttestationSource(
	source: AttestationSource,
): source is AttestationSource & OccurrenceAttestationSource {
	return (
		source.wrappedEntityKind === "attestation" ||
		isAttestationCandidate(source.entity)
	);
}

export function validateOccurrenceAttestation(
	source: AttestationSource,
): asserts source is AttestationSource & OccurrenceAttestationSource {
	if (!isOccurrenceAttestationSource(source)) return;
	const surface = source.entity.surface;
	const lemma = isRecord(surface) ? surface.lemma : undefined;
	const language = isRecord(lemma) ? lemma.language : undefined;
	if (!isSupportedLanguage(language)) {
		throw new Error(
			`${source.sourcePath} occurrence attestation must define a supported surface lemma language.`,
		);
	}

	const parsed = getLanguageApi(language).parse.attestation(source.entity);
	if (!parsed.success) {
		throw new Error(
			`${source.sourcePath} occurrence attestation failed strict ${language} Dumling validation: ${parsed.error.message}`,
		);
	}
	if (source.sentenceMarkdown === undefined) {
		throw new Error(
			`${source.sourcePath} occurrence attestations must define sentenceMarkdown.`,
		);
	}

	const { selectedText, sentenceText } = parseAttestedSentenceMarkdown(
		source.sentenceMarkdown,
		source.sourcePath,
	);
	let searchFrom = 0;
	let reviewSpanMatchesMember = false;
	for (const member of parsed.data.members) {
		const index = sentenceText.indexOf(member.attested, searchFrom);
		if (index === -1) {
			throw new Error(
				`${source.sourcePath} member ${JSON.stringify(member.attested)} must occur in sentenceMarkdown after the previous member.`,
			);
		}
		searchFrom = index + member.attested.length;
		if (selectedText.includes(member.attested))
			reviewSpanMatchesMember = true;
	}
	if (!reviewSpanMatchesMember) {
		throw new Error(
			`${source.sourcePath} bracketed review span must contain at least one attested member.`,
		);
	}
}
