import { runCodegen } from "codegen";
import { allSpecExamples } from "../../../src/lib/docs/spec-examples";
import { definePagesCodegen } from "../docs/codegen";
import { pathRelativeToSiteRoot, specRecordPath } from "../shared/paths";
import type { PageOutput } from "../shared/types";
import { attestationSlugForSource } from "./entity/attestation-slug";
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

export function assertUniqueAttestationOutputs(
	outputs: readonly PageOutput[],
): PageOutput[] {
	const byRouteId = new Map<string, PageOutput>();
	for (const output of outputs) {
		const existing = byRouteId.get(output.routeId);
		if (existing !== undefined) {
			throw new Error(
				`Attestation route collision at ${output.routeId}: ${existing.sourcePath} and ${output.sourcePath}.`,
			);
		}
		byRouteId.set(output.routeId, output);
	}
	return [...byRouteId.values()];
}

/** Generates one attestation page per target of every dumspec Spec Record. */
export async function generateAttestations(): Promise<void> {
	const outputs: PageOutput[] = [];

	for (const example of allSpecExamples()) {
		const source = {
			entity: example.attestation,
			sentenceMarkdown: example.sentenceMarkdown,
			sourcePath: specRecordPath(example.record),
		};
		const language = example.attestation.surface.language;
		const routeId = `${language}/attestation/${attestationSlugForSource(source)}`;

		outputs.push({
			body: renderAttestationBody(source),
			frontmatter: {
				generatedFrom: pathRelativeToSiteRoot(source.sourcePath),
				order: 1000,
				routeId,
				title: semanticAttestationBasename(source.sentenceMarkdown),
			},
			routeId,
			sourcePath: source.sourcePath,
		});
	}

	await runCodegen(
		definePagesCodegen(
			"attestations",
			assertUniqueAttestationOutputs(outputs),
		),
		{ mode: "write" },
	);
}
