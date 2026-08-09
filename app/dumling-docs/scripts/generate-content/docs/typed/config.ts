import { attestedAttestationRenderers } from "./renderers/attested-attestation/index";
import type { AttestedAttestationRenderer } from "./renderers/attested-attestation/types";

export type TypedDocsGenerationConfig = {
	attestedAttestationRenderers: Record<string, AttestedAttestationRenderer>;
	defaultAttestedAttestationRenderer: string;
};

export const typedDocsGenerationConfig: TypedDocsGenerationConfig = {
	attestedAttestationRenderers,
	defaultAttestedAttestationRenderer: "asLinkedSentenceAndLemmaCsv",
};
