import { join } from "node:path";
import { runCodegen } from "codegen";
import { allSpecExamples } from "../../../src/lib/docs/spec-examples";
import { publicMarkdownPathForRouteId } from "../docs/routes";
import { generatedEntitiesDir, specRecordPath } from "../shared/paths";
import type { SourcePage } from "../shared/types";
import {
	type AttestationOutput,
	assertUniqueAttestationOutputs,
	defineAttestationsCodegen,
} from "./codegen";
import { attestationSlugForSource } from "./entity/attestation-slug";
import { discoverAttestationsInitialOwnership } from "./initial-ownership";
import { generatedFrontmatterForAttestation } from "./render/generated-frontmatter";
import { renderAttestationBody } from "./render/render-attestation-body";

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
		const frontmatter = generatedFrontmatterForAttestation(source, routeId);

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
