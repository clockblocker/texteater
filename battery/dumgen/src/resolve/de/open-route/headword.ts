/**
 * An open-route click's Canonical Form, as code derives it over the
 * headword written for it.
 */

import type * as Dumling from "dumling/types";
import { withoutReflexive } from "../../../segment/de/candidates.js";
import type { Judged, Written } from "../canonical-form.js";
import { guardedHeadword } from "../headword-guards.js";
import { fixedSpelling, type Target } from "../target.js";
import { adverbialHeadword } from "./adverbial.js";
import type { Headword } from "./attestation.js";
import type { FirstRead } from "./first-request.js";
import { digitsHeadword, numeralLocutionHeadword } from "./numeral.js";
import { authoredParticle } from "./particle.js";
import type { Shape } from "./shape.js";
import { verbHeadword } from "./verbal.js";

/**
 * The headword: Luna's Canonical Form and members' words, over which each
 * route shape's step writes what the Rules settle, in this order: a VERB
 * Lexeme's prefix, a PART's authored Lemma, a numeral Locution's members
 * or a Locution's guarded headword, a NUM's digits, an ADV's or ADJ's. No
 * verbal headword keeps a lexical reflexive (ADR 0052). A PART no authored
 * Lemma names is a Catalog Miss.
 */
export function canonicalFormOf(
	target: Target,
	shape: Shape,
	first: FirstRead,
	cells: Dumling.Lemma<"de">["coreFeatures"],
	written: Written | undefined,
	judged: Judged,
): Headword | { readonly _tag: "CatalogMiss"; readonly message: string } {
	let core = cells;
	let canonicalForm =
		written && first.block === "verbal"
			? shape.lexeme
				? verbHeadword(written.canonicalForm, first.core)
				: withoutReflexive(written.canonicalForm)
			: written?.canonicalForm;
	const normalized = [
		...(written?.members ??
			target.members.map(
				(member) =>
					fixedSpelling(member, first.readings) ?? member.text,
			)),
	];
	if (target.route.kind === "PART") {
		const authored = authoredParticle(target, written);
		if ("_tag" in authored) return authored;
		core = { ...authored.lemma.coreFeatures };
		canonicalForm = authored.lemma.canonicalForm;
		if (!written) normalized[0] = authored.lemma.canonicalForm;
	}
	const { outsideHeadword } = judged;
	if (canonicalForm !== undefined)
		canonicalForm =
			numeralLocutionHeadword(
				target,
				canonicalForm,
				normalized,
				outsideHeadword,
			) ??
			guardedHeadword(
				target,
				canonicalForm,
				new Set([...outsideHeadword, ...(judged.auxiliaries ?? [])]),
			);
	canonicalForm = digitsHeadword(target) ?? canonicalForm;
	if (first.block === "adverbial") {
		const derived = adverbialHeadword(
			target,
			shape,
			first.orthographies,
			first.inflection?.degree,
			canonicalForm,
			normalized,
		);
		canonicalForm = derived.canonicalForm;
		for (const [position, word] of derived.members)
			normalized[position] = word;
	}
	if (canonicalForm === undefined)
		throw Error("No Canonical Form was written");
	return { canonicalForm, core, normalized };
}
