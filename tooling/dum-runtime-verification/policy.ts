/**
 * Import cost remains strictly below the original 5 MiB target. The user
 * approved one repository-wide 5.3 MiB operation ceiling after repeated
 * five-process medians showed small run-to-run variation around 5 MiB. This
 * is measurement headroom, not a package-specific waiver; reachability stays
 * strict for every operational entrypoint.
 */
export const RSS_IMPORT_BUDGET_BYTES = 5 * 1024 * 1024;
export const RSS_OPERATION_BUDGET_BYTES = 5.3 * 1024 * 1024;

export type ParserDifferentialPolicy =
	| {
			readonly differentialTargetId: string;
			readonly status: "strict";
	  }
	| {
			readonly issue: 205 | 206 | 207 | 208;
			readonly reason: string;
			readonly status: "migration-waiver";
	  };

/**
 * Exact migration state for every parser frozen by ADR 0014. This is literal
 * rather than derived from the parser manifest so adding a parser cannot
 * silently acquire a waiver.
 */
export const PARSER_DIFFERENTIAL_POLICIES = {
	"dumling:parseAsLemma": {
		differentialTargetId: "dumling:parseAsLemma",
		status: "strict",
	},
	"dumling:parseAsSurface": {
		differentialTargetId: "dumling:parseAsSurface",
		status: "strict",
	},
	"dumling:parseAsAttestation": {
		differentialTargetId: "dumling:parseAsAttestation",
		status: "strict",
	},
	"dumling:parseAsReading": {
		differentialTargetId: "dumling:parseAsReading",
		status: "strict",
	},
	"dumrel:parseAsKnowledgeSettings": {
		differentialTargetId: "dumrel:parseAsKnowledgeSettings",
		status: "strict",
	},
	"dumrel:parseAsKnowledgeRequestMask": {
		differentialTargetId: "dumrel:parseAsKnowledgeRequestMask",
		status: "strict",
	},
	"dumrel:parseAsMorphemeReadingReference": {
		differentialTargetId: "dumrel:parseAsMorphemeReadingReference",
		status: "strict",
	},
	"dumrel:parseAsUnitShadow": {
		differentialTargetId: "dumrel:parseAsUnitShadow",
		status: "strict",
	},
	"dumrel:parseAsLexicalUnitShadow": {
		differentialTargetId: "dumrel:parseAsLexicalUnitShadow",
		status: "strict",
	},
	"dumrel:parseAsLexemeUnitShadow": {
		differentialTargetId: "dumrel:parseAsLexemeUnitShadow",
		status: "strict",
	},
	"dumrel:parseAsMorphologicalTreeStructure": {
		differentialTargetId: "dumrel:parseAsMorphologicalTreeStructure",
		status: "strict",
	},
	"dumrel:parseAsMorphologicalTreeNode": {
		differentialTargetId: "dumrel:parseAsMorphologicalTreeNode",
		status: "strict",
	},
	"dumrel:parseAsMorphologicalTree": {
		differentialTargetId: "dumrel:parseAsMorphologicalTree",
		status: "strict",
	},
	"dumrel:parseAsLexicalBreakdown": {
		differentialTargetId: "dumrel:parseAsLexicalBreakdown",
		status: "strict",
	},
	"dumrel:parseAsSemanticRelations": {
		differentialTargetId: "dumrel:parseAsSemanticRelations",
		status: "strict",
	},
	"dumrel:parseAsDirectSemanticRelationGraphEdge": {
		differentialTargetId: "dumrel:parseAsDirectSemanticRelationGraphEdge",
		status: "strict",
	},
	"dumrel:parseAsSemanticRelationGraphReading": {
		differentialTargetId: "dumrel:parseAsSemanticRelationGraphReading",
		status: "strict",
	},
	"dumrel:parseAsSemanticRelationGraph": {
		differentialTargetId: "dumrel:parseAsSemanticRelationGraph",
		status: "strict",
	},
	"dumrel:parseAsPendingSemanticRelation": {
		differentialTargetId: "dumrel:parseAsPendingSemanticRelation",
		status: "strict",
	},
	"dumrel:parseAsReadingKnowledge": {
		differentialTargetId: "dumrel:parseAsReadingKnowledge",
		status: "strict",
	},
	"dumrel:parseAsKnowledgeChange": {
		differentialTargetId: "dumrel:parseAsKnowledgeChange",
		status: "strict",
	},
	"dumdict:parseAsLemmaRecord": {
		differentialTargetId: "dumdict:parseAsLemmaRecord",
		status: "strict",
	},
	"dumdict:parseAsReadingEntry": {
		differentialTargetId: "dumdict:parseAsReadingEntry",
		status: "strict",
	},
	"dumdict:parseAsSurfaceEntry": {
		differentialTargetId: "dumdict:parseAsSurfaceEntry",
		status: "strict",
	},
	"dumdict:parseAsPendingSemanticRelationLocator": {
		differentialTargetId: "dumdict:parseAsPendingSemanticRelationLocator",
		status: "strict",
	},
	"dumdict:parseAsPendingSemanticRelationRecord": {
		differentialTargetId: "dumdict:parseAsPendingSemanticRelationRecord",
		status: "strict",
	},
	"dumdict:parseAsChangePrecondition": {
		differentialTargetId: "dumdict:parseAsChangePrecondition",
		status: "strict",
	},
	"dumdict:parseAsReadingPatchOp": {
		differentialTargetId: "dumdict:parseAsReadingPatchOp",
		status: "strict",
	},
	"dumdict:parseAsPlannedChangeOp": {
		differentialTargetId: "dumdict:parseAsPlannedChangeOp",
		status: "strict",
	},
	"dumdict:parseAsDumdictPlan": {
		differentialTargetId: "dumdict:parseAsDumdictPlan",
		status: "strict",
	},
	"dumdict:parseAsCommitChangesRequest": {
		differentialTargetId: "dumdict:parseAsCommitChangesRequest",
		status: "strict",
	},
	"dumdict:parseAsCommitChangesResult": {
		differentialTargetId: "dumdict:parseAsCommitChangesResult",
		status: "strict",
	},
	"dumgen:parseAsKnowledgeGenerationRequest": {
		differentialTargetId: "dumgen:parseAsKnowledgeGenerationRequest",
		status: "strict",
	},
	"dumgen:parseAsKnowledgeGenerationInput": {
		differentialTargetId: "dumgen:parseAsKnowledgeGenerationInput",
		status: "strict",
	},
	"dumgen:parseAsKnowledgeGenerationResult": {
		differentialTargetId: "dumgen:parseAsKnowledgeGenerationResult",
		status: "strict",
	},
	"dumgen:parseAsSegmentedSentenceId": {
		differentialTargetId: "dumgen:parseAsSegmentedSentenceId",
		status: "strict",
	},
	"dumgen:parseAsSegment": {
		differentialTargetId: "dumgen:parseAsSegment",
		status: "strict",
	},
	"dumgen:parseAsSegmentedSentence": {
		differentialTargetId: "dumgen:parseAsSegmentedSentence",
		status: "strict",
	},
	"dumgen:parseAsSegmentationDecision": {
		differentialTargetId: "dumgen:parseAsSegmentationDecision",
		status: "strict",
	},
	"dumgen:parseAsSection1Error": {
		differentialTargetId: "dumgen:parseAsSection1Error",
		status: "strict",
	},
	"dumgen:parseAsSegmentationResult": {
		differentialTargetId: "dumgen:parseAsSegmentationResult",
		status: "strict",
	},
	"dumgen:parseAsGrammaticalRoute": {
		differentialTargetId: "dumgen:parseAsGrammaticalRoute",
		status: "strict",
	},
	"dumgen:parseAsGrammaticalInteraction": {
		differentialTargetId: "dumgen:parseAsGrammaticalInteraction",
		status: "strict",
	},
	"dumgen:parseAsGrammaticalInput": {
		differentialTargetId: "dumgen:parseAsGrammaticalInput",
		status: "strict",
	},
	"dumgen:parseAsGrammaticalResult": {
		differentialTargetId: "dumgen:parseAsGrammaticalResult",
		status: "strict",
	},
} as const satisfies Record<string, ParserDifferentialPolicy>;

