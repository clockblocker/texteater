import type { AttestedAttestation } from "../../../../../../src/lib/docs/document-shapes.ts";

export type AttestedAttestationRenderer = (
	attestedAttestation: AttestedAttestation,
) => string;
