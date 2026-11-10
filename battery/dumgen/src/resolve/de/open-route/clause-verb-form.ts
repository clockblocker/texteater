/**
 * Whether a VERB unit is an infinitive by its clause (#1339). German
 * spells the infinitive like the 1st and 3rd person plural present
 * (warten), so the word cannot tell them apart, but its clause often
 * can: zu right before the verb governs an infinitive (zu warten), and a
 * clause has one finite verb, so beside a modal's finite form in another
 * unit of the same clause (mussten … warten) a unit ending in -n like an
 * infinitive is one. A modal's form spelled like its own infinitive
 * (müssen, können) settles nothing, and neither does a clause without a
 * modal: there jev decides.
 *
 * The clause runs from the unit to the nearest punctuation mark, comma
 * included, or conjunction on each side.
 */

import { closedVerbForms, modalVerbs } from "dumcorpus/inventories";
import type { Unit } from "../../../segment/segmented-sentence.js";
import type { Target } from "../target.js";
import { fold } from "./shape.js";

/** Every modal's finite forms: none spelled like its infinitive, no participle (gekonnt). */
const finiteModalForms: ReadonlySet<string> = new Set(
	modalVerbs.flatMap((modal) =>
		(closedVerbForms[modal] ?? [])
			.filter((form) => form !== modal && !form.startsWith("ge"))
			.map(fold),
	),
);

/** The finite forms of the closed verbs: a unit holding one is finite of its own. */
const finiteClosedForms: ReadonlySet<string> = new Set(
	Object.entries(closedVerbForms).flatMap(([lemma, forms]) =>
		forms
			.filter((form) => form !== lemma && !form.startsWith("ge"))
			.filter((form) => form !== "worden")
			.map(fold),
	),
);

/** The routes of the units that bound a clause. */
const clauseBounds: ReadonlySet<string> = new Set(["SCONJ", "CCONJ"]);

const unitAt = (units: readonly Unit[], index: number) =>
	units.find(({ segments }) => segments.includes(index));

/**
 * The Segment indexes of the target's clause outside the target: from
 * its first member back and from its last member on, up to a punctuation
 * mark or a conjunction's unit, and the Segments between its members.
 */
function clauseSegments(target: Target): readonly number[] {
	const { segments, units, members } = target;
	const own = new Set(members.map(({ segment }) => segment));
	const first = members[0]?.segment ?? 0;
	const last = members.at(-1)?.segment ?? first;
	const found: number[] = [];
	const take = (index: number): boolean => {
		const segment = segments[index];
		if (!segment || segment.kind === "Punctuation") return false;
		if (segment.kind !== "ResolvableText" || own.has(index)) return true;
		const unit = unitAt(units, index);
		if (
			unit &&
			unit.route !== "Unresolved" &&
			clauseBounds.has(unit.route.kind)
		)
			return false;
		found.push(index);
		return true;
	};
	for (let index = first - 1; index >= 0 && take(index); index--);
	for (let index = first + 1; index < last; index++) take(index);
	for (let index = last + 1; index < segments.length && take(index); index++);
	return found;
}

/** The nearest Segment before `index` that is no whitespace. */
function wordBefore(target: Target, index: number): string | undefined {
	for (let at = index - 1; at >= 0; at--) {
		const segment = target.segments[at];
		if (!segment || segment.kind === "Punctuation") return undefined;
		if (segment.kind === "ResolvableText") return fold(segment.text);
	}
	return undefined;
}

/** Whether the VERB unit is an infinitive by its clause, as the module says. */
export function clauseInfinitive(target: Target): boolean {
	const last = target.members.at(-1);
	if (!last || !fold(last.text).endsWith("n")) return false;
	if (target.members.some(({ text }) => finiteClosedForms.has(fold(text))))
		return false;
	if (wordBefore(target, last.segment) === "zu") return true;
	return clauseSegments(target).some((index) => {
		const segment = target.segments[index];
		return (
			segment !== undefined && finiteModalForms.has(fold(segment.text))
		);
	});
}