export type StrictRssPolicy = {
	readonly status: "strict";
};

export type RssPolicy = StrictRssPolicy;

const MiB = 1024 * 1024;
const strict = { status: "strict" } as const;

/** Every operational export has a strict RSS and zero-reachability policy. */
export const RSS_ENTRYPOINT_POLICIES = {
	dumling: strict,
	"dumling/id": strict,
	"dumling/reading": strict,
	"dumling/vocabulary": strict,
	"dumling/fixed": strict,
	dumrel: strict,
	"dumrel/relations": strict,
	"dumrel/settings": strict,
	"dumrel/vocabulary": strict,
	"dumrel/fixed": strict,
	dumdict: strict,
	"dumdict/runtime": strict,
	"dumdict/relations": strict,
	dumgen: strict,
	"dumgen/projection": strict,
	"dumgen/knowledge": strict,
	"dumgen/knowledge-runtime": strict,
	"dumgen/openai-fetch": strict,
	"dumgen/runtime": strict,
	"dumgen/runtime-prompt-data": strict,
	"dumgen/vocabulary": strict,
} as const satisfies Record<string, RssPolicy>;

export interface RssObservation {
	readonly importOnlyDeltaBytes: number;
	readonly importPlusOperationDeltaBytes: number;
	readonly reachability: {
		readonly heavyweightDependencies: readonly string[];
		readonly schemaEntrypoints: readonly string[];
	};
}

