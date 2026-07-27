import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { getLanguageApi } from "../../../../src/index.ts";
import { parseFrontmatter } from "../docs/frontmatter";
import { publicMarkdownPathForRouteId } from "../docs/routes";
import { listMarkdownFiles, writeGeneratedMarkdown } from "../shared/fs";
import {
	generatedDocsDir,
	generatedEntitiesDir,
	publicDir,
	sourceAttestationsDir,
} from "../shared/paths";
import type { SelectionAttestationSource, SourcePage } from "../shared/types";
import { entityKindFor } from "./entity/helpers";
import { generatedFrontmatterForAttestation } from "./render/generated-frontmatter";
import { renderAttestationBody } from "./render/render-attestation-body";
import {
	prepareSelectionLogbooks,
	writeSelectionLogbookCsv,
} from "./selection/logbook";
import { renameSelectionSources } from "./selection/rename-selection-sources";
import { loadAttestationSource } from "./source/load-attestation-source";
import { validateAttestationPath } from "./validate/validate-attestation-path";
import {
	isSelectionAttestationSource,
	validateSelectionAttestation,
} from "./validate/validate-selection-attestation";

function removeGeneratedAttestationOutputs(): void {
	for (const generatedDir of [generatedEntitiesDir, generatedDocsDir]) {
		for (const generatedPath of listMarkdownFiles(generatedDir)) {
			if (!existsSync(generatedPath)) {
				continue;
			}

			let frontmatter;
			try {
				frontmatter = parseFrontmatter(
					readFileSync(generatedPath, "utf8"),
					generatedPath,
				).frontmatter;
			} catch (error) {
				// Another cleanup step may have removed the file after discovery.
				if (
					error instanceof Error &&
					"code" in error &&
					error.code === "ENOENT"
				) {
					continue;
				}
				throw error;
			}
			if (frontmatter.routeId === undefined) {
				continue;
			}

			const isLegacyAttestation =
				frontmatter.routeId.includes("/attestation/");
			const isEntityAttestation =
				generatedDir === generatedEntitiesDir &&
				frontmatter.routeId.split("/").length === 3;

			if (!isLegacyAttestation && !isEntityAttestation) {
				continue;
			}

			rmSync(generatedPath, { force: true });
			rmSync(publicMarkdownPathForRouteId(frontmatter.routeId), {
				force: true,
			});
		}
	}
}

export async function generateAttestations(): Promise<SourcePage[]> {
	const pages: SourcePage[] = [];
	const selectionSources: SelectionAttestationSource[] = [];

	mkdirSync(generatedEntitiesDir, { recursive: true });
	mkdirSync(publicDir, { recursive: true });
	removeGeneratedAttestationOutputs();
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

		writeGeneratedMarkdown(
			join(
				generatedEntitiesDir,
				source.entity.language,
				entityKind,
				`${base64UrlId}.md`,
			),
			frontmatter,
			body,
			publicMarkdownPathForRouteId(routeId),
		);
		pages.push({ frontmatter, routeId, sourcePath });
		if (isSelectionAttestationSource(source)) {
			selectionSources.push(source);
		}
	}

	writeSelectionLogbookCsv(selectionSources);

	return pages;
}
