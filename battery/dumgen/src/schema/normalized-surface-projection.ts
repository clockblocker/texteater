import { z } from "zod";

export const normalizedMemberSchema = z.string().min(1).regex(/^\S+$/u, {
	message: "A normalized member must contain no whitespace.",
});

export const normalizedMembersSchema = z.array(normalizedMemberSchema).min(1);

export type MemberOrthography = "Standard" | "Typo";

export class NormalizedSurfaceProjectionError extends Error {
	override readonly name = "NormalizedSurfaceProjectionError";
}

/**
 * Validates a grammar projection member-by-member and constructs Dumling's
 * canonical scalar Surface spelling. Array position is the alignment key;
 * repeated equal strings therefore remain distinct occurrences.
 */
export function constructNormalizedSurface(args: {
	readonly attestedMembers: readonly string[];
	readonly normalizedMembers: readonly string[];
	readonly memberOrthographies: readonly MemberOrthography[];
}): string {
	const { attestedMembers, normalizedMembers, memberOrthographies } = args;
	if (
		attestedMembers.length === 0 ||
		normalizedMembers.length !== attestedMembers.length ||
		memberOrthographies.length !== attestedMembers.length
	) {
		throw new NormalizedSurfaceProjectionError(
			"Attested, normalized, and orthography members must align one-to-one.",
		);
	}

	for (let position = 0; position < attestedMembers.length; position += 1) {
		const attested = attestedMembers[position];
		const normalized = normalizedMembers[position];
		const orthography = memberOrthographies[position];
		if (
			attested === undefined ||
			normalized === undefined ||
			orthography === undefined ||
			!normalizedMemberSchema.safeParse(normalized).success
		) {
			throw new NormalizedSurfaceProjectionError(
				`Normalized member ${position} contains whitespace.`,
			);
		}
		if (!isLicensedNormalization(attested, normalized, orthography)) {
			throw new NormalizedSurfaceProjectionError(
				`Normalized member ${position} is not a positional normalization of its attested member.`,
			);
		}
	}

	return normalizedMembers.join(" ");
}

export function extractMarkedContextMembers(
	markedContext: string,
): readonly string[] {
	const openingCount = markedContext.match(/<TARGET>/gu)?.length ?? 0;
	const closingCount = markedContext.match(/<\/TARGET>/gu)?.length ?? 0;
	const members = [
		...markedContext.matchAll(/<TARGET>([^<>]*)<\/TARGET>/gu),
	].map((match) => decodeOwnedMarkedContextEntities(match[1] ?? ""));
	if (
		openingCount === 0 ||
		openingCount !== closingCount ||
		members.length !== openingCount
	) {
		throw new NormalizedSurfaceProjectionError(
			"Marked context must contain balanced, non-nested TARGET members.",
		);
	}
	return Object.freeze(members);
}

function decodeOwnedMarkedContextEntities(member: string): string {
	return member
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&amp;", "&");
}

function isLicensedNormalization(
	attested: string,
	normalized: string,
	orthography: MemberOrthography,
): boolean {
	if (attested === normalized) return true;

	const foldedAttested = foldMember(attested);
	const foldedNormalized = foldMember(normalized);
	if (foldedAttested === foldedNormalized) {
		return true;
	}
	if (orthography !== "Typo") return false;

	// Typo repair is a linguistic judgment made by the route prompt. Do not add
	// an edit-distance policy here: it would reject licensed Unicode spellings
	// and repairs that are not mechanically character-local.
	return true;
}

function foldMember(member: string): string {
	return member.normalize("NFC").toLocaleLowerCase("de");
}
