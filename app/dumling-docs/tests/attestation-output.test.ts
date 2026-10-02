import { expect, test } from "bun:test";
import { assertUniqueAttestationOutputs } from "../scripts/generate-content/attestations/generate-attestations";
import type { PageOutput } from "../scripts/generate-content/shared/types";

function output(
	routeId: string,
	sourcePath: string,
	body = sourcePath,
): PageOutput {
	return {
		body,
		frontmatter: {
			order: 0,
			routeId,
			title: routeId,
		},
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
