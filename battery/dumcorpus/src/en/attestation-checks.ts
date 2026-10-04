import type { AttestationCheck } from "../attestation-checks.js";
import { englishArticleAgreementIssues } from "./check-article-agreement.js";

/** The English Attestation checks, in the order a record reports them. */
export const englishAttestationChecks: readonly AttestationCheck<"en">[] = [
	{ check: "ArticleAgreement", issues: englishArticleAgreementIssues },
];
