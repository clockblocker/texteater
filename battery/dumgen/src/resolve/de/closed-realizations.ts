/**
 * Which authored realizations a closed-class unit's spelling matches
 * (`closed-class.ts`): a one-piece unit's through its stored identity,
 * exactly, without case or as a one-edit Typo, and a multi-piece unit's
 * through its members' joined words.
 */

import {
	type AuthoredMember,
	type AuthoredRealization,
	authoredRealizations,
} from "dumcorpus/inventories";
import { foldCase, isSyncreticUnit } from "dumling";
import type * as Dumling from "dumling/types";
import type { ClosedClassIdentity } from "../../segment/segmented-sentence.js";
import type { Member, Target } from "./target.js";

/** A DET or PRON Lexeme's Core Features; a Locution sets none. */
type Core = Partial<
	Dumling.Lemma<"de", "Lexeme", "DET" | "PRON">["coreFeatures"]
>;

/**
 * An authored realization a member's spelling matched. A near-miss spelling
 * comes back marked Typo (Rule de/member-orthography), which dumcorpus,
 * authoring no typos, never writes.
 */
export type MatchedRealization = Omit<AuthoredRealization, "orthography"> & {
	readonly orthography?: AuthoredRealization["orthography"] | "Typo";
};

/** A closed member's Core Features; a Locution, or a member of another route, sets none. */
export function coreOf({ lemma }: AuthoredMember): Core {
	return lemma.family === "Lexeme" &&
		(lemma.kind === "DET" || lemma.kind === "PRON")
		? lemma.coreFeatures
		: {};
}

/** Whether an authored member has the stored identity, its Canonical Form compared without case. */
function hasIdentity(member: AuthoredMember, identity: ClosedClassIdentity) {
	const core = coreOf(member);
	return (
		member.lemma.family === "Lexeme" &&
		member.lemma.kind === identity.kind &&
		foldCase(member.lemma.canonicalForm, "de") ===
			foldCase(identity.canonicalForm, "de") &&
		(core.pronType ?? null) === identity.pronType &&
		(core.poss === "Yes") === (identity.poss === "Yes")
	);
}

/**
 * The authored realizations of the identity whose spelling is the
 * member's. An exact spelling decides, since a capital inside the Sentence
 * says something (formal Sie); at the Sentence's start, or when nothing
 * matches exactly, spellings are compared without case.
 */
export function matchingRealizations(
	identity: ClosedClassIdentity,
	member: Member,
	opensSentence: boolean,
): readonly MatchedRealization[] {
	const ofIdentity = authoredRealizations.filter(
		(realization) =>
			!isSyncreticUnit(realization.member.lemma) &&
			hasIdentity(realization.member, identity),
	);
	// A clitic's apostrophe is no part of its authored spelling: 's is s.
	const texts = new Set([member.text, member.text.replace(/^['’]/u, "")]);
	const foldedTexts = new Set([...texts].map((text) => foldCase(text, "de")));
	const exact = ofIdentity.filter(({ spelled }) => texts.has(spelled));
	const folded = ofIdentity.filter(({ spelled }) =>
		foldedTexts.has(foldCase(spelled, "de")),
	);
	if (exact.length === 0 && folded.length === 0)
		return typoRealizations(ofIdentity, foldCase(member.text, "de"));
	if (exact.length === 0) return folded;
	return opensSentence ? folded : exact;
}

/** Edit distance with adjacent transpositions (ihc is one edit from ich). */
function editDistance(left: string, right: string): number {
	// The rows for left's prefixes one and two letters shorter.
	let twoAgo: readonly number[] = [];
	let above: readonly number[] = Array.from(
		{ length: right.length + 1 },
		(_, j) => j,
	);
	for (let i = 1; i <= left.length; i++) {
		const row = [i];
		for (let j = 1; j <= right.length; j++) {
			const cost = left[i - 1] === right[j - 1] ? 0 : 1;
			const edited = Math.min(
				(above[j] ?? 0) + 1,
				(row[j - 1] ?? 0) + 1,
				(above[j - 1] ?? 0) + cost,
			);
			const transposed =
				i > 1 &&
				j > 1 &&
				left[i - 1] === right[j - 2] &&
				left[i - 2] === right[j - 1];
			row.push(
				transposed
					? Math.min(edited, (twoAgo[j - 2] ?? 0) + 1)
					: edited,
			);
		}
		twoAgo = above;
		above = row;
	}
	return above[right.length] ?? 0;
}

/**
 * A member no spelling of its stored identity matches, one edit from
 * exactly one of them (disem for diesem, ihc for ich), is a Typo of that
 * spelling (Rule de/member-orthography); its realizations come back marked
 * so the member is attested as Typo.
 */
function typoRealizations(
	ofIdentity: readonly AuthoredRealization[],
	text: string,
): readonly MatchedRealization[] {
	if (text.length < 3) return [];
	const near = ofIdentity.filter(
		({ spelled }) => editDistance(foldCase(spelled, "de"), text) === 1,
	);
	const spellings = new Set(
		near.map(({ spelled }) => foldCase(spelled, "de")),
	);
	if (spellings.size !== 1) return [];
	return near.map(
		(realization): MatchedRealization => ({
			...realization,
			orthography: "Typo",
		}),
	);
}

/**
 * The authored realizations of a multi-piece DET or PRON unit's route
 * whose spelling is its members' words joined (ein wenig, was für):
 * such a unit carries no identity, and its joined spelling names it.
 */
export function joinedRealizations(
	target: Target,
	joined: string,
): readonly AuthoredRealization[] {
	const { family, kind } = target.route;
	return authoredRealizations.filter(
		(realization) =>
			!isSyncreticUnit(realization.member.lemma) &&
			realization.member.lemma.family === family &&
			realization.member.lemma.kind === kind &&
			foldCase(realization.spelled, "de") === foldCase(joined, "de"),
	);
}
