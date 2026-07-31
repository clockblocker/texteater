export type Language = "de" | "ru";
export type EntryFamily = "Lexeme" | "Phraseme" | "Morpheme" | "Construction";
export type Decision = "Existing" | "ProposeNew" | "Abstain";

export interface EntryDescriptor {
	family: EntryFamily;
	subkind: string;
	citationForm: string;
	inherentFeatures: Record<string, string>;
}

export interface CatalogEntry extends EntryDescriptor {
	entryId: string;
	language: Language;
	boundaryGloss: string;
}

export interface BlindCase {
	caseId: string;
	primaryStratum: string;
	coverageTags: string[];
	language: Language;
	boundaryPolicyVersion: string;
	sentence: string;
	surface: {
		normalizedSurface: string;
		surfaceKind: "Citation" | "Inflection";
		inflectionalFeatures: Record<string, string>;
	};
	candidateEntryIds: string[];
}

export interface GoldCase extends EntryDescriptor {
	caseId: string;
	decision: Exclude<Decision, "Abstain">;
	entryId: string | null;
}

export interface RelationalAssertion {
	assertionId: string;
	kind:
		| "same-entry"
		| "different-entry"
		| "all-different"
		| "all-propose-new";
	caseIds: string[];
}

export interface CanonicalResult extends EntryDescriptor {
	caseId: string;
	decision: Exclude<Decision, "Abstain">;
	entryId: string | null;
}

export interface AbstentionResult {
	caseId: string;
	decision: "Abstain";
	reason: string;
}

export type ParsedResult = CanonicalResult | AbstentionResult;

export interface CaseScore {
	caseId: string;
	stratum: string;
	valid: boolean;
	abstained: boolean;
	decisionCorrect: boolean;
	entryCorrect: boolean;
	descriptorCorrect: boolean;
	exactCorrect: boolean;
	falseExistingMerge: boolean;
	fabricatedEntryId: boolean;
	descriptorDrift: boolean;
	errors: string[];
}

export interface EvaluationScore {
	caseScores: CaseScore[];
	relationScores: Array<{
		assertionId: string;
		correct: boolean;
	}>;
	totals: {
		cases: number;
		valid: number;
		invalid: number;
		abstained: number;
		exactCorrect: number;
		falseExistingMerges: number;
		fabricatedEntryIds: number;
		descriptorDrifts: number;
		relationsCorrect: number;
		relationsTotal: number;
	};
	byStratum: Record<
		string,
		{ cases: number; exactCorrect: number; abstained: number }
	>;
}

