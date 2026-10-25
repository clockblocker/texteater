import type { AttestationCheck } from "../attestation-checks.js";
import { attestationAdpositionCaseIssues } from "./check-adposition-cases.js";
import { germanArticleAgreementIssues } from "./check-article-agreement.js";
import { attestationExpletiveSpellingIssues } from "./check-expletive-spelling.js";
import { attestationParticleIssues } from "./check-particles.js";
import { attestationPluralOnlyIssues } from "./check-plural-only.js";
import { attestationReflexiveSpellingIssues } from "./check-reflexive-spelling.js";

/** The German Attestation checks, in the order a record reports them. */
export const germanAttestationChecks: readonly AttestationCheck<"de">[] = [
	{ check: "AdpositionCase", issues: attestationAdpositionCaseIssues },
	{ check: "ArticleAgreement", issues: germanArticleAgreementIssues },
	{ check: "ExpletiveSpelling", issues: attestationExpletiveSpellingIssues },
	{ check: "ReflexiveSpelling", issues: attestationReflexiveSpellingIssues },
	{ check: "ClosedPart", issues: attestationParticleIssues },
	{ check: "PluralOnly", issues: attestationPluralOnlyIssues },
];
