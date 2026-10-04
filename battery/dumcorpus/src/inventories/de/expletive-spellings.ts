/** A member as an Attestation records it, read for the word it spells. */
export type ExpletiveMember = {
	readonly attested: string;
	readonly orthography: string;
	readonly fusion?: { readonly components: readonly { surface: string }[] };
	readonly component?: number;
};

/** A clitic `es`: `geht's`, typographic `geht’s`, or `gehts` with no apostrophe. */
const cliticEsSpellings: ReadonlySet<string> = new Set(["'s", "’s", "s"]);

/**
 * Whether a member spells the subject expletive `es`: in full when Standard,
 * as a clitic when Fused (`'s` of `geht's`, realizing an `es` component) or
 * Shorthand (`'s` of `Wenn 's morgen regnet`), or anyhow when a Typo.
 * Capitals are allowed.
 */
export function spellsExpletiveEs(member: ExpletiveMember): boolean {
	const spelling = member.attested.toLocaleLowerCase("de");
	switch (member.orthography) {
		case "Typo":
			return true;
		case "Standard":
			return spelling === "es";
		case "Shorthand":
			return cliticEsSpellings.has(spelling);
		case "Fused":
			return (
				cliticEsSpellings.has(spelling) &&
				member.component !== undefined &&
				member.fusion?.components[member.component]?.surface === "es"
			);
		default:
			return false;
	}
}
