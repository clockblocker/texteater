import type { AttestedAttestation } from "../../../src/lib/docs/document-shapes.ts";
import { attestationSlugForSource } from "../attestations/entity/attestation-slug.ts";

export function asSingleLineSentence(sentenceMarkdown: string): string {
	return sentenceMarkdown
		.trim()
		.split("\n")
		.map((line) => line.trim())
		.join(" ");
}

export function hrefForAttestedAttestation(
	attestedAttestation: AttestedAttestation,
): string {
	const language = attestedAttestation.attestation.surface.lemma.language;
	const slug = attestationSlugForSource(attestedAttestation);

	return `/${language}/attestation/${slug}/`;
}

export function withLinkedAttestationSpan(
	attestedAttestation: AttestedAttestation,
): string {
	const sentenceMarkdown = asSingleLineSentence(
		attestedAttestation.sentenceMarkdown,
	);
	const href = hrefForAttestedAttestation(attestedAttestation);

	return sentenceMarkdown.replace(
		/\[(.+?)\]/u,
		(_, selectedText: string) => `[${selectedText}](${href})`,
	);
}
