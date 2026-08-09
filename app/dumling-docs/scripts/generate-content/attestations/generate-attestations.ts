import { join } from "node:path";
import { runCodegen } from "codegen";
import { getLanguageApi } from "dumling";
import { publicMarkdownPathForRouteId } from "../docs/routes";
import { generatedEntitiesDir } from "../shared/paths";
import type { OccurrenceAttestationSource, SourcePage } from "../shared/types";
import {
	attestationLogbookCsvOutputs,
	prepareAttestationLogbooks,
} from "./attestation/logbook";
import {
	type AttestationOutput,
	assertUniqueAttestationOutputs,
	defineAttestationsCodegen,
} from "./codegen";
import { attestationSlugForSource } from "./entity/attestation-slug";
import { entityKindFor, lemmaForEntity } from "./entity/helpers";
import { discoverAttestationsInitialOwnership } from "./initial-ownership";
import { generatedFrontmatterForAttestation } from "./render/generated-frontmatter";
import { renderAttestationBody } from "./render/render-attestation-body";
import { loadAttestationSource } from "./source/load-attestation-source";
import { renameAttestationSources } from "./source/rename-attestation-sources";
import { validateAttestationPath } from "./validate/validate-attestation-path";
import {
	isOccurrenceAttestationSource,
	validateOccurrenceAttestation,
} from "./validate/validate-occurrence-attestation";

export async function generateAttestations(): Promise<SourcePage[]> {
	const pages: SourcePage[] = [];
	const attestationSources: OccurrenceAttestationSource[] = [];
	const outputs: AttestationOutput[] = [];
	const initialOwnership = discoverAttestationsInitialOwnership();

	prepareAttestationLogbooks();
	const sourcePaths = await renameAttestationSources();

	for (const sourcePath of sourcePaths) {
		const source = await loadAttestationSource(sourcePath);
		validateOccurrenceAttestation(source);
		const language = lemmaForEntity(source.entity).language;
		const languageApi = getLanguageApi(language);
		const attestationSlug = attestationSlugForSource(source);
		const entityKind =
			entityKindFor(source.entity) === "Lemma"
				? "lemma"
				: entityKindFor(source.entity).toLowerCase();
		validateAttestationPath(source, attestationSlug);

		const routeId = `${language}/${entityKind}/${attestationSlug}`;
		const frontmatter = generatedFrontmatterForAttestation(source, routeId);
		const body = renderAttestationBody(
			source,
			entityKind === "attestation"
				? undefined
				: String(languageApi.id.encode.asCsv(source.entity as never)),
		);

		outputs.push({
			body,
			frontmatter,
			generatedPath: join(
				generatedEntitiesDir,
				language,
				entityKind,
				`${attestationSlug}.md`,
			),
			publicPath: publicMarkdownPathForRouteId(routeId),
			routeId,
			sourcePath,
		});
		pages.push({ frontmatter, routeId, sourcePath });
		if (isOccurrenceAttestationSource(source)) {
			attestationSources.push(source);
		}
	}

	await runCodegen(
		defineAttestationsCodegen(
			assertUniqueAttestationOutputs(outputs),
			attestationLogbookCsvOutputs(attestationSources),
			initialOwnership,
		),
		{ mode: "write" },
	);

	return pages;
}
