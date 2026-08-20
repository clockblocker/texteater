import type { Reading } from "dumling/types";
import type {
	ReadingNoteBlockRenderer,
	ReadingNoteRenderContext,
	ReadingNoteRendererOverrideRegistry,
	UnitReadingFamilyFor,
} from "../../src/notes/reading";
import { DE_READING_NOTE_BLOCK_MAP } from "../../src/notes/reading/de/block-map";

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false;
type Assert<Condition extends true> = Condition;

export type ReadingFamiliesExcludeConstruction = Assert<
	Equal<UnitReadingFamilyFor<"de">, "Lexeme" | "Phraseme" | "Morpheme">
>;

const verbHeader: ReadingNoteBlockRenderer<"de", "Lexeme", "VERB"> = (
	context,
) => {
	context satisfies ReadingNoteRenderContext<"de", "Lexeme", "VERB">;
	context.note.reading satisfies Reading<"de", "Lexeme", "VERB">;
	context.note.reading.lemma.coreFeatures.hasGovPrep satisfies string | null;
	context.note.reading.lemma.coreFeatures.hasSepPrefix satisfies
		| string
		| null;
	context.note.reading.lemma.coreFeatures.lexicallyReflexive satisfies
		| "Yes"
		| null;
	return null;
};

const overrides = {
	Lexeme: { VERB: { Header: verbHeader } },
} satisfies ReadingNoteRendererOverrideRegistry<"de">;
void overrides;

const wrongRoute: ReadingNoteRendererOverrideRegistry<"de"> = {
	Lexeme: {
		// @ts-expect-error The German VERB renderer cannot be installed on NOUN.
		NOUN: { Header: verbHeader },
	},
};
void wrongRoute;

export type ImpossibleContext = ReadingNoteRenderContext<
	"de",
	"Morpheme",
	// @ts-expect-error VERB is not a German Morpheme kind.
	"VERB"
>;

declare const nounContext: ReadingNoteRenderContext<"de", "Lexeme", "NOUN">;
const mismatchedVerbContext: ReadingNoteRenderContext<"de", "Lexeme", "VERB"> =
	{
		// @ts-expect-error A NOUN-refined Note cannot be paired with a VERB route.
		note: nounContext.note,
		route: { targetLanguage: "de", family: "Lexeme", kind: "VERB" },
		capabilities: nounContext.capabilities,
	};
void mismatchedVerbContext;

// @ts-expect-error Construction is not a Unit Reading route.
const constructionFamily: UnitReadingFamilyFor<"de"> = "Construction";
void constructionFamily;

// @ts-expect-error Applicability leaves expose no mutating Set API.
DE_READING_NOTE_BLOCK_MAP.Lexeme.NOUN.add("Definition");
