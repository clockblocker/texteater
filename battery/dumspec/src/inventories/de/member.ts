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
	};
};
/** Provides the authoring type boundary; catalog validation runs in the build. */
export function defineAuthoredMember(member: AuthoredMember): AuthoredMember {
	return member;
}
