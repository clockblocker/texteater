import { isRecord } from "common-utils";

/** The legacy principal-part aspects and the dimensions they moved to (ADR 0048). */
const legacyAspects = [
	"plural",
	"preterite",
	"pastParticiple",
	"subjunctivePast",
] as const;
const legacyPersons = [
	["first", "present1"],
	["second", "present2"],
	["third", "present3"],
] as const;

/**
 * Gold frozen before ADR 0048 held a Reading's principal parts as Knowledge
 * (`plural`, `conjugationClass`, `preterite`, `presentSingular`, …). A frozen
 * set never changes, so its gold is read the way the records were migrated:
 * each part moves to the dimension of the same name, the Präsens singular
 * splits into `present1`, `present2` and `present3`, a conjugation class is
 * dropped, and the coverage follows. Current gold passes as it is.
 */
export function currentGold(gold: unknown): unknown {
	if (!isRecord(gold) || !isRecord(gold.knowledge) || "paradigm" in gold)
		return gold;
	const { knowledge, coverage } = gold;
	const covered = isRecord(coverage) ? coverage : {};
	const paradigm: Record<string, unknown> = {};
	const paradigmCoverage: Record<string, unknown> = {};
	const rest: Record<string, unknown> = { ...knowledge };
	const restCoverage: Record<string, unknown> = { ...covered };
	for (const aspect of legacyAspects) {
		const value = knowledge[aspect];
		if (value !== undefined)
			paradigm[aspect] = typeof value === "string" ? [value] : value;
		if (covered[aspect] !== undefined)
			paradigmCoverage[aspect] = covered[aspect];
		delete rest[aspect];
		delete restCoverage[aspect];
	}
	const present = knowledge.presentSingular;
	for (const [person, dimension] of legacyPersons) {
		if (isRecord(present) && present[person] !== undefined)
			paradigm[dimension] = present[person];
		if (covered.presentSingular !== undefined)
			paradigmCoverage[dimension] = covered.presentSingular;
	}
	for (const aspect of ["presentSingular", "conjugationClass"]) {
		delete rest[aspect];
		delete restCoverage[aspect];
	}
	return {
		knowledge: rest,
		paradigm,
		coverage: {
			...restCoverage,
			...(Object.keys(paradigmCoverage).length > 0
				? { paradigm: paradigmCoverage }
				: {}),
		},
	};
}
