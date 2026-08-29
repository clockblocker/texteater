import type { Reading } from "dumling/types";
import type {
	ReadingBlockLayout,
	ReadingBlockPlan,
	ReadingNoteBlockRenderer,
	ReadingNoteRenderContext,
	UnitReadingFamilyFor,
} from "../../src/notes/reading";
import { resolveReadingBlockPlan } from "../../src/notes/reading/reading-block-plan";
import { rendererFor } from "../../src/notes/reading/system-block-catalog";

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
void verbHeader;

const verbRoute = {
	targetLanguage: "de",
	family: "Lexeme",
	kind: "VERB",
} as const;
rendererFor(verbRoute, "Header") satisfies ReadingNoteBlockRenderer<
	"de",
	"Lexeme",
	"VERB"
>;

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

declare const blockLayout: ReadingBlockLayout;
// @ts-expect-error Layout visibility exposes no mutating Set interface.
blockLayout.hidden.add("Definition");

resolveReadingBlockPlan(verbRoute, blockLayout) satisfies ReadingBlockPlan<
	"de",
	"Lexeme",
	"VERB"
>;
