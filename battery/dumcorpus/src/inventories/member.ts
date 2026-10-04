import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

/**
 * The languages with an Authored Inventory. Registering a language's
 * inventory in `registry.ts` adds it here.
 */
export type InventoryLanguage = "de";

/** An authored unit is closed-class, never Foreign, so its Reading has an Emoji Description. */
type AuthoredFamily<L extends Dumling.Language> = Exclude<
	Dumling.Family<L>,
	"Foreign"
>;

/**
 * An authored member of language `L`'s inventory. dumcorpus's inventory tests
 * check every member with Dumling and Dumrel and against its route's
 * Knowledge policy (ADR 0021).
 */
export type AuthoredMember<L extends InventoryLanguage = InventoryLanguage> =
	L extends InventoryLanguage
		? {
				readonly lemma: Dumling.Lemma<L, AuthoredFamily<L>>;
				readonly reading: Dumling.Reading<L, AuthoredFamily<L>>;
				readonly knowledge: Dumrel.ReadingKnowledge;
				readonly coverage: {
					readonly transcription: string;
					readonly definition: string;
					readonly translations: Readonly<Record<string, string>>;
					readonly semanticRelations: Readonly<
						Record<string, string>
					>;
					readonly semanticRelationTargetKind: string;
					/** A Locution's Locution Type: Authored, or ReviewedEmpty when it has none (ADR 0039). */
					readonly locutionType?: string;
				};
			}
		: never;
