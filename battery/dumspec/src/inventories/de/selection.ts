import { sameValue } from "../../same-value.js";
import { authoredMembers } from "./inventory.js";
import type { AuthoredMember } from "./member.js";

/**
 * The authored member whose Reading is exactly this one, with its reviewed
 * Knowledge. tf-demo's dictionary transaction attaches that Knowledge to an
 * authored Reading it stores (system ADR 0021).
 */
export function authoredReading(reading: unknown): AuthoredMember | undefined {
	return authoredMembers.find((member) => sameValue(member.reading, reading));
}

/**
 * The authored members whose Lemma is exactly this one, one per Reading:
 * `es` has a referential and a nonreferential one. None on a Closed Route is
 * a Catalog Miss (system ADR 0021). A classifier's Syncretism view has no
 * units, so it never matches here; `syncretismFor` finds its member.
 */
export function authoredFor(lemma: unknown): readonly AuthoredMember[] {
	return authoredMembers.filter((member) => sameValue(member.lemma, lemma));
}

/** The authored article cell whose Reading is exactly this one, with its reviewed Knowledge. */
export function selectAuthoredArticle(reading: unknown): AuthoredMember | null {
	return (
		authoredMembers.find(
			(member) =>
				member.lemma.kind === "DET" &&
				"pronType" in member.lemma.coreFeatures &&
				member.lemma.coreFeatures.pronType === "Art" &&
				sameValue(member.reading, reading),
		) ?? null
	);
}

/**
 * Whether a route resolves only to authored members: a German Lexeme AUX,
 * DET or PRON. Its identity is chosen among the authored candidates its
 * spelling realizes (Dumgen ADR 0007), so a Lemma there that no member
 * matches is a Catalog Miss, never Open production (system ADR 0021).
 */
export function closedRoute(route: {
	readonly language: string;
	readonly family: string;
	readonly kind: string;
}): boolean {
	return (
		route.language === "de" &&
		route.family === "Lexeme" &&
		(route.kind === "AUX" || route.kind === "DET" || route.kind === "PRON")
	);
}
