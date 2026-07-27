import { join } from "node:path";
import { runCodegen } from "dumcodegen";
import { getLanguageApi } from "dumling";
import { publicMarkdownPathForRouteId } from "../docs/routes";
import { generatedEntitiesDir } from "../shared/paths";
import type { SelectionAttestationSource, SourcePage } from "../shared/types";
import {
	type AttestationOutput,
	defineAttestationsCodegen,
	lastAttestationOutputForEachRoute,
} from "./codegen";
import { entityKindFor } from "./entity/helpers";
import { discoverAttestationsInitialOwnership } from "./initial-ownership";
import { generatedFrontmatterForAttestation } from "./render/generated-frontmatter";
import { renderAttestationBody } from "./render/render-attestation-body";
import {
	prepareSelectionLogbooks,
	selectionLogbookCsvOutputs,
} from "./selection/logbook";
import { renameSelectionSources } from "./selection/rename-selection-sources";
import { loadAttestationSource } from "./source/load-attestation-source";
import { validateAttestationPath } from "./validate/validate-attestation-path";
import {
	isSelectionAttestationSource,
	validateSelectionAttestation,
} from "./validate/validate-selection-attestation";

export async function generateAttestations(): Promise<SourcePage[]> {
	const pages: SourcePage[] = [];
	const selectionSources: SelectionAttestationSource[] = [];
	const outputs: AttestationOutput[] = [];
	const initialOwnership = discoverAttestationsInitialOwnership();

	prepareSelectionLogbooks();
	const sourcePaths = await renameSelectionSources();

	for (const sourcePath of sourcePaths) {
		const source = await loadAttestationSource(sourcePath);
		validateSelectionAttestation(source);
		const languageApi = getLanguageApi(source.entity.language);
		const base64UrlId = String(
			languageApi.id.encode.asBase64Url(source.entity),
		);
		const entityKind = entityKindFor(source.entity).toLowerCase();
		validateAttestationPath(source, base64UrlId);

		const routeId = `${source.entity.language}/${entityKind}/${base64UrlId}`;
		const frontmatter = generatedFrontmatterForAttestation(source, routeId);
		const body = renderAttestationBody(
			source,
			String(languageApi.id.encode.asCsv(source.entity)),
		);

		outputs.push({
			body,
			frontmatter,
			generatedPath: join(
				generatedEntitiesDir,
				source.entity.language,
				entityKind,
				`${base64UrlId}.md`,
			),
			publicPath: publicMarkdownPathForRouteId(routeId),
			routeId,
			sourcePath,
		});
		pages.push({ frontmatter, routeId, sourcePath });
		if (isSelectionAttestationSource(source)) {
			selectionSources.push(source);
		}
	}

	await runCodegen(
		defineAttestationsCodegen(
			lastAttestationOutputForEachRoute(outputs),
			selectionLogbookCsvOutputs(selectionSources),
			initialOwnership,
		),
		{ mode: "write" },
	);

	return pages;
}
