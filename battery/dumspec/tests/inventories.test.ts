import { describe, expect, test } from "bun:test";
import { parseUnit } from "dumling";
import { parseReadingKnowledge, selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { frameAdpositionCaseIssues } from "../src/check-adposition-cases.js";
import {
	type AuthoredMember,
	authoredMembers,
	authoredRealizations,
	closedVerbForms,
	reflexiveDrillDown,
	reflexivityUnit,
	subjectExpletiveEs,
} from "../src/inventories.js";

const name = ({ lemma, reading }: AuthoredMember) =>
	`${lemma.kind}/${lemma.canonicalForm} ${reading.emojiDescription} ${JSON.stringify(lemma.coreFeatures)}`;

/** The Surface a stem PRON's spelling realizes, marking the cell it names. */
function pronounSurface(
	{ lemma }: AuthoredMember,
	spelled: string,
	cell: Readonly<Record<string, string | null>>,
) {
	return {
		unitKind: "Surface",
		language: "de",
		lemma,
		normalizedSurface: spelled,
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: {
			case: null,
			gender: null,
			number: null,
			"gender[psor]": null,
			"number[psor]": null,
			reflex: null,
			...cell,
		},
	};
}

function field(value: unknown, key: string): unknown {
	return value && typeof value === "object" && key in value
		? (value as Record<string, unknown>)[key]
		: undefined;
}

/**
 * The aspects an authored member leaves incomplete (system ADR 0021): every
 * aspect the route's Knowledge policy selects is stored and marked Authored,
 * and each semantic relation is Authored with claims or ReviewedEmpty.
 */
function incompleteKnowledge(member: AuthoredMember): string[] {
	const { language, family, kind } = member.lemma;
	const selected = selectKnowledge({
		route: {
			language,
			family,
			kind,
		} as Dumrel.KnowledgeSelectionInput["route"],
	});
	if (!selected.success) return [selected.error.message];
	const gaps: string[] = [];
	for (const [aspect, selection] of Object.entries(selected.value)) {
		const content = field(member.knowledge, aspect);
		const coverage = field(member.coverage, aspect);
		if (selection === null) {
			if (content === undefined || coverage !== "Authored")
				gaps.push(aspect);
			continue;
		}
		for (const leaf of Object.keys(selection)) {
			const value = field(content, leaf);
			const status = field(coverage, leaf);
			const complete =
				aspect !== "semanticRelations"
					? value !== undefined && status === "Authored"
					: status === "ReviewedEmpty"
						? value === undefined ||
							(Array.isArray(value) && !value.length)
						: status === "Authored" &&
							Array.isArray(value) &&
							value.length > 0;
			if (!complete) gaps.push(`${aspect}/${leaf}`);
		}
	}
	if (
		member.coverage.semanticRelationTargetKind !==
		(member.knowledge.semanticRelations?.targetKind ?? "lemma")
	)
		gaps.push("semanticRelationTargetKind");
	return gaps;
}

describe("the German authored inventory", () => {
	test("holds every member", () => {
		expect(authoredMembers.length).toBeGreaterThan(300);
	});

	test("every Lemma and Reading parses strictly as Dumling stores it", () => {
		const failures = authoredMembers.flatMap((member) =>
			[member.lemma, member.reading].flatMap((unit) => {
				const parsed = parseUnit(unit);
				if (!parsed.success)
					return [`${name(member)}: ${parsed.error.message}`];
				return Bun.deepEquals(parsed.chain.value, unit, true)
					? []
					: [
							`${name(member)}: not stored as parseUnit normalizes it`,
						];
			}),
		);
		expect(failures).toEqual([]);
	});

	test("every Reading's Knowledge parses with Dumrel", () => {
		const failures = authoredMembers.flatMap((member) => {
			const parsed = parseReadingKnowledge({
				source: member.reading,
				knowledge: member.knowledge,
			});
			return parsed.success
				? []
				: [`${name(member)}: ${parsed.error.message}`];
		});
		expect(failures).toEqual([]);
	});

	test("every Valency Frame takes cases the ADP Case Table allows", () => {
		const failures = authoredMembers.flatMap((member) =>
			frameAdpositionCaseIssues(member.knowledge.valency ?? []).map(
				(found) =>
					`${name(member)}: valency.${found.path}: ${found.message}`,
			),
		);
		expect(failures).toEqual([]);
	});

	test("every member stores all Knowledge its route selects", () => {
		const failures = authoredMembers.flatMap((member) =>
			incompleteKnowledge(member).map((gap) => `${name(member)}: ${gap}`),
		);
		expect(failures).toEqual([]);
	});

	test("no two members hold the same Reading", () => {
		const seen = new Set<string>();
		const duplicates = authoredMembers.flatMap((member) => {
			const key = JSON.stringify(member.reading);
			if (seen.has(key)) return [name(member)];
			seen.add(key);
			return [];
		});
		expect(duplicates).toEqual([]);
	});

	test("every realization spells a DET, PRON or AUX member", () => {
		for (const { member, spelled } of authoredRealizations) {
			expect(authoredMembers).toContain(member);
			expect(spelled).toBe(spelled.trim());
			expect(spelled).not.toBe("");
			expect(["DET", "PRON", "AUX"]).toContain(member.lemma.kind);
		}
	});

	test("authors per cell only the pillars (system ADR 0032)", () => {
		// A per-cell Lemma fixes its case in Core. Only a paradigm whose forms
		// cannot be derived from another is a pillar: the personal pronouns,
		// the der and ein articles with pronominal einer, and the der-series.
		const einTable = new Set(["einer", "eine", "eines", "einem", "einen"]);
		const derSeries = new Set([
			"der",
			"die",
			"das",
			"den",
			"dem",
			"denen",
			"dessen",
			"deren",
			"derer",
		]);
		const isPillar = ({ lemma }: AuthoredMember) => {
			const { pronType } = lemma.coreFeatures as { pronType?: string };
			if (lemma.kind === "DET") return pronType === "Art";
			if (pronType === "Prs") return true;
			if (pronType === "Ind") return einTable.has(lemma.canonicalForm);
			return (
				(pronType === "Dem" || pronType === "Rel") &&
				derSeries.has(lemma.canonicalForm)
			);
		};
		const strays = authoredMembers.filter(
			(member) =>
				(member.lemma.kind === "PRON" || member.lemma.kind === "DET") &&
				(field(member.lemma.coreFeatures, "case") ?? null) !== null &&
				!isPillar(member),
		);
		expect(strays.map(name)).toEqual([]);
	});

	test("a stem's spellings are Surfaces Dumling accepts", () => {
		const failures = authoredRealizations.flatMap(
			({ member, spelled, inflection }) => {
				if (member.lemma.kind !== "PRON" || !inflection) return [];
				const parsed = parseUnit(
					pronounSurface(member, spelled, inflection),
				);
				return parsed.success
					? []
					: [`${name(member)} ${spelled}: ${parsed.error.message}`];
			},
		);
		expect(failures).toEqual([]);
	});

	test("jemand, niemand, wer and was are stems (system ADR 0032)", () => {
		const lemmasSpelled = (spelled: string) =>
			authoredRealizations
				.filter(
					(realization) =>
						realization.spelled === spelled &&
						realization.member.lemma.kind === "PRON" &&
						field(
							realization.member.lemma.coreFeatures,
							"extPos",
						) === null,
				)
				.map(({ member, inflection }) => ({
					canonicalForm: member.lemma.canonicalForm,
					pronType: field(member.lemma.coreFeatures, "pronType"),
					inflection,
				}));
		// wem is the Dat Surface of wer, as diesem is of dieser.
		expect(lemmasSpelled("wem")).toEqual(
			["Int", "Rel"].map((pronType) => ({
				canonicalForm: "wer",
				pronType,
				inflection: { case: "Dat", number: null, gender: null },
			})),
		);
		const interrogative = (canonicalForm: string) => {
			const found = authoredMembers.find(
				({ lemma }) =>
					lemma.canonicalForm === canonicalForm &&
					field(lemma.coreFeatures, "pronType") === "Int" &&
					field(lemma.coreFeatures, "extPos") === null,
			);
			if (!found) throw Error(`No interrogative ${canonicalForm}`);
			return found;
		};
		// Gender is inherent, as a noun's is: Core, never on the Surface.
		const wer = interrogative("wer");
		expect(field(wer.lemma.coreFeatures, "gender")).toBe("Masc");
		expect(field(interrogative("was").lemma.coreFeatures, "gender")).toBe(
			"Neut",
		);
		expect(
			parseUnit(pronounSurface(wer, "wem", { case: "Dat" })).success,
		).toBe(true);
		expect(
			parseUnit(
				pronounSurface(wer, "wem", { case: "Dat", gender: "Masc" }),
			).success,
		).toBe(false);
		// Genitive wessen is spelled under both Lemmas; the referent decides.
		expect(
			lemmasSpelled("wessen")
				.filter(({ pronType }) => pronType === "Int")
				.map(({ canonicalForm }) => canonicalForm),
		).toEqual(["wer", "was"]);
		for (const [spelled, cited] of [
			["was", "was"],
			["jemandem", "jemand"],
			["niemanden", "niemand"],
			["jedermanns", "jedermann"],
		] as const)
			expect(
				new Set(
					lemmasSpelled(spelled).map((lemma) => lemma.canonicalForm),
				),
			).toEqual(new Set([cited]));
	});

	test("authors each w-adverb as one Int and one Rel ADV", () => {
		const whAdverbs = [
			"wo",
			"wohin",
			"woher",
			"wann",
			"wie",
			"warum",
			"wieso",
			"weshalb",
			"weswegen",
		];
		for (const text of whAdverbs)
			expect(
				authoredMembers
					.filter(
						({ lemma }) =>
							lemma.kind === "ADV" &&
							lemma.canonicalForm === text,
					)
					.map(({ lemma }) => field(lemma.coreFeatures, "pronType")),
				text,
			).toEqual(["Int", "Rel"]);
		// wieso, weshalb and weswegen claim warum as a synonym, one use to the same use.
		const weshalb = authoredMembers.find(
			({ lemma }) =>
				lemma.canonicalForm === "weshalb" &&
				field(lemma.coreFeatures, "pronType") === "Rel",
		);
		expect(weshalb?.knowledge.semanticRelations).toEqual({
			synonym: [
				expect.objectContaining({
					canonicalForm: "warum",
					coreFeatures: expect.objectContaining({ pronType: "Rel" }),
				}),
			],
		});
	});

	test("reaches the units a Note drills down to without generation", () => {
		const realized = (spelled: string, kind: string) =>
			authoredRealizations
				.filter(
					(realization) =>
						realization.spelled === spelled &&
						realization.member.lemma.kind === kind,
				)
				.map(({ member }) => member.lemma);
		// hat in hat gekocht: the auxiliary's spelling names the AUX Lemma.
		expect(realized("hat", "AUX")).toContainEqual(
			expect.objectContaining({ canonicalForm: "haben" }),
		);
		// sich is one reflexive PRON cell per case.
		expect(
			realized("sich", "PRON").map(({ coreFeatures }) =>
				"case" in coreFeatures ? coreFeatures.case : null,
			),
		).toEqual(["Acc", "Dat"]);
		// der in der Frau is the article cell Dat.Fem.Sg.
		expect(realized("der", "DET")).toContainEqual(
			expect.objectContaining({
				coreFeatures: expect.objectContaining({
					pronType: "Art",
					case: "Dat",
					gender: "Fem",
					number: "Sing",
				}),
			}),
		);
		expect(authoredMembers).toContain(subjectExpletiveEs);
		expect(closedVerbForms.müssen).toContain("muß");
	});

	test("authors the reflexivity unit a reflexive drills down to (system ADR 0041)", () => {
		const { lemma, reading, knowledge } = reflexivityUnit;
		expect(authoredMembers).toContain(reflexivityUnit);
		expect(parseUnit(lemma).success).toBe(true);
		expect(parseUnit(reading).success).toBe(true);
		expect(
			parseReadingKnowledge({ source: reading, knowledge }).success,
		).toBe(true);
		// PRON sich with no case, person or number: neither the Acc nor the Dat cell.
		expect(lemma).toMatchObject({ kind: "PRON", canonicalForm: "sich" });
		expect(lemma.coreFeatures).toMatchObject({
			pronType: "Prs",
			case: null,
			person: null,
			number: null,
		});
		// No spelling realizes it; a free sich stays a case cell.
		expect(
			authoredRealizations.some(
				({ member }) => member === reflexivityUnit,
			),
		).toBe(false);
	});

	test("drills down from a reflexive to the reflexivity unit, never a case cell", () => {
		const verb = (
			canonicalForm: string,
			lexicallyReflexive: "Yes" | null,
		) =>
			({
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "VERB",
				canonicalForm,
				coreFeatures: {
					hasSepPrefix: null,
					lexicallyReflexive,
					verbType: null,
				},
			}) as const;
		// er schämt sich takes the Acc, er bildet sich etwas ein the Dat.
		for (const reflexive of [
			verb("sich schämen", "Yes"),
			verb("sich einbilden", "Yes"),
		]) {
			expect(parseUnit(reflexive).success).toBe(true);
			expect(reflexiveDrillDown(reflexive)).toBe(reflexivityUnit);
		}
		expect(reflexiveDrillDown(verb("warten", null))).toBeUndefined();
	});
});
