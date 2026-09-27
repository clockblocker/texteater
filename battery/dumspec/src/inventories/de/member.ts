import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

export type AuthoredMember = {
	readonly lemma: Dumling.Lemma<"de">;
	readonly reading: Dumling.Reading<"de">;
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
