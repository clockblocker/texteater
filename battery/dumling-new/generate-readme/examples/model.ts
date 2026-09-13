/** biome-ignore-all lint/correctness/noUnusedVariables: README example file */

// README_BLOCK:lemma:start
import type * as Dumling from "dumling/types";

const lemma = {
	unitKind: "Lemma",
	language: "de",
	canonicalForm: "schweigend",
	family: "Lexeme",
	kind: "ADJ",
	coreFeatures: {
		abbr: null,
		foreign: null,
		numType: null,
		variant: null,
	},
} satisfies Dumling.Lemma<"de", "Lexeme", "ADJ">;
// README_BLOCK:lemma:end

// README_BLOCK:surface:start
const surface = {
	unitKind: "Surface",
	language: "de",
	normalizedSurface: "schweigend",
	spelling: "Canonical",
	inflectionalFeatures: {
		case: null,
		degree: "Pos",
		gender: null,
		number: null,
	},
	lemma,
	surfaceFeatures: null,
} satisfies Dumling.Surface<"de", "Lexeme", "ADJ">;
// README_BLOCK:surface:end

// README_BLOCK:reading:start
const reading = {
	unitKind: "Reading",
	lemma,
	emojiDescription: "🤫",
} satisfies Dumling.Reading<"de", "Lexeme", "ADJ">;
// README_BLOCK:reading:end

// README_BLOCK:attestation:start
const attestation = {
	unitKind: "Attestation",
	surface,
	members: [{ attested: "schweigend", orthography: "Standard" }],
	realizationCoverage: "Full",
} satisfies Dumling.Attestation<"de", "Lexeme", "ADJ">;

// README_BLOCK:attestation:end

// README_BLOCK:grundform:start
import { checkIfGrundform } from "dumling";

const grundform = checkIfGrundform(surface);

// => { success: true, value: true }
// README_BLOCK:grundform:end

// README_BLOCK:parse:start
import { parseUnit } from "dumling";

declare const input: unknown;

const parsed = parseUnit(input, {
	unitKind: "Surface",
	language: "de",
	family: "Lexeme",
	kind: "ADJ",
});

if (parsed.success) {
	parsed.chain.value satisfies Dumling.Surface<"de", "Lexeme", "ADJ">;
}

// README_BLOCK:parse:end

// README_BLOCK:schema:start
import { surfaceSchema } from "dumling/schema/de/lexeme/adjective";

const normalized = surfaceSchema.parse(input);
// README_BLOCK:schema:end