export interface RssPolicyResult {
	readonly passed: boolean;
	readonly status: RssPolicy["status"];
	readonly violations: readonly string[];
}

export function evaluateEntrypointRss(
	policy: RssPolicy,
	observation: RssObservation,
): RssPolicyResult {
	const violations: string[] = [];
	if (observation.importOnlyDeltaBytes >= RSS_IMPORT_BUDGET_BYTES)
		violations.push("import-only delta is not below 5 MiB");
	if (observation.importPlusOperationDeltaBytes > RSS_OPERATION_BUDGET_BYTES)
		violations.push("import+operation delta exceeds 5.3 MiB");
	if (observation.reachability.heavyweightDependencies.length > 0)
		violations.push("strict surface reaches a heavyweight dependency");
	if (observation.reachability.schemaEntrypoints.length > 0)
		violations.push("strict surface reaches a schema-authoring entrypoint");
	return {
		passed: violations.length === 0,
		status: policy.status,
		violations,
	};
}

export interface RssGateReportEntry extends RssPolicyResult {
	readonly absoluteImportOnlyMedianBytes: number;
	readonly absoluteImportPlusOperationMedianBytes: number;
	readonly importOnlyDeltaBytes: number;
	readonly importPlusOperationDeltaBytes: number;
	readonly specifier: string;
}

function mib(bytes: number): string {
	return (bytes / MiB).toFixed(3);
}

export function formatRssGateReport(report: {
	readonly baselineMedianBytes: number;
	readonly entries: readonly RssGateReportEntry[];
}): string {
	const lines = [
		`empty-module baseline: ${mib(report.baselineMedianBytes)} MiB absolute`,
	];
	for (const entry of report.entries) {
		lines.push(
			`${entry.passed ? "PASS" : "FAIL"} ${entry.specifier} [${entry.status}]`,
			`  import-only: ${mib(entry.absoluteImportOnlyMedianBytes)} MiB absolute; +${mib(entry.importOnlyDeltaBytes)} MiB delta over empty baseline`,
			`  import+operation: ${mib(entry.absoluteImportPlusOperationMedianBytes)} MiB absolute; +${mib(entry.importPlusOperationDeltaBytes)} MiB delta over empty baseline`,
		);
		for (const violation of entry.violations)
			lines.push(`  violation: ${violation}`);
	}
	return `${lines.join("\n")}\n`;
}
