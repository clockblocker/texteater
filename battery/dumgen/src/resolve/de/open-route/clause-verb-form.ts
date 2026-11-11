/**
 * The forms a VERB unit can take by its clause (#1339, #1342). German
 * spells the infinitive like the 1st and 3rd person plural present
 * (warten), so the word cannot tell them apart, but its clause often can:
 * zu right before the verb governs an infinitive (zu warten), and a clause
 * has one finite verb, so beside the finite form of a verb that governs a
 * bare infinitive in another unit of the same clause (mussten … warten,
 * lässt sie warten, geht einkaufen) a unit ending in -n is no finite verb:
 * an infinitive, or a participle (kann … abgenommen und … bewegt werden,
 * geht verloren), which jev tells apart.
 *
 * The governors are the modals (`closedVerbForms`) and the open verbs
 * dumcorpus lists as `germanBareInfinitiveGovernors` (lassen, gehen,
 * bleiben, lernen, sehen, hören, helfen). A form spelled like its own
 * infinitive (müssen, lassen) settles nothing, and neither does a clause
 * without a governor: there jev decides among all three. An open
 * governor's form counts only in a VERB unit, since such a verb also
 * stands alone and some of its forms are other words too (die Bleibe).
 *
 * The clause runs from the unit to the nearest punctuation mark, comma
 * included, or SCONJ or CCONJ unit on each side, so a verb of a second
 * coordinated clause (Er geht und sie warten) is never beside the first
 * clause's governor. A word spelled like a conjunction in no such unit
 * bounds nothing: und joining two nouns (Kinder und Kindeskinder) and the
 * particle denn (Kann er denn sterben?) stay inside the clause.
 */

import {
	closedVerbForms,
	germanBareInfinitiveGovernors,
	modalVerbs,
} from "dumcorpus/inventories";
import type { Unit } from "../../../segment/segmented-sentence.js";
import type { Target } from "../target.js";
import { fold, spellingOf } from "./shape.js";

/** A verb's finite forms: none spelled like its infinitive, no participle (gekonnt). */
const finiteFormsOf = (infinitive: string, forms: readonly string[]) =>
	forms
		.filter((form) => form !== infinitive && !form.startsWith("ge"))
		.map(fold);

/** Every modal's finite forms, which count wherever they stand. */
const finiteModalForms: ReadonlySet<string> = new Set(
	modalVerbs.flatMap((modal) =>
		finiteFormsOf(modal, closedVerbForms[modal] ?? []),
	),
);

/** The open governors' finite forms, which count in a VERB unit. */
const finiteOpenGovernorForms: ReadonlySet<string> = new Set(
	Object.entries(germanBareInfinitiveGovernors).flatMap(
		([infinitive, forms]) =>
			forms.filter((form) => form !== infinitive).map(fold),
	),
);

/** The finite forms of the closed verbs: a unit holding one is finite of its own. */
const finiteClosedForms: ReadonlySet<string> = new Set(
	Object.entries(closedVerbForms).flatMap(([lemma, forms]) =>
		finiteFormsOf(lemma, forms).filter((form) => form !== "worden"),
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

/** Whether the Segment at `index` is a governor's finite form. */
function governs(target: Target, index: number): boolean {
	const segment = target.segments[index];
	if (!segment) return false;
	// A fused piece is the word its Segment stands for (Kanns of Kannste).
	const form = fold(segment.surface ?? segment.text);
	if (finiteModalForms.has(form)) return true;
	if (!finiteOpenGovernorForms.has(form)) return false;
	const unit = unitAt(target.units, index);
	return (
		unit !== undefined &&
		unit.route !== "Unresolved" &&
		unit.route.kind === "VERB"
	);
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

export type VerbForm = "Fin" | "Inf" | "Part";

const anyForm: readonly VerbForm[] = ["Fin", "Inf", "Part"];

/** The forms the VERB unit can take by its clause, as the module says. */
export function clauseVerbForms(target: Target): readonly VerbForm[] {
	const last = target.members.at(-1);
	if (!last || !fold(last.text).endsWith("n")) return anyForm;
	if (
		target.members.some((member) =>
			finiteClosedForms.has(fold(spellingOf(member))),
		)
	)
		return anyForm;
	if (wordBefore(target, last.segment) === "zu") return ["Inf"];
	const besideGovernor = clauseSegments(target).some((index) =>
		governs(target, index),
	);
	return besideGovernor ? ["Inf", "Part"] : anyForm;
}
