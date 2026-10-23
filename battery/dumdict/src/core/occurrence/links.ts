import { lemmaIdentityKey, readingIdentityKey, sameReading } from "dumling";
import type * as Dumling from "dumling/types";

import type { AttestationLink } from "../../domain-types";

type LinkLike = {
	readonly ref: string;
	readonly surfaceId: string;
	readonly reading: Dumling.Reading;
};

/** The Lemma identity key a Surface ID names, or undefined for a malformed one. */
function surfaceIdOwnerKey(surfaceId: string): string | undefined {
	try {
		const parsed: unknown = JSON.parse(surfaceId);
		return typeof parsed === "object" &&
			parsed !== null &&
			"lemma" in parsed &&
			typeof parsed.lemma === "string"
			? parsed.lemma
			: undefined;
	} catch {
		return undefined;
	}
}

/** A link's Surface belongs to its Reading's Lemma. */
export function linkNamesOwnSurface(link: LinkLike): boolean {
	return (
		surfaceIdOwnerKey(link.surfaceId) ===
		lemmaIdentityKey(link.reading.lemma)
	);
}

/** Every link of a Reading Entry names that Reading, and each ref once. */
export function entryLinksAreItsOwn(entry: {
	readonly reading: Dumling.Reading;
	readonly attestationLinks: readonly LinkLike[];
}): boolean {
	const refs = entry.attestationLinks.map(({ ref }) => ref);
	return (
		new Set(refs).size === refs.length &&
		entry.attestationLinks.every((link) =>
			sameReading(link.reading, entry.reading),
		)
	);
}

export function sameAttestationLink(left: LinkLike, right: LinkLike): boolean {
	return (
		left.ref === right.ref &&
		left.surfaceId === right.surfaceId &&
		sameReading(left.reading, right.reading)
	);
}

function compare(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Orders the links of one ref: the code-unit-smaller `readingIdentityKey`
 * first, then the smaller Surface ID.
 */
function compareLinks(left: LinkLike, right: LinkLike): number {
	return (
		compare(
			readingIdentityKey(left.reading),
			readingIdentityKey(right.reading),
		) || compare(left.surfaceId, right.surfaceId)
	);
}

/**
 * Merges Attestation Links as a set by ref, as concurrent writers' copies
 * of one dictionary merge (system ADR 0049). Equal links are one. Of the
 * different links one ref has, the one with the code-unit-smaller
 * `readingIdentityKey` is `kept`, then the one with the smaller Surface ID,
 * and every other is `dropped`, for the host to report. Both lists are in
 * code-unit order of their refs, so the answer never depends on input
 * order.
 */
export function reconcileAttestationLinks<L extends Dumling.Language>(
	links: readonly AttestationLink<L>[],
): {
	readonly kept: AttestationLink<L>[];
	readonly dropped: AttestationLink<L>[];
} {
	const byRef = new Map<string, AttestationLink<L>[]>();
	for (const link of links) {
		const group = byRef.get(link.ref) ?? [];
		if (!group.some((stored) => sameAttestationLink(stored, link)))
			group.push(structuredClone(link));
		byRef.set(link.ref, group);
	}
	const kept: AttestationLink<L>[] = [];
	const dropped: AttestationLink<L>[] = [];
	for (const ref of [...byRef.keys()].sort(compare)) {
		const [winner, ...others] = (byRef.get(ref) ?? []).sort(compareLinks);
		if (winner) kept.push(winner);
		dropped.push(...others);
	}
	return { kept, dropped };
}
