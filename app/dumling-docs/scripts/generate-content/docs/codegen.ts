import { join, relative } from "node:path";
import { defineCodegen } from "dumcodegen";
import { generatedDocsDir, publicDir, siteRoot } from "../shared/paths";
import { serializeFrontmatter } from "./frontmatter";
import type { DocsInitialOwnership } from "./initial-ownership";
import { navItemsForPages, renderNavJson, renderNavMarkdown } from "./nav";
import type { DocsOutput } from "./types";

type DocsArtifactMeta =
	| {
			frontmatter: DocsOutput["frontmatter"];
			kind: "generated-doc";
			routeId: string;
			sourcePath: string;
	  }
	| {
			kind: "public-doc";
			routeId: string;
	  }
	| {
			kind: "navigation";
	  };

function artifactPath(root: string, path: string): string {
	return relative(root, path).replaceAll("\\", "/");
}

const noInitialOwnership: DocsInitialOwnership = {
	generatedDocs: [],
	publicDocs: [],
};

export function defineDocsCodegen(
	outputs: readonly DocsOutput[],
	initialOwnership: DocsInitialOwnership = noInitialOwnership,
) {
	const codegenInputs = {} as const;
	const codegenOutputs = {
		generatedDocs: {
			root: generatedDocsDir,
			ownership: {
				manifest: join(siteRoot, ".dumcodegen/docs-generated.json"),
				initialFiles: initialOwnership.generatedDocs,
			},
		},
		publicDocs: {
			root: publicDir,
			ownership: {
				manifest: join(siteRoot, ".dumcodegen/docs-public.json"),
				initialFiles: initialOwnership.publicDocs,
			},
		},
	} as const;

	return defineCodegen<
		typeof codegenInputs,
		typeof codegenOutputs,
		DocsArtifactMeta
	>({
		inputs: codegenInputs,
		outputs: codegenOutputs,
		build: () =>
			outputs.flatMap((output) => {
				const provenance = [
					{
						kind: "source" as const,
						path: output.sourcePath,
					},
				];

				return [
					{
						content: `${serializeFrontmatter(output.frontmatter)}\n${output.body}`,
						id: `docs:generated:${output.routeId}`,
						meta: {
							frontmatter: output.frontmatter,
							kind: "generated-doc",
							routeId: output.routeId,
							sourcePath: output.sourcePath,
						} satisfies DocsArtifactMeta,
						provenance,
						to: {
							path: artifactPath(
								generatedDocsDir,
								output.generatedPath,
							),
							target: "generatedDocs",
						},
					},
					{
						content: output.body,
						id: `docs:public:${output.routeId}`,
						meta: {
							kind: "public-doc",
							routeId: output.routeId,
						} satisfies DocsArtifactMeta,
						provenance,
						to: {
							path: artifactPath(publicDir, output.publicPath),
							target: "publicDocs",
						},
					},
				];
			}),
		aggregate: (primary) => {
			const pages = primary.flatMap((artifact) =>
				artifact.meta.kind === "generated-doc"
					? [
							{
								frontmatter: artifact.meta.frontmatter,
								routeId: artifact.meta.routeId,
							},
						]
					: [],
			);
			const items = navItemsForPages(pages);
			const provenance = primary.flatMap((artifact) =>
				artifact.meta.kind === "generated-doc"
					? [
							{
								id: artifact.id,
								kind: "artifact" as const,
							},
						]
					: [],
			);

			return [
				{
					content: renderNavJson(items),
					id: "docs:nav:json",
					meta: { kind: "navigation" } satisfies DocsArtifactMeta,
					provenance,
					to: {
						path: "nav.json",
						target: "publicDocs",
					},
				},
				{
					content: renderNavMarkdown(items),
					id: "docs:nav:markdown",
					meta: { kind: "navigation" } satisfies DocsArtifactMeta,
					provenance,
					to: {
						path: "nav.md",
						target: "publicDocs",
					},
				},
			];
		},
	});
}
