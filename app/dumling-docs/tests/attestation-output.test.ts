import { expect, test } from "bun:test";
import { join } from "node:path";
import {
	type AttestationOutput,
	assertUniqueAttestationOutputs,
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

test("generation rejects two source records claiming one occurrence route", () => {
	const first = output("de/attestation/shared", "first.ts");
	const unrelated = output("de/attestation/other", "other.ts");
	const later = output("de/attestation/shared", "later.ts");

	expect(() =>
		assertUniqueAttestationOutputs([first, unrelated, later]),
	).toThrow("Attestation route collision");
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
				path: join(generatedEntitiesDir, "de/attestation/current.md"),
				routeId: "de/attestation/current",
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
		generatedEntities: ["de/attestation/current.md"],
		legacyGeneratedDocs: ["de/attestation/legacy.md"],
		publicAttestations: [
			"de/attestation/current.md",
			"de/attestation/legacy.md",
		],
	});
});
