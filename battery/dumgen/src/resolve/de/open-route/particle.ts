/**
 * A PART's headword: an authored PART Lemma (#734), named by its member's
 * spelling or, when the member is no Standard spelling, by the headword
 * Luna wrote.
 */

import { type AuthoredMember, germanParticles } from "dumcorpus/inventories";
import { lemmaIdentityKey } from "dumling";
import type { Written } from "../canonical-form.js";
import type { Target } from "../target.js";
import { fold, spellingOf } from "./shape.js";

/**
 * The authored PART Lemmas whose Canonical Form is `form`, compared
 * without case; a Lemma's several Readings count once.
 */
export const particlesSpelled = (form: string) => [
	...new Map(
		germanParticles
			.filter((member) => fold(member.lemma.canonicalForm) === fold(form))
			.map((member) => [lemmaIdentityKey(member.lemma), member]),
	).values(),
];

/**
 * The one authored PART the headword Luna wrote names, or the unit's
 * first member when Luna wrote none; a Catalog Miss when none or several
 * share that spelling.
 */
export function authoredParticle(
	target: Target,
	written: Written | undefined,
): AuthoredMember | { readonly _tag: "CatalogMiss"; readonly message: string } {
	const [opening] = target.members;
	const spelled = written?.canonicalForm ?? (opening && spellingOf(opening));
	const [authored, ...others] =
		spelled === undefined ? [] : particlesSpelled(spelled);
	if (!authored || others.length > 0)
		return {
			_tag: "CatalogMiss",
			message: authored
				? "Several authored particles share this spelling"
				: "No authored particle has this spelling",
		};
	return authored;
}
