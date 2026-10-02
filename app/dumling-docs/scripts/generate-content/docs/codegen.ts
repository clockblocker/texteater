import { join } from "node:path";
import { defineCodegen } from "codegen";
import {
	generatedDocsDir,
	generatedEntitiesDir,
	publicDir,
	siteRoot,
} from "../shared/paths";
import type { Frontmatter, PageOutput } from "../shared/types";
import { serializeFrontmatter } from "./frontmatter";
import { navItemsForPages, renderNavJson, renderNavMarkdown } from "./nav";

type PageArtifactMeta =
	| {
			frontmatter: Frontmatter;
			kind: "generated-page";
			routeId: string;
	  }
	| {
			kind: "public-page";
			routeId: string;
	  }
	| {
			kind: "navigation";
	  };

const generatedRoots = {
	attestations: generatedEntitiesDir,
	docs: generatedDocsDir,
} as const;

/**
 * Writes each page as `${routeId}.md` twice: with frontmatter under the
 * generator's own root, and as the public copy. Only the docs get navigation.
 */
export function definePagesCodegen(
	name: keyof typeof generatedRoots,
	pages: readonly PageOutput[],
) {
	const codegenInputs = {} as const;
	const codegenOutputs = {
		generated: {
			root: generatedRoots[name],
			ownership: {
				manifest: join(siteRoot, `.codegen/${name}-generated.json`),
			},
		},
		public: {
			root: publicDir,
			ownership: {
				manifest: join(siteRoot, `.codegen/${name}-public.json`),
			},
		},
	} as const;

	return defineCodegen<
		typeof codegenInputs,
		typeof codegenOutputs,
		PageArtifactMeta
	>({
		inputs: codegenInputs,
		outputs: codegenOutputs,
		build: () =>
			pages.flatMap((page) => {
				const provenance = [
					{
						kind: "source" as const,
						path: page.sourcePath,
					},
				];
				const path = `${page.routeId}.md`;

				return [
					{
						content: `${serializeFrontmatter(page.frontmatter)}\n${page.body}`,
						id: `${name}:generated:${page.routeId}`,
						meta: {
							frontmatter: page.frontmatter,
							kind: "generated-page",
							routeId: page.routeId,
						} satisfies PageArtifactMeta,
						provenance,
						to: { path, target: "generated" },
					},
					{
						content: page.body,
						id: `${name}:public:${page.routeId}`,
						meta: {
							kind: "public-page",
							routeId: page.routeId,
						} satisfies PageArtifactMeta,
						provenance,
						to: { path, target: "public" },
					},
				];
			}),
		aggregate: (primary) => {
			if (name !== "docs") {
				return [];
			}

			const navPages = primary.flatMap((artifact) =>
				artifact.meta.kind === "generated-page"
					? [
							{
								frontmatter: artifact.meta.frontmatter,
								routeId: artifact.meta.routeId,
							},
						]
					: [],
			);
			const items = navItemsForPages(navPages);
			const provenance = primary.flatMap((artifact) =>
				artifact.meta.kind === "generated-page"
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
					meta: { kind: "navigation" } satisfies PageArtifactMeta,
					provenance,
					to: {
						path: "nav.json",
						target: "public",
					},
				},
				{
					content: renderNavMarkdown(items),
					id: "docs:nav:markdown",
					meta: { kind: "navigation" } satisfies PageArtifactMeta,
					provenance,
					to: {
						path: "nav.md",
						target: "public",
					},
				},
			];
		},
	});
}
