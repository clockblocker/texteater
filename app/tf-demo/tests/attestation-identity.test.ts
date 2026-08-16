import { expect, test } from "bun:test";

import {
	attestationIdentityKey,
	parseAttestationIdentityKey,
} from "../server/attestationIdentity";

test("attestation identity is the Sentence ID plus Text ID", () => {
	const identity = { sentenceId: "sentence-1", textId: "text-1" };
	const key = attestationIdentityKey(identity);

	expect(parseAttestationIdentityKey(key)).toEqual(identity);
	expect(
		attestationIdentityKey({ ...identity, sentenceId: "sentence-2" }),
	).not.toBe(key);
	expect(attestationIdentityKey({ ...identity, textId: "text-2" })).not.toBe(
		key,
	);
});

test("plain legacy attestation text has no composite identity", () => {
	expect(parseAttestationIdentityKey("Die Banken sind geöffnet.")).toBeNull();
});
