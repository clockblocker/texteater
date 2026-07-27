import { pathToFileURL } from "node:url";
import type { AttestationSource } from "../../shared/types";
import { getDirectAttestation } from "./direct-attestation";
import { getWrappedAttestation } from "./wrapped-attestation";

export async function loadAttestationSource(
	sourcePath: string,
): Promise<AttestationSource> {
	const moduleExports = (await import(
		pathToFileURL(sourcePath).href
	)) as Record<string, unknown>;
	const attestation =
		getWrappedAttestation(moduleExports, sourcePath) ??
		getDirectAttestation(moduleExports, sourcePath);

	return { ...attestation, sourcePath };
}
