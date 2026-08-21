import type { ZodType } from "zod";
import { dumling, readingFingerprint } from "../../src";
import { abstractSchemas, schemasFor } from "../../src/schema";
import type {
	AbstractAttestation,
	AbstractLemma,
	Attestation,
	AttestationOptionsFor,
	Descriptor,
	DumlingBase64Url,
	DumlingCsv,
	EntityForKind,
	FeatureValue,
	Lemma,
	Reading,
	ReadingFingerprint,
	Surface,
} from "../../src/types";

const lemma = dumling.de.create.lemma({
	canonicalForm: "See",
	family: "Lexeme",
	kind: "NOUN",
	coreFeatures: { gender: "Masc", hyph: null },
}) satisfies Lemma<"de", "Lexeme", "NOUN">;

const surface = dumling.de.create.surface.citation({
	lemma,
	normalizedSurface: "See",
	spelling: "Canonical",
	surfaceFeatures: null,
}) satisfies Surface<"de", "Citation", "Lexeme", "NOUN">;

const options = {
	members: [{ attested: "See", orthography: "Standard" }],
	realizationCoverage: "Full",
} satisfies AttestationOptionsFor;

const attestation = dumling.de.convert.surface.toAttestation(
	surface,
	options,
) satisfies Attestation<"de", "Citation", "Lexeme", "NOUN">;

const reading = {
	lemma,
	emojiDescription: "\u{1F30A}",
} satisfies Reading<"de", "Lexeme", "NOUN">;
reading.lemma satisfies Lemma<"de", "Lexeme", "NOUN">;
const fingerprint: ReadingFingerprint = readingFingerprint(reading);
void fingerprint;

// @ts-expect-error Attestations require an explicit contextual Surface.
dumling.de.convert.lemma.toAttestation(lemma, options);

attestation satisfies EntityForKind<"de", "Attestation">;
attestation.surface.lemma satisfies Lemma<"de", "Lexeme", "NOUN">;
attestation.members[0].attested satisfies string;

const descriptor = dumling.de.describe.as.attestation(surface);
descriptor satisfies Descriptor<
	"Attestation",
	"de",
	"Lexeme",
	"NOUN",
	"Citation"
>;

const csv = dumling.de.id.encode.asCsv(surface);
csv satisfies DumlingCsv<"de">;
const id = dumling.de.id.encode.asBase64Url(csv);
id satisfies DumlingBase64Url<"de">;

// @ts-expect-error Attestation is deliberately not ID-addressable.
dumling.de.id.encode.asCsv(attestation);
// @ts-expect-error No Attestation identity decoder exists.
dumling.de.id.decode.asAttestationIdentity(id);

const nounAttestationSchema =
	schemasFor.de.entity.Attestation.Citation.Lexeme.NOUN();
nounAttestationSchema satisfies ZodType<
	Attestation<"de", "Citation", "Lexeme", "NOUN">
>;
abstractSchemas.entity.Lemma satisfies ZodType<AbstractLemma<string>>;
abstractSchemas.entity.Attestation satisfies ZodType<
	AbstractAttestation<string>
>;

const gender: FeatureValue<"de", "core", "Lexeme", "NOUN", "gender"> = "Masc";
void gender;

// @ts-expect-error invalid German noun gender
const invalidGender: FeatureValue<"de", "core", "Lexeme", "NOUN", "gender"> =
	"Past";
void invalidGender;

// @ts-expect-error lexemes do not expose morpheme subkinds
schemasFor.de.entity.Attestation.Citation.Lexeme.Circumfix();
