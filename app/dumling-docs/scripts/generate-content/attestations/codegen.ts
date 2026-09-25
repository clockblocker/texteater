import { join, relative } from "node:path";
import { defineCodegen } from "codegen";
import { serializeFrontmatter } from "../docs/frontmatter";
import {
	generatedDocsDir,
	generatedEntitiesDir,
	publicDir,
	siteRoot,
} from "../shared/paths";
import type { Frontmatter } from "../shared/types";
import type { AttestationsInitialOwnership } from "./initial-ownership";

export type AttestationOutput = {
	body: string;
	frontmatter: Frontmatter;
	generatedPath: string;
	publicPath: string;
	routeId: string;
	sourcePath: string;
};

type AttestationArtifactMeta =
	| {
			kind: "generated-attestation";
			routeId: string;
	  }
	| {
			kind: "public-attestation";
			routeId: string;
	  };

function artifactPath(root: string, path: string): string {
	return relative(root, path).replaceAll("\\", "/");
}

export function assertUniqueAttestationOutputs(
	outputs: readonly AttestationOutput[],
): AttestationOutput[] {
	const byRouteId = new Map<string, AttestationOutput>();
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

export function defineAttestationsCodegen(
	outputs: readonly AttestationOutput[],
	initialOwnership: AttestationsInitialOwnership = {
		generatedEntities: [],
		legacyGeneratedDocs: [],
		publicAttestations: [],
	},
) {
	const codegenInputs = {} as const;
	const codegenOutputs = {
		generatedEntities: {
			root: generatedEntitiesDir,
			ownership: {
				manifest: join(
					siteRoot,
					".codegen/attestations-generated.json",
				),
				initialFiles: initialOwnership.generatedEntities,
			},
		},
		legacyGeneratedDocs: {
			root: generatedDocsDir,
			ownership: {
				manifest: join(
					siteRoot,
					".codegen/attestations-legacy-generated.json",
				),
				initialFiles: initialOwnership.legacyGeneratedDocs,
			},
		},
		publicAttestations: {
			root: publicDir,
			ownership: {
				manifest: join(siteRoot, ".codegen/attestations-public.json"),
				initialFiles: initialOwnership.publicAttestations,
			},
		},
	} as const;

	return defineCodegen<
		typeof codegenInputs,
		typeof codegenOutputs,
		AttestationArtifactMeta
	>({
		inputs: codegenInputs,
		outputs: codegenOutputs,
		build: () => [
			...outputs.flatMap((output) => {
				const provenance = [
					{
						kind: "source" as const,
						path: output.sourcePath,
					},
				];

				return [
					{
						content: `${serializeFrontmatter(output.frontmatter)}\n${output.body}`,
						id: `attestations:generated:${output.routeId}`,
						meta: {
							kind: "generated-attestation",
							routeId: output.routeId,
						} satisfies AttestationArtifactMeta,
						provenance,
						to: {
							path: artifactPath(
								generatedEntitiesDir,
								output.generatedPath,
							),
							target: "generatedEntities" as const,
						},
					},
					{
						content: output.body,
						id: `attestations:public:${output.routeId}`,
						meta: {
							kind: "public-attestation",
							routeId: output.routeId,
						} satisfies AttestationArtifactMeta,
						provenance,
						to: {
							path: artifactPath(publicDir, output.publicPath),
							target: "publicAttestations" as const,
						},
					},
				];
			}),
		],
	});
}
