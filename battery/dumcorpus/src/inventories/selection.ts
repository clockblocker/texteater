import { sameValue, sameValueKey } from "../same-value.js";
import type { AuthoredMember } from "./member.js";
import { authoredMembers, inventoryOf } from "./registry.js";

type MemberIndex = ReadonlyMap<string, readonly AuthoredMember[]>;

/** The authored members keyed by `sameValueKey` of one of their parts, each bucket in registry order. */
function indexBy(part: (member: AuthoredMember) => unknown): MemberIndex {
	const index = new Map<string, AuthoredMember[]>();
	for (const member of authoredMembers) {
		const key = sameValueKey(part(member));
		if (key === undefined)
			throw new Error("An authored member is not a JSON value.");
		const bucket = index.get(key);
		if (bucket) bucket.push(member);
		else index.set(key, [member]);
	}
	return index;
}

/**
 * The authored members that may be `sameValue`-equal to a value of this
 * part, in registry order: its key's bucket in an index built on first use,
 * or every member when the key can't spell the value. Equal values share a
 * key, so a caller that confirms each candidate with `sameValue` gets what a
 * scan of every member would.
 */
function candidatesBy(
	part: (member: AuthoredMember) => unknown,
): (value: unknown) => readonly AuthoredMember[] {
	let index: MemberIndex | undefined;
	return (value) => {
		const key = sameValueKey(value);
		if (key === undefined) return authoredMembers;
		index ??= indexBy(part);
		return index.get(key) ?? [];
	};
}

const lemmaCandidates = candidatesBy(({ lemma }) => lemma);
const readingCandidates = candidatesBy(({ reading }) => reading);

/**
 * The authored member whose Reading is exactly this one, with its reviewed
 * Knowledge. tf-demo's dictionary transaction attaches that Knowledge to an
 * authored Reading it stores (system ADR 0021).
 */
export function authoredReading(reading: unknown): AuthoredMember | undefined {
	return readingCandidates(reading).find((member) =>
		sameValue(member.reading, reading),
	);
}

/**
 * The authored members whose Lemma is exactly this one, one per Reading:
 * `es` has a referential and a nonreferential one. None on a Closed Route is
 * a Catalog Miss (system ADR 0021). A classifier's Syncretism view has no
 * units, so it never matches here; `syncretismFor` finds its member.
 */
export function authoredFor(lemma: unknown): readonly AuthoredMember[] {
	return lemmaCandidates(lemma).filter((member) =>
		sameValue(member.lemma, lemma),
	);
}

/** The authored article cell whose Reading is exactly this one, with its reviewed Knowledge. */
export function selectAuthoredArticle(reading: unknown): AuthoredMember | null {
	return (
		readingCandidates(reading).find(
			(member) =>
				member.lemma.kind === "DET" &&
				"pronType" in member.lemma.coreFeatures &&
				member.lemma.coreFeatures.pronType === "Art" &&
				sameValue(member.reading, reading),
		) ?? null
	);
}

/**
 * Whether a route resolves only to authored members, as its language's
 * Authored Inventory decides. A Lemma there that no member matches is a
 * Catalog Miss, never Open production (system ADR 0021). A language with no
 * inventory has no Closed Route.
 */
export function closedRoute(route: {
	readonly language: string;
	readonly family: string;
	readonly kind: string;
}): boolean {
	return inventoryOf(route.language)?.closedRoute(route) ?? false;
}
