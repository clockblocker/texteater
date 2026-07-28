import { join, relative } from "node:path";
import { defineCodegen } from "codegen";
import { serializeFrontmatter } from "../docs/frontmatter";
import {
	classificationLogbookDir,
	generatedDocsDir,
	generatedEntitiesDir,
	publicDir,
	siteRoot,
} from "../shared/paths";
import type { Frontmatter } from "../shared/types";
import type { AttestationsInitialOwnership } from "./initial-ownership";
import type { SelectionLogbookCsvOutput } from "./selection/logbook";

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
	  }
	| {
			kind: "selection-logbook";
	  };

function artifactPath(root: string, path: string): string {
	return relative(root, path).replaceAll("\\", "/");
}

export function lastAttestationOutputForEachRoute(
	outputs: readonly AttestationOutput[],
): AttestationOutput[] {
	const byRouteId = new Map<string, AttestationOutput>();
	for (const output of outputs) {
		byRouteId.set(output.routeId, output);
	}
	return [...byRouteId.values()];
}

export function defineAttestationsCodegen(
	outputs: readonly AttestationOutput[],
	logbookOutputs: readonly SelectionLogbookCsvOutput[],
	initialOwnership: AttestationsInitialOwnership = {
		generatedEntities: [],
		legacyGeneratedDocs: [],
		publicAttestations: [],
	},
) {
	const codegenInputs = {} as const;
	const codegenOutputs = {
		classificationLogbooks: {
			root: classificationLogbookDir,
			ownership: {
				manifest: join(siteRoot, ".codegen/attestations-logbooks.json"),
			},
		},
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
			...logbookOutputs.map((output) => ({
				content: output.content,
				id: `attestations:logbook:${artifactPath(
					classificationLogbookDir,
					output.path,
				)}`,
				meta: {
					kind: "selection-logbook",
				} satisfies AttestationArtifactMeta,
				provenance: output.sourcePaths.map((path) => ({
					kind: "source" as const,
					path,
				})),
				to: {
					path: artifactPath(classificationLogbookDir, output.path),
					target: "classificationLogbooks" as const,
				},
			})),
		],
	});
}
