/** biome-ignore-all lint/correctness/noUnusedVariables: README example file */
import { dumling } from "../../src";
import { schemasFor } from "../../src/schema";
import type { Lemma, Selection, Surface } from "../../src/types";

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

// README_BLOCK:core-surface:start
const seeSurface = dumling.de.create.surface.citation({
	lemma: seeLemma,
	normalizedSurface: "See",
	spelling: "Canonical",
	realizationCoverage: "Full",
	surfaceFeatures: null,
}) satisfies Surface<
	"de",
	"Citation",
	"Lexeme",
	"NOUN"
>;
// README_BLOCK:core-surface:end

// README_BLOCK:core-selection:start
const seeSelection = dumling.de.create.selection({
	segmentedSentenceId: dumling.de.create.segmentedSentenceId(
		"example:sentence:am-see",
	),
	clickedSegmentIndex: 0,
	surfaceSegmentIndices: [0],
	attestedSurface: "See",
	selectedOrthography: "Standard",
	surface: seeSurface,
}) satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;
// README_BLOCK:core-selection:end

// README_BLOCK:core-selection-id-examples:start
const seeSelectionReadableCsv =
	"Selection,example:sentence:am-see,0";
const seeLemmaReadableCsv =
	'Lemma,de,see,Lexeme,NOUN,"{""gender"":""Masc"",""hyph"":null}"';
// README_BLOCK:core-selection-id-examples:end

void seeSelection;

// README_BLOCK:quickstart-de:start
import { dumling as packageDumling } from "dumling";
import { schemasFor as packageSchemas } from "dumling/schema";
import type {
	DumlingDescriptorCsv as PackageDumlingDescriptorCsv,
	FeatureValue as PackageFeatureValue,
	Lemma as PackageLemma,
	Selection as PackageSelection,
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
		realizationCoverage: "Full",
		surfaceFeatures: null,
	});
const selection: PackageSelection<"de", "Citation", "Lexeme", "NOUN"> =
	packageDumling.de.convert.surface.toSelection(surface, {
		segmentedSentenceId: packageDumling.de.create.segmentedSentenceId(
			"example:sentence:am-see",
		),
		clickedSegmentIndex: 0,
		surfaceSegmentIndices: [0],
		attestedSurface: "See",
		selectedOrthography: "Standard",
	});
const descriptor = packageDumling.de.describe.as.selection(selection);
const descriptorCsv = packageDumling.de.describe.asCsv.selection(selection);
const extractedLemma = packageDumling.de.extract.lemma(selection);
const gender: PackageFeatureValue<
	"de",
	"core",
	"Lexeme",
	"NOUN",
	"gender"
> = "Masc";

const parsed = packageDumling.de.parse.selection(selection);
if (!parsed.success) {
	throw new Error(parsed.error.message);
}

const id = packageDumling.de.id.encode.asBase64Url(parsed.data);
const decoded = packageDumling.de.id.decode.asSelectionIdentity(id);
if (!decoded.success) {
	throw new Error(decoded.error?.message ?? "Failed to decode selection ID");
}

descriptor.surfaceKind satisfies "Citation";
descriptorCsv satisfies PackageDumlingDescriptorCsv<"de", "Selection">;
extractedLemma satisfies PackageLemma<"de">;
gender satisfies "Masc";

decoded.data.selectionIdentity.clickedSegmentIndex satisfies number;
packageSchemas.de.entity.Selection.Citation.Lexeme.NOUN().parse(parsed.data);
// README_BLOCK:quickstart-de:end

void schemasFor.de.entity.Lemma.Lexeme.VERB();
