import type { ZodType } from "zod";
import { dumling } from "../../src";
import { abstractSchemas, schemasFor } from "../../src/schema";
import type {
	AbstractLemma,
	ApiResult,
	Descriptor,
	DumlingBase64Url,
	DumlingCsv,
	EntityForKind,
	FeatureValue,
	IdDecodeError,
	IdDecodeSuccess,
	Lemma,
	SegmentedSentenceId,
	Selection,
	SelectionIdentity,
	SelectionOptionsFor,
	Surface,
} from "../../src/types";

const sentenceId = dumling.de.create.segmentedSentenceId("sentence:de:am-see");
sentenceId satisfies SegmentedSentenceId;

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
	realizationCoverage: "Full",
	surfaceFeatures: null,
}) satisfies Surface<"de", "Citation", "Lexeme", "NOUN">;

const options = {
	segmentedSentenceId: sentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [4],
	attestedSurface: "See",
	selectedOrthography: "Standard",
} satisfies SelectionOptionsFor;

const selection = dumling.de.convert.surface.toSelection(
	surface,
	options,
) satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

selection satisfies EntityForKind<"de", "Selection">;
selection.surface.lemma satisfies Lemma<"de", "Lexeme", "NOUN">;
selection.segmentedSentenceId satisfies SegmentedSentenceId;

const descriptor = dumling.de.describe.as.selection(surface);
descriptor satisfies Descriptor<
	"Selection",
	"de",
	"Lexeme",
	"NOUN",
	"Citation"
>;

const csv = dumling.de.id.encode.asCsv(selection);
csv satisfies DumlingCsv<"de">;
const id = dumling.de.id.encode.asBase64Url(csv);
id satisfies DumlingBase64Url<"de">;

const decoded = dumling.de.id.decode.asSelectionIdentity(id);
decoded satisfies ApiResult<
	Extract<IdDecodeSuccess<"de">, { kind: "Selection" }>,
	IdDecodeError
>;
if (decoded.success) {
	decoded.data.selectionIdentity satisfies SelectionIdentity;
	decoded.data.selectionIdentity
		.segmentedSentenceId satisfies SegmentedSentenceId;
}

const nounSelectionSchema =
	schemasFor.de.entity.Selection.Citation.Lexeme.NOUN();
nounSelectionSchema satisfies ZodType<
	Selection<"de", "Citation", "Lexeme", "NOUN">
>;
abstractSchemas.entity.Lemma satisfies ZodType<AbstractLemma<string>>;

const gender: FeatureValue<"de", "core", "Lexeme", "NOUN", "gender"> = "Masc";
void gender;

// @ts-expect-error invalid German noun gender
const invalidGender: FeatureValue<"de", "core", "Lexeme", "NOUN", "gender"> =
	"Past";
void invalidGender;

// @ts-expect-error opaque sentence IDs cannot be plain strings
const invalidSentenceId: SegmentedSentenceId = "sentence:de:am-see";
void invalidSentenceId;

// @ts-expect-error lexemes do not expose morpheme subkinds
schemasFor.de.entity.Selection.Citation.Lexeme.Circumfix();
