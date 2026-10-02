import { expect, test } from "bun:test";
import { attestationSlugForSource } from "../scripts/generate-content/attestations/entity/attestation-slug";
import { attestation } from "./fixtures";

function occurrenceSource(sentenceMarkdown: string, sourcePath: string) {
	return {
		entity: attestation,
		sentenceMarkdown,
		sourcePath,
	};
}

test("Attestation routes use an opaque docs-owned occurrence slug", () => {
	const slug = attestationSlugForSource(
		occurrenceSource("I [walk].", "first.ts"),
	);

	expect(slug).toMatch(/^sha256-[\w-]{43}$/u);
});

test("equal Attestations in different sentence wrappers keep distinct occurrence routes", () => {
	expect(
		attestationSlugForSource(occurrenceSource("I [walk].", "first.ts")),
	).not.toBe(
		attestationSlugForSource(occurrenceSource("We [walk].", "second.ts")),
	);
});

test("occurrence routes are stable when the linked Attestation changes", () => {
	const source = occurrenceSource("I [walk].", "first.ts");
	const relinked = {
		...source,
		entity: { ...attestation, realizationCoverage: "Partial" },
	};

	expect(attestationSlugForSource(source)).toBe(
		attestationSlugForSource(relinked),
	);
});
