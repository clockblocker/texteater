import { expect, test } from "bun:test";
import { dumling } from "dumling";
import {
	attestationSlugForEntity,
	attestationSlugForSource,
} from "../scripts/generate-content/attestations/entity/attestation-slug";

const lemma = dumling.en.create.lemma({
	canonicalForm: "walk",
	family: "Lexeme",
	kind: "VERB",
	coreFeatures: {
		abbr: null,
		extPos: null,
		hasGovPrep: null,
		phrasal: null,
		style: null,
	},
});
const surface = dumling.en.convert.lemma.toSurface(lemma);
const attestation = dumling.en.convert.surface.toAttestation(surface, {
	members: [{ attested: "walk", orthography: "Standard" }],
	realizationCoverage: "Full",
});

test("identity-addressed attestation routes remain filesystem safe", () => {
	const lemmaSlug = attestationSlugForEntity(lemma);
	const surfaceSlug = attestationSlugForEntity(surface);

	expect(lemmaSlug).toMatch(/^sha256-[\w-]{43}$/u);
	expect(surfaceSlug).toMatch(/^sha256-[\w-]{43}$/u);
	expect(lemmaSlug).not.toBe(surfaceSlug);
});

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
	expect(slug).not.toBe(attestationSlugForEntity(surface));
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

	expect(attestationSlugForSource(source)).toBe(
		attestationSlugForSource({
			...source,
			entity: { ...attestation, realizationCoverage: "Partial" },
		}),
	);
});