const ENTRY_ID_PATTERN = /^ent_[0-9a-f]{16}$/;
const FAMILIES = new Set<EntryFamily>([
	"Lexeme",
	"Phraseme",
	"Morpheme",
	"Construction",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableFeatures(features: Record<string, string>): string {
	return JSON.stringify(
		Object.entries(features)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([name, value]) => [
				name.normalize("NFC"),
				value.normalize("NFC"),
			]),
	);
}

function descriptorEquals(
	left: EntryDescriptor,
	right: EntryDescriptor,
): boolean {
	return (
		left.family === right.family &&
		left.subkind.normalize("NFC") === right.subkind.normalize("NFC") &&
		left.citationForm.normalize("NFC") ===
			right.citationForm.normalize("NFC") &&
		stableFeatures(left.inherentFeatures) ===
			stableFeatures(right.inherentFeatures)
	);
}

function parseFeatures(
	value: unknown,
	errors: string[],
): Record<string, string> | null {
	if (!isRecord(value)) {
		errors.push("inherentFeatures must be an object");
		return null;
	}

	const parsed: Record<string, string> = {};
	for (const [name, featureValue] of Object.entries(value)) {
		if (name.length === 0 || typeof featureValue !== "string") {
			errors.push(
				"inherentFeatures must contain non-empty string keys and string values",
			);
			return null;
		}
		parsed[name] = featureValue;
	}
	return parsed;
}

function parseDescriptor(
	raw: Record<string, unknown>,
	errors: string[],
): EntryDescriptor | null {
	const family = raw.family;
	const subkind = raw.subkind;
	const citationForm = raw.citationForm;
	const inherentFeatures = parseFeatures(raw.inherentFeatures, errors);

	if (typeof family !== "string" || !FAMILIES.has(family as EntryFamily)) {
		errors.push("family must be a supported Entry family");
	}
	if (typeof subkind !== "string" || subkind.length === 0) {
		errors.push("subkind must be a non-empty string");
	}
	if (typeof citationForm !== "string" || citationForm.length === 0) {
		errors.push("citationForm must be a non-empty string");
	}
	if (
		errors.length > 0 ||
		inherentFeatures === null ||
		typeof family !== "string" ||
		typeof subkind !== "string" ||
		typeof citationForm !== "string"
	) {
		return null;
	}

	return {
		family: family as EntryFamily,
		subkind,
		citationForm,
		inherentFeatures,
	};
}

export function validateResult(
	raw: unknown,
	blindCase: BlindCase,
	catalogById: ReadonlyMap<string, CatalogEntry>,
): {
	result: ParsedResult | null;
	errors: string[];
	fabricatedEntryId: boolean;
	descriptorDrift: boolean;
} {
	const errors: string[] = [];
	let fabricatedEntryId = false;
	let descriptorDrift = false;

	if (!isRecord(raw)) {
		return {
			result: null,
			errors: ["result must be an object"],
			fabricatedEntryId,
			descriptorDrift,
		};
	}
	if (raw.caseId !== blindCase.caseId) {
		errors.push(`caseId must equal ${blindCase.caseId}`);
	}

	if (raw.decision === "Abstain") {
		if (typeof raw.reason !== "string" || raw.reason.trim().length === 0) {
			errors.push("Abstain requires a non-empty reason");
		}
		return {
			result:
				errors.length === 0
					? {
							caseId: blindCase.caseId,
							decision: "Abstain",
							reason: raw.reason as string,
						}
					: null,
			errors,
			fabricatedEntryId,
			descriptorDrift,
		};
	}

	if (raw.decision !== "Existing" && raw.decision !== "ProposeNew") {
		errors.push("decision must be Existing, ProposeNew, or Abstain");
	}
	const descriptor = parseDescriptor(raw, errors);
	const entryId = raw.entryId;

	if (raw.decision === "Existing") {
		if (typeof entryId !== "string" || !ENTRY_ID_PATTERN.test(entryId)) {
			errors.push("Existing requires an opaque entryId");
		} else {
			const catalogEntry = catalogById.get(entryId);
			if (!catalogEntry) {
				fabricatedEntryId = true;
				errors.push("Existing entryId is not in the frozen catalog");
			} else {
				if (!blindCase.candidateEntryIds.includes(entryId)) {
					errors.push(
						"Existing entryId was not offered as a candidate",
					);
				}
				if (descriptor && !descriptorEquals(descriptor, catalogEntry)) {
					descriptorDrift = true;
					errors.push(
						"Existing descriptor drifts from the frozen catalog",
					);
				}
			}
		}
	}
	if (raw.decision === "ProposeNew" && entryId !== null) {
		errors.push("ProposeNew requires entryId null");
	}

	if (
		errors.length > 0 ||
		descriptor === null ||
		(raw.decision !== "Existing" && raw.decision !== "ProposeNew")
	) {
		return { result: null, errors, fabricatedEntryId, descriptorDrift };
	}

	return {
		result: {
			caseId: blindCase.caseId,
			decision: raw.decision,
			entryId: entryId as string | null,
			...descriptor,
		},
		errors,
		fabricatedEntryId,
		descriptorDrift,
	};
}

export function scoreCase(
	raw: unknown,
	blindCase: BlindCase,
	goldCase: GoldCase,
	catalogById: ReadonlyMap<string, CatalogEntry>,
): CaseScore {
	const validation = validateResult(raw, blindCase, catalogById);
	const parsed = validation.result;
	const abstained = parsed?.decision === "Abstain";
	const canonical = parsed && parsed.decision !== "Abstain" ? parsed : null;
	const decisionCorrect = canonical?.decision === goldCase.decision;
	const entryCorrect =
		decisionCorrect && canonical?.entryId === goldCase.entryId;
	const descriptorCorrect = Boolean(
		canonical && descriptorEquals(canonical, goldCase),
	);
	const exactCorrect = Boolean(entryCorrect && descriptorCorrect);

	return {
		caseId: blindCase.caseId,
		stratum: blindCase.primaryStratum,
		valid: parsed !== null,
		abstained,
		decisionCorrect,
		entryCorrect,
		descriptorCorrect,
		exactCorrect,
		falseExistingMerge:
			canonical?.decision === "Existing" &&
			(goldCase.decision === "ProposeNew" ||
				canonical.entryId !== goldCase.entryId),
		fabricatedEntryId: validation.fabricatedEntryId,
		descriptorDrift: validation.descriptorDrift,
		errors: validation.errors,
	};
}

function relationCorrect(
	assertion: RelationalAssertion,
	resultsByCaseId: ReadonlyMap<string, ParsedResult>,
): boolean {
	const results = assertion.caseIds.map((caseId) =>
		resultsByCaseId.get(caseId),
	);
	if (results.some((result) => !result || result.decision === "Abstain")) {
		return false;
	}
	const canonical = results as CanonicalResult[];
	if (assertion.kind === "all-propose-new") {
		return canonical.every((result) => result.decision === "ProposeNew");
	}
	if (canonical.some((result) => result.decision !== "Existing")) {
		return false;
	}
	const entryIds = canonical.map((result) => result.entryId);
	if (assertion.kind === "same-entry") {
		return entryIds.every((entryId) => entryId === entryIds[0]);
	}
	if (assertion.kind === "different-entry") {
		return entryIds.length === 2 && entryIds[0] !== entryIds[1];
	}
	return new Set(entryIds).size === entryIds.length;
}

export function scoreEvaluation(
	rawResults: readonly unknown[],
	blindCases: readonly BlindCase[],
	goldCases: readonly GoldCase[],
	catalogEntries: readonly CatalogEntry[],
	assertions: readonly RelationalAssertion[],
): EvaluationScore {
	const catalogById = new Map(
		catalogEntries.map((entry) => [entry.entryId, entry]),
	);
	const goldByCaseId = new Map(
		goldCases.map((goldCase) => [goldCase.caseId, goldCase]),
	);
	const rawByCaseId = new Map<string, unknown>();
	const duplicateCaseIds = new Set<string>();

	for (const raw of rawResults) {
		const caseId =
			isRecord(raw) && typeof raw.caseId === "string" ? raw.caseId : "";
		if (rawByCaseId.has(caseId)) duplicateCaseIds.add(caseId);
		else rawByCaseId.set(caseId, raw);
	}

	const parsedByCaseId = new Map<string, ParsedResult>();
	const caseScores = blindCases.map((blindCase) => {
		const goldCase = goldByCaseId.get(blindCase.caseId);
		if (!goldCase) throw new Error(`Missing gold case ${blindCase.caseId}`);
		const raw = duplicateCaseIds.has(blindCase.caseId)
			? { caseId: blindCase.caseId, decision: "invalid-duplicate" }
			: rawByCaseId.get(blindCase.caseId);
		const score = scoreCase(raw, blindCase, goldCase, catalogById);
		const validation = validateResult(raw, blindCase, catalogById);
		if (validation.result)
			parsedByCaseId.set(blindCase.caseId, validation.result);
		return score;
	});

	const relationScores = assertions.map((assertion) => ({
		assertionId: assertion.assertionId,
		correct: relationCorrect(assertion, parsedByCaseId),
	}));
	const byStratum: EvaluationScore["byStratum"] = {};
	for (const score of caseScores) {
		const current = byStratum[score.stratum] ?? {
			cases: 0,
			exactCorrect: 0,
			abstained: 0,
		};
		current.cases += 1;
		current.exactCorrect += Number(score.exactCorrect);
		current.abstained += Number(score.abstained);
		byStratum[score.stratum] = current;
	}

	return {
		caseScores,
		relationScores,
		totals: {
			cases: caseScores.length,
			valid: caseScores.filter((score) => score.valid).length,
			invalid: caseScores.filter((score) => !score.valid).length,
			abstained: caseScores.filter((score) => score.abstained).length,
			exactCorrect: caseScores.filter((score) => score.exactCorrect)
				.length,
			falseExistingMerges: caseScores.filter(
				(score) => score.falseExistingMerge,
			).length,
			fabricatedEntryIds: caseScores.filter(
				(score) => score.fabricatedEntryId,
			).length,
			descriptorDrifts: caseScores.filter(
				(score) => score.descriptorDrift,
			).length,
			relationsCorrect: relationScores.filter((score) => score.correct)
				.length,
			relationsTotal: relationScores.length,
		},
		byStratum,
	};
}
