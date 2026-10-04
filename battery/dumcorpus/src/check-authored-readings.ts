import { lemmaIdentityKey, readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import type { AuthoredMember } from "./inventories/member.js";
import { authoredMembers } from "./inventories/registry.js";

/** A Reading the Authored Inventory does not hold, at a path inside the checked Reading. */
export type AuthoredReadingIssue = {
	readonly path: string;
	readonly message: string;
};

let byLemma: ReadonlyMap<string, readonly AuthoredMember[]> | undefined;

/** The authored members of one Lemma, by its identity (ADR 0002). */
function authoredMembersOf(lemma: Dumling.Lemma): readonly AuthoredMember[] {
	if (!byLemma) {
		const index = new Map<string, AuthoredMember[]>();
		for (const member of authoredMembers) {
			const key = lemmaIdentityKey(member.lemma);
			index.set(key, [...(index.get(key) ?? []), member]);
		}
		byLemma = index;
	}
	return byLemma.get(lemmaIdentityKey(lemma)) ?? [];
}

/**
 * Whether the Authored Inventory holds this Reading, by its identity (ADR
 * 0031): its reviewed Knowledge lives there (ADR 0021).
 */
export function isAuthoredReading(reading: Dumling.Reading): boolean {
	if (!("emojiDescription" in reading)) return false;
	const key = readingIdentityKey(reading);
	return authoredMembersOf(reading.lemma).some(
		(member) => readingIdentityKey(member.reading) === key,
	);
}

/**
 * An authored Lemma's Readings are its authored members (ADR 0021), so a
 * Reading of an authored Lemma must name one of them by its Emoji
 * Description (ADR 0031). The members include the generated Syncretisms,
 * and a Syncretism's view has its identity (ADR 0046), so a Reading of
 * either is held to the Syncretism's member. A Reading of a Lemma no member
 * is passes.
 */
export function authoredReadingIssues(
	reading: Dumling.Reading,
): AuthoredReadingIssue[] {
	if (!("emojiDescription" in reading)) return [];
	const authored = authoredMembersOf(reading.lemma);
	const key = readingIdentityKey(reading);
	if (
		authored.length === 0 ||
		authored.some((member) => readingIdentityKey(member.reading) === key)
	)
		return [];
	const { lemma } = reading;
	return [
		{
			path: "reading.emojiDescription",
			message: `${lemma.family} ${lemma.kind} ${lemma.canonicalForm} is authored with the Readings ${authored
				.map((member) => member.reading.emojiDescription)
				.join(
					" ",
				)}; name one of them, not ${reading.emojiDescription} (ADR 0021)`,
		},
	];
}
