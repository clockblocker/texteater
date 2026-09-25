import { pathRelativeToSiteRoot } from "../../shared/paths";
import type { AttestationSource, Frontmatter } from "../../shared/types";
import { semanticAttestationBasename } from "../attestation/semantic-source-path";

export function generatedFrontmatterForAttestation(
	source: AttestationSource,
	routeId: string,
): Frontmatter {
	return {
		generatedFrom: pathRelativeToSiteRoot(source.sourcePath),
		order: 1000,
		routeId,
		title: semanticAttestationBasename(source.sentenceMarkdown),
	};
}
