import { generateAttestations } from "./generate-content/attestations/generate-attestations.ts";
import { generateDocs } from "./generate-content/docs/generate-docs.ts";

await generateAttestations();
await generateDocs();
