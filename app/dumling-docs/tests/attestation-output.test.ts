import { expect, test } from "bun:test";
import { join } from "node:path";
import {
	type AttestationOutput,
	lastAttestationOutputForEachRoute,
} from "../scripts/generate-content/attestations/codegen";
import { attestationsInitialOwnershipForPages } from "../scripts/generate-content/attestations/initial-ownership";
import {
	generatedDocsDir,
	generatedEntitiesDir,
} from "../scripts/generate-content/shared/paths";

function output(
	routeId: string,
	sourcePath: string,
	body = sourcePath,
): AttestationOutput {
	return {
		body,
		frontmatter: {
			order: 0,
			routeId,
			title: routeId,
		},
		generatedPath: `/generated/${routeId}.md`,
		publicPath: `/public/${routeId}.md`,
		routeId,
		sourcePath,
	};
}

test("the later source remains the page for a multiply-attested entity", () => {
	const first = output("de/selection/shared", "first.ts");
	const unrelated = output("de/selection/other", "other.ts");
	const later = output("de/selection/shared", "later.ts");

	expect(
		lastAttestationOutputForEachRoute([first, unrelated, later]),
	).toEqual([later, unrelated]);
});

test("first-run ownership adopts only legacy attestation outputs", () => {
	expect(
		attestationsInitialOwnershipForPages([
			{
				location: "docs",
				path: join(generatedDocsDir, "de/attestation/legacy.md"),
				routeId: "de/attestation/legacy",
			},
			{
				location: "entities",
				path: join(generatedEntitiesDir, "de/selection/current.md"),
				routeId: "de/selection/current",
			},
			{
				location: "docs",
				path: join(generatedDocsDir, "general/guide.md"),
				routeId: "general/guide",
			},
			{
				location: "entities",
				path: join(generatedEntitiesDir, "not/an/entity/page.md"),
				routeId: "not/an/entity/page",
			},
		]),
	).toEqual({
		generatedEntities: ["de/selection/current.md"],
		legacyGeneratedDocs: ["de/attestation/legacy.md"],
		publicAttestations: [
			"de/attestation/legacy.md",
			"de/selection/current.md",
		],
	});
});
