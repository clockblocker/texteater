import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge } from "dumrel";
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
export function defineAuthoredMember(member: AuthoredMember): AuthoredMember {
	const unit = parseUnit(member.reading);
	if (!unit.success) throw unit.error;
	const knowledge = parseReadingKnowledge({
		source: member.reading,
		knowledge: member.knowledge,
	});
	if (!knowledge.success) throw knowledge.error;
	return freeze(member);
}
function freeze<T>(value: T): T {
	if (value && typeof value === "object") {
		Object.values(value).forEach(freeze);
		Object.freeze(value);
	}
	return value;
}
