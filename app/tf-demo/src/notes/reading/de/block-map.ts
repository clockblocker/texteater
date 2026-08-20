import type { LemmaFamilyFor, LemmaKindFor } from "dumling/types";

import type { NoteBlockKindFor } from "../../note-block-kind";

type DeUnitReadingFamily = Extract<
	LemmaFamilyFor<"de">,
	"Lexeme" | "Phraseme" | "Morpheme"
>;
type DeReadingNoteBlockMap = {
	[Family in DeUnitReadingFamily]: {
		[Kind in LemmaKindFor<"de", Family>]: ReadonlySet<
			NoteBlockKindFor<"UnitReadingNote">
		>;
	};
};

const baseBlocks = (): ReadonlySet<NoteBlockKindFor<"UnitReadingNote">> =>
	new Set(["Header", "SourceContexts", "Definition", "Translations"]);

const relationalBlocks = (): ReadonlySet<NoteBlockKindFor<"UnitReadingNote">> =>
	new Set([...baseBlocks(), "Relations"]);

export const DE_READING_NOTE_BLOCK_MAP: DeReadingNoteBlockMap = {
	Lexeme: {
		ADJ: relationalBlocks(),
		ADP: relationalBlocks(),
		ADV: relationalBlocks(),
		AUX: relationalBlocks(),
		CCONJ: relationalBlocks(),
		DET: relationalBlocks(),
		INTJ: relationalBlocks(),
		NOUN: relationalBlocks(),
		NUM: relationalBlocks(),
		PART: relationalBlocks(),
		PRON: relationalBlocks(),
		PROPN: relationalBlocks(),
		PUNCT: baseBlocks(),
		SCONJ: relationalBlocks(),
		SYM: relationalBlocks(),
		VERB: relationalBlocks(),
		X: baseBlocks(),
	},
	Phraseme: {
		Aphorism: relationalBlocks(),
		Collocation: relationalBlocks(),
		DiscourseFormula: relationalBlocks(),
		Idiom: relationalBlocks(),
		Proverb: relationalBlocks(),
	},
	Morpheme: {
		Circumfix: baseBlocks(),
		Clitic: baseBlocks(),
		Duplifix: baseBlocks(),
		Infix: baseBlocks(),
		Interfix: baseBlocks(),
		Prefix: baseBlocks(),
		Root: baseBlocks(),
		Suffix: baseBlocks(),
		Suffixoid: baseBlocks(),
		ToneMarking: baseBlocks(),
		Transfix: baseBlocks(),
	},
};
