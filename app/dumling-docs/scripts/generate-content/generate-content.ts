import { generateAttestations } from "./attestations/generate-attestations";
import { generateDocs } from "./docs/generate-docs";
import { runDocsHousekeeping } from "./docs/housekeeping";

export async function generateContent(): Promise<void> {
	await generateAttestations();
	await runDocsHousekeeping();
	await generateDocs();
}
