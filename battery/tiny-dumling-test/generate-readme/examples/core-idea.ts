/** biome-ignore-all lint/correctness/noUnusedVariables: README example file */
import { dumling, readingFingerprint } from "../../src";
import { readingSchema, schemasFor } from "../../src/schema";
import type { Attestation, Lemma, Reading, Surface } from "../../src/types";

// README_BLOCK:core-lemma:start
const seeLemma = dumling.de.create.lemma({
	canonicalForm: "see",
	family: "Lexeme",
	kind: "NOUN",
	coreFeatures: {
		gender: "Masc",
		hyph: null,
	},
}) satisfies Lemma<"de", "Lexeme", "NOUN">;
// README_BLOCK:core-lemma:end

// README_BLOCK:core-reading:start
const seeReading = {
	lemma: seeLemma,
	emojiDescription: "\u{1F30A}",
} satisfies Reading<"de", "Lexeme", "NOUN">;
const seeReadingFingerprint = readingFingerprint(seeReading);
// README_BLOCK:core-reading:end

// README_BLOCK:core-surface:start
const seeSurface = dumling.de.create.surface.citation({
	lemma: seeLemma,
	normalizedSurface: "See",
	spelling: "Canonical",
	surfaceFeatures: null,
}) satisfies Surface<
	"de",
	"Citation",
	"Lexeme",
	"NOUN"
>;
// README_BLOCK:core-surface:end

// README_BLOCK:core-attestation:start
const seeAttestation = dumling.de.create.attestation({
	members: [{ attested: "See", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: seeSurface,
}) satisfies Attestation<"de", "Citation", "Lexeme", "NOUN">;
// README_BLOCK:core-attestation:end

// README_BLOCK:core-entity-id-examples:start
const seeSurfaceReadableCsv =
	'Surface,de,Citation,See,"{\"\"canonicalForm\"\":\"\"see\"\",\"\"coreFeatures\"\":{\"\"gender\"\":\"\"Masc\"\",\"\"hyph\"\":null},\"\"family\"\":\"\"Lexeme\"\",\"\"kind\"\":\"\"NOUN\"\",\"\"language\"\":\"\"de\"\"}"';
const seeLemmaReadableCsv =
	'Lemma,de,see,Lexeme,NOUN,"{""gender"":""Masc"",""hyph"":null}"';
// README_BLOCK:core-entity-id-examples:end

void seeAttestation;

// README_BLOCK:quickstart-de:start
import {
	dumling as packageDumling,
	readingFingerprint as packageReadingFingerprint,
} from "dumling";
import {
	readingSchema as packageReadingSchema,
	schemasFor as packageSchemas,
} from "dumling/schema";
import type {
	Attestation as PackageAttestation,
	DumlingDescriptorCsv as PackageDumlingDescriptorCsv,
	FeatureValue as PackageFeatureValue,
	Lemma as PackageLemma,
	Reading as PackageReading,
	Surface as PackageSurface,
} from "dumling/types";

const lemma = packageDumling.de.create.lemma({
	canonicalForm: "see",
	family: "Lexeme",
	kind: "NOUN",
	coreFeatures: {
		gender: "Masc",
		hyph: null,
	},
}) satisfies PackageLemma<"de", "Lexeme", "NOUN">;

const surface: PackageSurface<"de", "Citation", "Lexeme", "NOUN"> =
	packageDumling.de.create.surface.citation({
		lemma,
		normalizedSurface: "See",
		spelling: "Canonical",
		surfaceFeatures: null,
	});
const reading = packageReadingSchema.parse({
	lemma,
	emojiDescription: "\u{1F30A}",
}) as PackageReading<"de">;
const readingIdentity = packageReadingFingerprint(reading);
const attestation: PackageAttestation<"de", "Citation", "Lexeme", "NOUN"> =
	packageDumling.de.convert.surface.toAttestation(surface, {
		members: [{ attested: "See", orthography: "Standard" }],
		realizationCoverage: "Full",
	});
const descriptor = packageDumling.de.describe.as.attestation(attestation);
const descriptorCsv = packageDumling.de.describe.asCsv.attestation(attestation);
const extractedLemma = packageDumling.de.extract.lemma(attestation);
const gender: PackageFeatureValue<
	"de",
	"core",
	"Lexeme",
	"NOUN",
	"gender"
> = "Masc";

const parsed = packageDumling.de.parse.attestation(attestation);
if (!parsed.success) {
	throw new Error(parsed.error.message);
}

const id = packageDumling.de.id.encode.asBase64Url(parsed.data.surface);
const decoded = packageDumling.de.id.decode.asSurfaceIdentity(id);
if (!decoded.success) {
	throw new Error(decoded.error?.message ?? "Failed to decode Surface ID");
}

descriptor.surfaceKind satisfies "Citation";
descriptorCsv satisfies PackageDumlingDescriptorCsv<"de", "Attestation">;
extractedLemma satisfies PackageLemma<"de">;
gender satisfies "Masc";

decoded.data.surfaceIdentity.normalizedSurface satisfies string;
readingIdentity satisfies string;
packageSchemas.de.entity.Attestation.Citation.Lexeme.NOUN().parse(parsed.data);
// README_BLOCK:quickstart-de:end

void schemasFor.de.entity.Lemma.Lexeme.VERB();
