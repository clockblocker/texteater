const ATTESTATION_IDENTITY_PREFIX = "tf-demo:attestation:v1:";

export type AttestationIdentity = {
	readonly sentenceId: string;
	readonly textId: string;
};

export function attestationIdentityKey({
	sentenceId,
	textId,
}: AttestationIdentity): string {
	return `${ATTESTATION_IDENTITY_PREFIX}${JSON.stringify([sentenceId, textId])}`;
}

export function parseAttestationIdentityKey(
	value: string,
): AttestationIdentity | null {
	if (!value.startsWith(ATTESTATION_IDENTITY_PREFIX)) return null;
	try {
		const parsed: unknown = JSON.parse(
			value.slice(ATTESTATION_IDENTITY_PREFIX.length),
		);
		if (
			!Array.isArray(parsed) ||
			parsed.length !== 2 ||
			typeof parsed[0] !== "string" ||
			typeof parsed[1] !== "string" ||
			parsed[0].length === 0 ||
			parsed[1].length === 0
		) {
			return null;
		}
		return { sentenceId: parsed[0], textId: parsed[1] };
	} catch {
		return null;
	}
}
