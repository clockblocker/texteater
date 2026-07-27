/** biome-ignore-all lint/correctness/noUnusedVariables: README example file */
import { dumling } from "../../src";
import { schemasFor } from "../../src/schema";
import type { Lemma, Selection, Surface } from "../../src/types";

// README_BLOCK:core-lemma:start
const seeLemma = dumling.de.create.lemma({
	canonicalLemma: "see",
	lemmaKind: "Lexeme",
	lemmaSubKind: "NOUN",
	inherentFeatures: {
		gender: "Masc",
	},
	meaningInEmojis: "🌊",
}) satisfies Lemma<"de", "Lexeme", "NOUN">;
// README_BLOCK:core-lemma:end

// README_BLOCK:core-surface:start
const seeSurface = dumling.de.create.surface.citation({
	lemma: seeLemma,
	normalizedFullSurface: "See",
}) satisfies Surface<
	"de",
	"Citation",
	"Lexeme",
	"NOUN"
>;
// README_BLOCK:core-surface:end

// README_BLOCK:core-selection:start
const seeSelection = dumling.de.create.selection({
	spelledSelection: "See",
	surface: seeSurface,
}) satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;
// README_BLOCK:core-selection:end

// README_BLOCK:core-selection-id-examples:start
const seeSelectionReadableCsv =
	"Selection,See,Surface,Citation,see,Lemma,de,Lexeme,NOUN,see,🌊,gender=Masc";
const seeSelectionTinyCsv = "v1,x,See,s,c,see,l,de,l,n,see,🌊,g=m";
// README_BLOCK:core-selection-id-examples:end

void seeSelection;

// README_BLOCK:quickstart-de:start
import { dumling as packageDumling } from "dumling";
import { schemasFor as packageSchemas } from "dumling/schema";
import type {
	DumlingDescriptorCsv as PackageDumlingDescriptorCsv,
	FeatureValue as PackageFeatureValue,
	Lemma as PackageLemma,
} from "dumling/types";

const lemma = packageDumling.de.create.lemma({
	canonicalLemma: "see",
	lemmaKind: "Lexeme",
	lemmaSubKind: "NOUN",
	inherentFeatures: {
		gender: "Masc",
	},
	meaningInEmojis: "🌊",
}) satisfies PackageLemma<"de", "Lexeme", "NOUN">;

const surface = packageDumling.de.create.surface.citation({
	lemma,
	normalizedFullSurface: "See",
});
const selection = packageDumling.de.convert.surface.toSelection(surface, {
	spelledSelection: "See",
});
const descriptor = packageDumling.de.describe.as.selection(selection);
const descriptorCsv = packageDumling.de.describe.asCsv.selection(selection);
const extractedLemma = packageDumling.de.extract.lemma(selection);
const gender: PackageFeatureValue<
	"de",
	"inherent",
	"Lexeme",
	"NOUN",
	"gender"
> = "Masc";

const parsed = packageDumling.de.parse.selection(selection);
if (!parsed.success) {
	throw new Error(parsed.error.message);
}

const id = packageDumling.de.id.encode.asBase64Url(parsed.data);
const decoded = packageDumling.de.id.decode.asSelection(id);
if (!decoded.success) {
	throw new Error(decoded.error?.message ?? "Failed to decode selection ID");
}

descriptor.surfaceKind satisfies "Citation";
descriptorCsv satisfies PackageDumlingDescriptorCsv<"de", "Selection">;
extractedLemma satisfies PackageLemma<"de">;
gender satisfies "Masc";

packageSchemas.de.entity.Selection.Citation.Lexeme.NOUN().parse(
	decoded.data.selection,
);
// README_BLOCK:quickstart-de:end

void schemasFor.de.entity.Lemma.Lexeme.VERB();
