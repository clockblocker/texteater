import { expect, test } from "bun:test";
import { dumling } from "dumling";
import { attestationSlugForEntity } from "../scripts/generate-content/attestations/entity/attestation-slug";

const lemma = dumling.en.create.lemma({
	canonicalForm: "walk",
	family: "Lexeme",
	kind: "VERB",
	coreFeatures: {},
});
const surface = dumling.en.convert.lemma.toSurface(lemma);
const selection = dumling.en.convert.surface.toSelection(surface, {
	segmentedSentenceId:
		dumling.en.create.segmentedSentenceId("sentence:test:walk"),
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "walk",
	selectedOrthography: "Standard",
});

test("identity-addressed attestation routes remain filesystem safe", () => {
	const lemmaSlug = attestationSlugForEntity(lemma);
	const surfaceSlug = attestationSlugForEntity(surface);

	expect(lemmaSlug).toMatch(/^sha256-[\w-]{43}$/u);
	expect(surfaceSlug).toMatch(/^sha256-[\w-]{43}$/u);
	expect(lemmaSlug).not.toBe(surfaceSlug);
});

test("Selection routes retain the reversible local Selection identity", () => {
	expect(attestationSlugForEntity(selection)).toBe(
		String(dumling.en.id.encode.asBase64Url(selection)),
	);
});
