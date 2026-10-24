/**
 * The separable prefixes a VERB unit may carry: the particles that may be
 * one, and those offered for a unit. prefix-answer.ts reads jev's pick.
 */

import { particleForms } from "../../../segment/de/candidates.js";
import type { Target } from "../target.js";
import { fold, spellingOf } from "./shape.js";

/**
 * The separable prefixes a VERB unit may carry: those that open a particle
 * slot, and those that open none but stand for a particle verb's first part
 * often enough (daliegen, gutheißen, offenlegen, irreführen, volltanken,
 * großziehen). stand (standen) is not offered (#1057).
 */
export const prefixParticles: ReadonlySet<string> = new Set([
	...particleForms,
	"da",
	"dagegen",
	"flach",
	"groß",
	"gut",
	"irre",
	"leer",
	"offen",
	"voll",
]);
export const isParticle = (word: string) => prefixParticles.has(word);

/**
 * The separable prefixes a VERB unit could carry, longest first: each
 * particle member standing apart from the verb, the words a shortened one
 * stands for in its place (rein is herein or hinein, never a prefix of its
 * own: Rule de/r-adverb-is-her-or-hin-shorthand), and each particle a
 * member's word begins with. A member that is no particle, such as the
 * verb's own participle, is never offered whole.
 */
export function prefixCandidates(target: Target, skip: ReadonlySet<number>) {
	const found = new Set<string>();
	for (const member of target.members) {
		if (skip.has(member.position)) continue;
		const word = fold(spellingOf(member));
		if (
			target.members.length > 1 &&
			member.spelling?.orthography === "Shorthand"
		)
			for (const surface of member.spelling.surfaces)
				found.add(fold(surface));
		else if (
			target.members.length > 1 &&
			/^\p{L}+$/u.test(word) &&
			isParticle(word)
		)
			found.add(word);
		for (let length = word.length - 2; length >= 2; length--) {
			const prefix = word.slice(0, length);
			if (isParticle(prefix)) found.add(prefix);
		}
	}
	return [...found].sort((left, right) => right.length - left.length);
}
