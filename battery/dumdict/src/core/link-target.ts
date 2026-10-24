import {
	canonicalFormKey,
	lemmaIdentityKey,
	readingIdentityKey,
} from "dumling";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

import type { PendingSemanticRelationRecord } from "../domain-types";
import type { SurfaceId } from "../dumling-id";
import { shadowMatchesLemma } from "./identity";

/**
 * Where a host's link goes (system ADR 0011). A host maps each variant to a
 * place of its own: a Spelling Crossroad, a Lemma, a Reading, or one met
 * Surface of a Lemma.
 *
 * - `Spelling` names a Spelling Crossroad (Dumling glossary) by its language
 *   and `canonicalFormKey`, so per-language case folding stays in Dumling.
 * - `Lemma` and `Reading` carry Dumling values, compared by their identity
 *   keys; Dumdict has no Lemma or Reading IDs.
 * - `Surface` names one met Surface of one Lemma by its {@link SurfaceId}.
 */
export type LinkTarget<L extends Dumling.Language = Dumling.Language> =
	| SpellingLinkTarget<L>
	| LemmaLinkTarget<L>
	| { kind: "Reading"; reading: Dumling.Reading<L> }
	| { kind: "Surface"; surfaceId: SurfaceId<L> };

/** A Spelling Crossroad: every Lemma and met Surface with one key. */
export type SpellingLinkTarget<L extends Dumling.Language = Dumling.Language> =
	{ kind: "Spelling"; language: L; key: string };

export type LemmaLinkTarget<L extends Dumling.Language = Dumling.Language> = {
	kind: "Lemma";
	lemma: Dumling.Lemma<L>;
};

/** The Spelling Crossroad a form belongs to in its language. */
export function spellingTarget<L extends Dumling.Language>(
	language: L,
	form: string,
): SpellingLinkTarget<L> {
	return {
		kind: "Spelling",
		language,
		key: canonicalFormKey(form, language),
	};
}

/**
 * Where a link whose exact sense is unknown goes: the one Lemma among
 * `lemmas` that the Unit Shadow matches (`shadowMatchesLemma`), or else the
 * Shadow's Spelling Crossroad, whether no Lemma matches or several do. It
 * never returns a Reading or a Surface.
 *
 * Uniqueness is judged on whatever the Shadow carries, in every language,
 * Family and Kind. Lemmas count once by identity, and Lemmas the Shadow does
 * not match are ignored, so the result is total, deterministic and
 * independent of order.
 */
export function resolveShadow<L extends Dumling.Language>(
	shadow: Dumrel.UnitShadow & { language: L },
	lemmas: Iterable<Dumling.Lemma<L>>,
): SpellingLinkTarget<L> | LemmaLinkTarget<L> {
	const matches = new Map<string, Dumling.Lemma<L>>();
	for (const lemma of lemmas)
		if (shadowMatchesLemma(shadow, lemma))
			matches.set(lemmaIdentityKey(lemma), lemma);
	const [only, ...others] = matches.values();
	return only && others.length === 0
		? { kind: "Lemma", lemma: only }
		: spellingTarget(shadow.language, shadow.canonicalForm);
}

/** One string per Link Target: equal targets have equal keys. */
export function linkTargetKey(target: LinkTarget): string {
	switch (target.kind) {
		case "Spelling":
			return JSON.stringify(["Spelling", target.language, target.key]);
		case "Lemma":
			return JSON.stringify(["Lemma", lemmaIdentityKey(target.lemma)]);
		case "Reading":
			return JSON.stringify([
				"Reading",
				readingIdentityKey(target.reading),
			]);
		case "Surface":
			return JSON.stringify(["Surface", target.surfaceId]);
	}
}

/**
 * Where a stored Shadow relation's link goes now: the Lemma its record
 * resolved to, or else its Shadow's Spelling Crossroad. Hosts render this
 * resolution, which Dumdict keeps current as Lemmas change.
 */
export function pendingRelationTarget<L extends Dumling.Language>(
	record: PendingSemanticRelationRecord<L>,
): SpellingLinkTarget<L> | LemmaLinkTarget<L> {
	return record.resolvedLemma
		? { kind: "Lemma", lemma: record.resolvedLemma }
		: spellingTarget(
				record.pending.target.language,
				record.pending.target.canonicalForm,
			);
}
