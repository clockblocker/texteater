import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

/** An authored unit is closed-class, never Foreign, so its Reading has an Emoji Description. */
type AuthoredFamily = Exclude<Dumling.Family<"de">, "Foreign">;

export type AuthoredMember = {
	readonly lemma: Dumling.Lemma<"de", AuthoredFamily>;
	readonly reading: Dumling.Reading<"de", AuthoredFamily>;
	readonly knowledge: Dumrel.ReadingKnowledge;
	readonly coverage: {
		readonly transcription: string;
		readonly definition: string;
		readonly translations: Readonly<Record<string, string>>;
		readonly semanticRelations: Readonly<Record<string, string>>;
		readonly semanticRelationTargetKind: string;
		/** A Locution's Locution Type: Authored, or ReviewedEmpty when it has none (ADR 0039). */
		readonly locutionType?: string;
	};
};
/**
 * Types an authored member. dumspec's inventory tests check every member with
 * Dumling and Dumrel and against its route's Knowledge policy (ADR 0021).
 */
export function defineAuthoredMember(member: AuthoredMember): AuthoredMember {
	return member;
}
