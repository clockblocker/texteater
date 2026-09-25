export const directSemanticRelationValues = [
	"synonym",
	"nearSynonym",
	"antonym",
	"nearAntonym",
	"hypernym",
	"holonym",
] as const;

export const translationLanguageValues = ["en", "ru"] as const;

/** Cases a lexically governed preposition can assign to its complement. */
export const governedCaseValues = ["Acc", "Dat", "Gen"] as const;

/** Whether a Valency Frame Slot must be filled or may be left out. */
export const valencySlotStatusValues = ["Required", "Optional"] as const;

/** What fills a Slot: a person (`jN`), a thing (`etw`), or either. */
export const valencyReferentValues = [
	"Someone",
	"Something",
	"Either",
] as const;

/** Cases a German bare case complement takes, the subject's Nom included. */
export const germanComplementCaseValues = ["Nom", "Acc", "Dat", "Gen"] as const;
