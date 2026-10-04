import { canonicalJson } from "common-utils";

/** The SHA-256 hex digest of a value's canonical JSON. */
export async function fingerprint(value: unknown): Promise<string> {
	const bytes = new TextEncoder().encode(canonicalJson(value));
	const hash = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(hash), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
}
