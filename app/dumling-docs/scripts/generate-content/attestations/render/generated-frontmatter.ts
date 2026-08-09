import { pathRelativeToSiteRoot } from "../../shared/paths";
import type { AttestationSource, Frontmatter } from "../../shared/types";
import { semanticAttestationBasename } from "../attestation/semantic-source-path";
import { isAttestation, isSurface } from "../entity/guards";
import { lemmaForEntity, surfaceForEntity } from "../entity/helpers";

export function generatedFrontmatterForAttestation(
	source: AttestationSource,
	routeId: string,
): Frontmatter {
	const entity = source.entity;
	const lemma = lemmaForEntity(entity);
	const surface =
		isAttestation(entity) || isSurface(entity)
			? surfaceForEntity(entity)
			: undefined;
	const displayName =
		source.title ?? surface?.normalizedSurface ?? lemma.canonicalForm;
	const generatedTitle =
		isAttestation(entity) && source.sentenceMarkdown !== undefined
			? semanticAttestationBasename(source.sentenceMarkdown)
			: displayName;

	return {
		generatedFrom: pathRelativeToSiteRoot(source.sourcePath),
		order: source.order ?? 1000,
		routeId,
		title: generatedTitle,
	};
}
