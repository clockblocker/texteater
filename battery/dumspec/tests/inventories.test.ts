import { describe, expect, test } from "bun:test";
import { parseUnit } from "dumling";
import { parseReadingKnowledge, selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { frameAdpositionCaseIssues } from "../src/check-adposition-cases.js";
import { attestationParticleIssues, loadSpecRecords } from "../src/index.js";
import {
	type AuthoredMember,
	authoredMembers,
	authoredRealizations,
	closedVerbForms,
	germanParticleMember,
	germanParticles,
	modalVerbs,
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
		spelling: { kind: "Canonical" },
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

	test("no two per-cell Lemmas of one Kind share all Core Features (system ADR 0032)", () => {
		// A per-cell Lemma marks case, number or gender in Core. Navigation
		// such as "the plural of dessen" lands on exactly one Lemma only while
		// no two of them share every Core Feature. Never accept a collision
		// here without an ADR that names it.
		const coordinates = ["case", "number", "gender"];
		const groups = new Map<string, Set<string>>();
		for (const { lemma } of authoredMembers) {
			if (lemma.kind !== "PRON" && lemma.kind !== "DET") continue;
			const core = Object.entries(lemma.coreFeatures).filter(
				([, value]) => value !== null,
			);
			if (!core.some(([key]) => coordinates.includes(key))) continue;
			const key = `${lemma.kind} ${core
				.map(([feature, value]) => `${feature}=${String(value)}`)
				.sort()
				.join(" ")}`;
			groups.set(
				key,
				(groups.get(key) ?? new Set()).add(lemma.canonicalForm),
			);
		}
		const collisions = [...groups]
			.filter(([, forms]) => forms.size > 1)
			.map(([key, forms]) => `${[...forms].sort().join(" = ")}: ${key}`);
		expect(collisions).toEqual([]);
	});

	test("no personal or der-series cell is split by gender alone (system ADR 0044)", () => {
		// The referent may choose only between cells that differ in who is
		// meant. A form that serves two genders alike (ihm, seiner, dem,
		// dessen) is one cell with gender null.
		const byRest = new Map<string, Set<string>>();
		for (const { lemma } of authoredMembers) {
			if (lemma.kind !== "PRON") continue;
			const { gender, ...rest } = lemma.coreFeatures as Readonly<
				Record<string, unknown>
			>;
			if (!["Prs", "Dem", "Rel"].includes(String(rest.pronType)))
				continue;
			if ((rest.case ?? null) === null) continue;
			const key = `${lemma.canonicalForm} ${JSON.stringify(rest)}`;
			byRest.set(key, (byRest.get(key) ?? new Set()).add(String(gender)));
		}
		expect(
			[...byRest]
				.filter(([, genders]) => genders.size > 1)
				.map(([key, genders]) => `${key}: ${[...genders].join(", ")}`),
		).toEqual([]);
	});

	test("derer is its own invariant Lemma pointing ahead and spells standalone deren elsewhere (system ADR 0044)", () => {
		// Demonstrative derer points ahead to a relative clause and has one
		// uninflected form. Wherever deren could stand instead, relative or
		// demonstrative pointing back, derer is a Licensed Variant of that
		// deren cell; attributive deren has no such spelling.
		const spelledDerer = authoredRealizations
			.filter(({ spelled }) => spelled === "derer")
			.map(({ member, inflection }) => {
				const core = member.lemma.coreFeatures as Readonly<
					Record<string, unknown>
				>;
				const cell = ["case", "number", "gender"]
					.map((key) => String(core[key] ?? null))
					.join(" ");
				return `${member.lemma.canonicalForm} ${String(core.pronType)} ${cell}${inflection ? " inflected" : ""}`;
			})
			.sort();
		expect(spelledDerer).toEqual([
			"deren Dem Gen Plur null",
			"deren Dem Gen Sing Fem",
			"deren Rel Gen Plur null",
			"deren Rel Gen Sing Fem",
			"derer Dem null null null",
		]);
	});

	test("the records spell derer Canonical as its own Lemma and Licensed as deren (system ADR 0044)", () => {
		const attested = loadSpecRecords().flatMap(({ id, targets }) =>
			targets.flatMap(({ attestation: { surface } }) => {
				if (surface.normalizedSurface !== "derer") return [];
				const { canonicalForm, coreFeatures } = surface.lemma;
				const tags =
					surface.spelling.kind === "Variant"
						? ` ${surface.spelling.variantTags.join(" ")}`
						: "";
				return [
					`${id} ${canonicalForm} ${String(field(coreFeatures, "pronType"))} ${surface.spelling.kind}${tags}`,
				];
			}),
		);
		for (const line of attested)
			expect(line).toMatch(
				/ (derer Dem Canonical|deren (Dem|Rel) Variant Licensed)$/u,
			);
		// sich derer entledigen points back, so derer spells demonstrative deren.
		expect(attested).toContain(
			"de/die-alten-kartons-stehen-nur-herum-deshalb-wollen-wir-uns deren Dem Variant Licensed",
		);
		expect(attested).toContain(
			"de/die-opfer-derer-wir-heute-gedenken-sind-nicht-vergessen deren Rel Variant Licensed",
		);
		expect(attested).toContain(
			"de/wir-gedenken-derer-die-im-krieg-gestorben-sind derer Dem Canonical",
		);
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
		// irgendwer is built like wer: Masc in Core, case on the Surface, and
		// it claims irgendjemand as a synonym.
		expect(lemmasSpelled("irgendwem")).toEqual([
			{
				canonicalForm: "irgendwer",
				pronType: "Ind",
				inflection: { case: "Dat", number: null, gender: null },
			},
		]);
		const irgendwer = authoredMembers.find(
			({ lemma }) => lemma.canonicalForm === "irgendwer",
		);
		expect(field(irgendwer?.lemma.coreFeatures, "gender")).toBe("Masc");
		expect(irgendwer?.knowledge.semanticRelations).toEqual({
			synonym: [
				expect.objectContaining({ canonicalForm: "irgendjemand" }),
			],
		});
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
		const readingsOf = (text: string) =>
			authoredMembers.filter(
				({ lemma }) =>
					lemma.kind === "ADV" && lemma.canonicalForm === text,
			);
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
				new Set(
					readingsOf(text).map(({ lemma }) =>
						field(lemma.coreFeatures, "pronType"),
					),
				),
				text,
			).toEqual(new Set(["Int", "Rel"]));
		// Relative wo has a place and a time Reading; every other use has one.
		expect(
			readingsOf("wo").map(({ reading }) => reading.emojiDescription),
		).toEqual(["❓📍", "🧩📍", "🧩⏰"]);
		expect(
			whAdverbs.filter((text) => text !== "wo").flatMap(readingsOf),
		).toHaveLength(2 * (whAdverbs.length - 1));
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

	test("authors each irgend- adverb as one Ind ADV with one Reading", () => {
		for (const text of [
			"irgendwo",
			"irgendwohin",
			"irgendwoher",
			"irgendwann",
			"irgendeinmal",
			"irgendwie",
		])
			expect(
				authoredMembers
					.filter(({ lemma }) => lemma.canonicalForm === text)
					.map(({ lemma }) => [
						lemma.kind,
						field(lemma.coreFeatures, "pronType"),
					]),
				text,
			).toEqual([["ADV", "Ind"]]);
	});

	test("authors dahin, daher, hierhin and hierher as one Dem ADV with one Reading", () => {
		for (const [text, emoji] of [
			["dahin", "🛬"],
			["daher", "🛫"],
			["hierhin", "🛬"],
			["hierher", "🛫"],
		] as const)
			expect(
				authoredMembers
					.filter(({ lemma }) => lemma.canonicalForm === text)
					.map(({ lemma, reading }) => [
						lemma.kind,
						field(lemma.coreFeatures, "pronType"),
						reading.emojiDescription,
					]),
				text,
			).toEqual([["ADV", "Dem", emoji]]);
	});

	test("authors the her- and hin- adverbs as one ADV with no pronType and one Reading", () => {
		for (const [text, emoji] of [
			["heraus", "🐣"],
			["hinaus", "🚪🏃"],
			["herein", "🚪🤗"],
			["hinein", "📥"],
			["herüber", "🌉👋"],
			["hinüber", "🌉🚶"],
			["herunter", "🪂"],
			["hinunter", "🏂"],
			["herauf", "🧗"],
			["hinauf", "🪜"],
			["heran", "🧲"],
		] as const)
			expect(
				authoredMembers
					.filter(({ lemma }) => lemma.canonicalForm === text)
					.map(({ lemma, reading }) => [
						lemma.kind,
						field(lemma.coreFeatures, "pronType"),
						reading.emojiDescription,
					]),
				text,
			).toEqual([["ADV", null, emoji]]);
	});

	test("authors no colloquial r- adverb and no hinan", () => {
		for (const text of [
			"raus",
			"rein",
			"rüber",
			"runter",
			"rauf",
			"ran",
			"hinan",
		])
			expect(
				authoredMembers.filter(
					({ lemma }) => lemma.canonicalForm === text,
				),
				text,
			).toEqual([]);
	});

	test("authors nicht as one PART with polarity Neg and one Reading, never an ADV", () => {
		expect(
			authoredMembers
				.filter(({ lemma }) => lemma.canonicalForm === "nicht")
				.map(({ lemma, reading }) => [
					lemma.kind,
					field(lemma.coreFeatures, "polarity"),
					reading.emojiDescription,
				]),
		).toEqual([["PART", "Neg", "🚫"]]);
	});

	test("authors softening mal as a PART of its own with one Reading, not a spelling of einmal", () => {
		expect(
			authoredMembers
				.filter(({ lemma }) => lemma.canonicalForm === "mal")
				.map(({ lemma, reading }) => [
					lemma.kind,
					field(lemma.coreFeatures, "polarity"),
					reading.emojiDescription,
				]),
		).toEqual([["PART", null, "🤏"]]);
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
		expect(modalVerbs).toEqual([
			"dürfen",
			"können",
			"mögen",
			"müssen",
			"sollen",
			"wollen",
		]);
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

describe("German PART (#734)", () => {
	const modal = [
		"aber",
		"auch",
		"bloß",
		"denn",
		"doch",
		"eben",
		"eigentlich",
		"einfach",
		"einmal",
		"etwa",
		"halt",
		"ja",
		"mal",
		"nur",
		"ruhig",
		"schon",
		"vielleicht",
		"wohl",
	];
	const type = ({ lemma }: AuthoredMember) => {
		const core = lemma.coreFeatures as Readonly<Record<string, unknown>>;
		return `${lemma.canonicalForm} ${String(core.partType ?? core.polarity)}`;
	};

	test("is fully authored: nicht, infinitive zu and the modal particles", () => {
		const parts = authoredMembers.filter(
			({ lemma }) => lemma.kind === "PART",
		);
		expect(parts).toEqual([...germanParticles]);
		expect([...new Set(parts.map(type))].toSorted()).toEqual(
			[
				"nicht Neg",
				"zu Inf",
				...modal.map((form) => `${form} Mod`),
			].toSorted(),
		);
	});

	const attestation = (
		canonicalForm: string,
		coreFeatures: Readonly<Record<string, string | null>>,
	) => {
		const parsed = parseUnit({
			unitKind: "Attestation",
			members: [{ attested: canonicalForm, orthography: "Standard" }],
			realizationCoverage: "Full",
			surface: {
				unitKind: "Surface",
				language: "de",
				normalizedSurface: canonicalForm,
				spelling: { kind: "Canonical" },
				surfaceFeatures: null,
				lemma: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "PART",
					canonicalForm,
					coreFeatures: {
						partType: null,
						polarity: null,
						...coreFeatures,
					},
				},
			},
		});
		if (!parsed.success || parsed.chain.unitKind !== "Attestation")
			throw Error(`Expected a PART Attestation of ${canonicalForm}`);
		return parsed.chain.value;
	};

	test("the closed-PART check passes an authored PART and fails any other", () => {
		expect(
			attestationParticleIssues(attestation("ja", { partType: "Mod" })),
		).toEqual([]);
		expect(
			attestationParticleIssues(
				attestation("nicht", { polarity: "Neg" }),
			),
		).toEqual([]);
		expect(
			attestationParticleIssues(attestation("zu", { partType: "Inf" })),
		).toEqual([]);
		// A focus or degree word is ADV, and zu is no modal particle.
		for (const [form, core] of [
			["sogar", { partType: "Mod" }],
			["zu", { partType: "Mod" }],
			["ja", { polarity: "Neg" }],
		] as const)
			expect(
				attestationParticleIssues(attestation(form, core)).map(
					({ path }) => path,
				),
			).toEqual(["surface.lemma"]);
		expect(
			germanParticleMember({
				canonicalForm: "Doch",
				coreFeatures: { partType: "Mod", polarity: null },
			})?.lemma.canonicalForm,
		).toBe("doch");
	});
});
