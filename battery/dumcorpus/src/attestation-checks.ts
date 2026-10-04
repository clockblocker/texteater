import type * as Dumling from "dumling/types";
import { germanAttestationChecks } from "./de/attestation-checks.js";
import { englishAttestationChecks } from "./en/attestation-checks.js";
import type { SpecCheck } from "./issues.js";

/** An issue a language's Attestation check finds, at a path inside the Attestation. */
type LocatedIssue = { readonly path: string; readonly message: string };

/**
 * One check a language runs on an Attestation Dumling accepts, reporting
 * under `check`: a fact about the language that Dumling's schemas leave to
 * dumcorpus (ADR 0041).
 */
export type AttestationCheck<L extends Dumling.Language> = {
	readonly check: SpecCheck;
	readonly issues: (
		attestation: Dumling.Attestation<L>,
	) => readonly LocatedIssue[];
};

/** Each language's Attestation checks, in the order a record reports them. */
const attestationChecks: {
	readonly [L in Dumling.Language]: readonly AttestationCheck<L>[];
} = { de: germanAttestationChecks, en: englishAttestationChecks, he: [] };

/** What the Attestation's language checks find, each under its check. */
export function languageAttestationIssues(
	attestation: Dumling.Attestation,
): (LocatedIssue & { readonly check: SpecCheck })[] {
	const checks = attestationChecks[
		attestation.surface.language
	] as readonly AttestationCheck<Dumling.Language>[];
	return checks.flatMap(({ check, issues }) =>
		issues(attestation).map((found) => ({ check, ...found })),
	);
}
