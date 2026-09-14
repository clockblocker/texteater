import type * as Dumrel from "dumrel/types";
import { Mark } from "lego";

const RELATION_MARKS: Record<Dumrel.SemanticRelation, string> = {
	synonym: "=",
	nearSynonym: "≈",
	antonym: "≠",
	nearAntonym: "≉",
	hypernym: "↑",
	hyponym: "↓",
	holonym: "⊂",
	meronym: "⊃",
};

/** The glyph a Reading Note uses for one semantic relation. */
export function RelationMark({ relation }: { relation: string }) {
	const mark = Object.hasOwn(RELATION_MARKS, relation)
		? RELATION_MARKS[relation as Dumrel.SemanticRelation]
		: relation;
	return (
		<Mark role="img" aria-label={relation} title={relation}>
			{mark}
		</Mark>
	);
}
