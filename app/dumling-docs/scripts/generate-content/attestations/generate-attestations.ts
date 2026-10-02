import { join } from "node:path";
import { runCodegen } from "codegen";
import { allSpecExamples } from "../../../src/lib/docs/spec-examples";
import { publicMarkdownPathForRouteId } from "../docs/routes";
import {
	generatedEntitiesDir,
	pathRelativeToSiteRoot,
	specRecordPath,
} from "../shared/paths";
import type { Frontmatter, SourcePage } from "../shared/types";
import {
	type AttestationOutput,
	assertUniqueAttestationOutputs,
	defineAttestationsCodegen,
} from "./codegen";
import { attestationSlugForSource } from "./entity/attestation-slug";
import { discoverAttestationsInitialOwnership } from "./initial-ownership";
import { renderAttestationBody } from "./render/render-attestation-body";

/** The page title: the sentence with spaces as `_`, keeping only letters, marks, digits, connectors and brackets. */
function semanticAttestationBasename(sentenceMarkdown: string): string {
	return sentenceMarkdown
		.normalize("NFC")
		.replace(/[^\p{L}\p{M}\p{N}\p{Pc}\p{Zs}[\]]+/gu, "")
		.replace(/\p{Zs}+/gu, "_")
		.replace(/_+/gu, "_")
		.replace(/^_+|_+$/gu, "");
}

/** Generates one attestation page per target of every dumspec Spec Record. */
export async function generateAttestations(): Promise<SourcePage[]> {
	const pages: SourcePage[] = [];
	const outputs: AttestationOutput[] = [];
	const initialOwnership = discoverAttestationsInitialOwnership();

	for (const example of allSpecExamples()) {
		const source = {
			entity: example.attestation,
			sentenceMarkdown: example.sentenceMarkdown,
			sourcePath: specRecordPath(example.record),
		};
		const language = example.attestation.surface.language;
		const routeId = `${language}/attestation/${attestationSlugForSource(source)}`;
		const frontmatter: Frontmatter = {
			generatedFrom: pathRelativeToSiteRoot(source.sourcePath),
			order: 1000,
			routeId,
			title: semanticAttestationBasename(source.sentenceMarkdown),
		};

		outputs.push({
			body: renderAttestationBody(source),
			frontmatter,
			generatedPath: join(generatedEntitiesDir, `${routeId}.md`),
			publicPath: publicMarkdownPathForRouteId(routeId),
			routeId,
			sourcePath: source.sourcePath,
		});
		pages.push({ frontmatter, routeId, sourcePath: source.sourcePath });
	}

	await runCodegen(
		defineAttestationsCodegen(
			assertUniqueAttestationOutputs(outputs),
			initialOwnership,
		),
		{ mode: "write" },
	);

	return pages;
}
