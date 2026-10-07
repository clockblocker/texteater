/** The members a head may govern as its preposition, with the cases each may take. */

import {
	germanAdpositionAllowedCases,
	germanAdpositionEntry,
} from "dumcorpus/inventories";
import type { Member, Target } from "../target.js";
import { type AdpCase, fold, spellingOf } from "./shape.js";

/** A member that may be the preposition its head governs, with the cases the ADP Case Table lets it take. */
export type Governable = {
	readonly member: Member;
	readonly preposition: string;
	readonly cases: readonly AdpCase[];
};

export function governableMembers(
	target: Target,
	skip: ReadonlySet<number>,
): readonly Governable[] {
	if (target.members.length < 2) return [];
	return target.members.flatMap((member) => {
		const whole =
			member.spelling?.orthography === "Fused" &&
			member.spelling.written !== undefined;
		if (skip.has(member.position) || whole) return [];
		const preposition = fold(spellingOf(member));
		const entry = germanAdpositionEntry({
			family: "Lexeme",
			canonicalForm: preposition,
		});
		return entry
			? [
					{
						member,
						preposition,
						cases: germanAdpositionAllowedCases(entry),
					},
				]
			: [];
	});
}

/** Coordinating conjunctions, which never open a preposition's complement. */
export const coordinators = new Set([
	"und",
	"oder",
	"aber",
	"sondern",
	"denn",
	"sowie",
]);
