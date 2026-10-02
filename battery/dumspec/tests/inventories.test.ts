import { describe, expect, test } from "bun:test";
import {
	foldCase,
	isSyncreticUnit,
	isSyncretism,
	lemmaIdentityKey,
	parseUnit,
	syncretismView,
} from "dumling";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge, selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { frameAdpositionCaseIssues } from "../src/check-adposition-cases.js";
import {
	attestationParticleIssues,
	authoredReadingIssues,
	loadSpecRecords,
} from "../src/index.js";
import { syncretismDefinitions } from "../src/inventories/de/syncretism-definitions.js";
import {
	type AuthoredMember,
	type AuthoredRealization,
	authoredMembers,
	authoredRealizations,
	closedVerbFormSpellings,
	closedVerbForms,
	germanParticleMember,
	germanParticles,
	modalVerbs,
	reflexiveDrillDown,
	reflexivityUnit,
	subjectExpletiveEs,
	syncretismFor,
} from "../src/inventories.js";

const name = ({ lemma, reading }: AuthoredMember) =>
	`${lemma.kind}/${lemma.canonicalForm} ${reading.emojiDescription} ${JSON.stringify(lemma.coreFeatures)}`;

/**
 * The Surface a stem PRON's spelling realizes, marking the cell it names. A
 * Locution PRON (was für einer) marks no possessor features.
 */
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
			...(lemma.family === "Lexeme"
				? { "gender[psor]": null, "number[psor]": null }
				: {}),
			...cell,
		},
	};
}

/** A route's inflectional bag with nothing marked, for a stem's cell. */
function emptyBag({ family, kind }: AuthoredMember["lemma"]) {
	if (family === "Locution")
		return { case: null, gender: null, number: null };
	return {
		case: null,
		...(kind === "DET" ? { degree: null } : {}),
		gender: null,
		"gender[psor]": null,
		number: null,
		"number[psor]": null,
	};
}

/**
 * The one-member Attestation a realization with a spelling builds: its
 * Surface spells the word the member stands for, and a Fused piece sits in a
 * sample host word (gehts).
 */
function realizationAttestation({
	member,
	spelled,
	spelling,
	historicalStatus,
	orthography,
	standsFor,
	inflection,
}: AuthoredRealization) {
	const { lemma } = member;
	return {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "de",
			lemma,
			normalizedSurface: standsFor ?? spelled,
			spelling,
			surfaceFeatures: historicalStatus ? { historicalStatus } : null,
			inflectionalFeatures: inflection
				? { ...emptyBag(lemma), ...inflection }
				: null,
		},
		members: [
			orthography === "Fused"
				? {
						attested: spelled,
						orthography,
						fusion: {
							spelling: `geht${spelled}`,
							components: [
								{ span: "geht", surface: "geht" },
								{ span: spelled, surface: standsFor },
							],
						},
						component: 1,
					}
				: { attested: spelled, orthography: orthography ?? "Standard" },
		],
		realizationCoverage: "Full",
		// The evidence fields the route's Attestation holds, here empty.
		...(lemma.kind === "AUX"
			? { expletiveEvidence: null, valencyEvidence: [] }
			: lemma.kind === "PRON" && lemma.family === "Lexeme"
				? { articleEvidence: null }
				: {}),
	};
}

function field(value: unknown, key: string): unknown {
	return value && typeof value === "object" && key in value
		? (value as Record<string, unknown>)[key]
		: undefined;
}

/** A Locution may have no Locution Type (ADR 0039); ReviewedEmpty records that. */
const optionalAspects = new Set(["locutionType"]);

/**
 * The aspects an authored member leaves incomplete (system ADR 0021): every
 * aspect the route's Knowledge policy selects is stored and marked Authored,
 * an optional one may be ReviewedEmpty instead, and each semantic relation
 * is Authored with claims or ReviewedEmpty.
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
			const reviewedNone =
				optionalAspects.has(aspect) &&
				content === undefined &&
				coverage === "ReviewedEmpty";
			if (
				!reviewedNone &&
				(content === undefined || coverage !== "Authored")
			)
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

	test("every realization with a spelling builds a Surface and member Dumling accepts (ADR 0041, ADR 0035)", () => {
		const spelled = authoredRealizations.filter(
			(realization) => realization.spelling !== undefined,
		);
		expect(spelled.length).toBeGreaterThan(1000);
		const failures = spelled.flatMap((realization) => {
			if (
				(realization.orthography === undefined) !==
				(realization.standsFor === undefined)
			)
				return [
					`${realization.spelled}: orthography without standsFor`,
				];
			const parsed = parseUnit(realizationAttestation(realization));
			return parsed.success
				? []
				: [
						`${name(realization.member)} ${realization.spelled}: ${parsed.error.message}`,
					];
		});
		expect(failures).toEqual([]);
	});

	test("tags the spellings gold or a Rule fixes and leaves the rest unclassified", () => {
		// inCase names a cell's case, or null for a spelling with no cell.
		const tagsOf = (
			spelled: string,
			kind: string,
			inCase?: string | null,
		) => [
			...new Set(
				authoredRealizations
					.filter(
						(realization) =>
							realization.spelled === spelled &&
							realization.member.lemma.kind === kind &&
							(inCase === undefined ||
								(realization.inflection?.case ?? null) ===
									inCase),
					)
					.map(
						({
							member,
							spelling,
							historicalStatus,
							orthography,
							standsFor,
						}) =>
							[
								member.lemma.canonicalForm,
								spelling?.kind === "Variant"
									? spelling.variantTags.join(" ")
									: (spelling?.kind ?? "none"),
								...(historicalStatus ? [historicalStatus] : []),
								...(orthography
									? [orthography, standsFor]
									: []),
							].join(" "),
					),
			),
		];
		// Gold spells nix and standalone derer as Licensed Variants.
		expect(tagsOf("nix", "PRON")).toEqual(["nichts Licensed"]);
		expect(tagsOf("derer", "PRON")).toEqual([
			"deren Licensed",
			"derer Canonical",
		]);
		// Shortened articles and clitic s are member orthographies
		// (de/member-orthography); the Surface is the full word.
		for (const [short, article] of [
			["n", "ein"],
			["ne", "eine"],
			["nen", "einen"],
			["nem", "einem"],
			["ner", "einer"],
		] as const)
			expect(tagsOf(short, "DET")).toEqual([
				`${article} Canonical Shorthand ${article}`,
			]);
		expect(tagsOf("s", "PRON")).toEqual(["es Canonical Fused es"]);
		// ward is Canonical and Archaic (de/variant-and-historical-status);
		// gold has hätt as the Shorthand of hätte.
		expect(tagsOf("ward", "AUX")).toEqual(["werden Canonical Archaic"]);
		expect(tagsOf("wardst", "AUX")).toEqual(["werden Canonical Archaic"]);
		expect(tagsOf("hätt", "AUX")).toEqual([
			"haben Canonical Shorthand hätte",
		]);
		expect(tagsOf("hat", "AUX")).toEqual(["haben Canonical"]);
		// A closed modal form spelled with ß before the 1996 reform is a
		// Historical Variant, as gold has muß.
		const historical = (closedVerbForms.müssen ?? []).filter(
			(form) =>
				closedVerbFormSpellings[form]?.spelling?.kind === "Variant",
		);
		expect(historical).toContain("muß");
		expect(historical.every((form) => form.includes("ß"))).toBe(true);
		expect(closedVerbFormSpellings.muß?.spelling).toEqual({
			kind: "Variant",
			variantTags: ["Historical"],
		});
		expect(closedVerbFormSpellings.ward?.historicalStatus).toBe("Archaic");
		// AUX hab is the 1sg, the Shorthand of habe; VERB haben's hab is
		// also the imperative, plainly Canonical (user ruling, 2026-10-02).
		expect(tagsOf("hab", "AUX")).toEqual([
			"haben Canonical Shorthand habe",
		]);
		expect(closedVerbFormSpellings.hab).toBeUndefined();
		// A table's other accepted forms of a cell are Licensed Variants
		// beside the cell's Canonical form (user ruling, 2026-10-02).
		for (const [spelled, kind, inCase, lemma] of [
			["eins", "PRON", undefined, "eines"],
			["keins", "PRON", "Nom", "keiner"],
			["irgendeins", "PRON", "Acc", "irgendeiner"],
			["was für eins", "PRON", "Nom", "was für einer"],
			["meins", "PRON", "Nom", "meiner"],
			["dies", "PRON", "Acc", "dieser"],
			["unsre", "DET", "Nom", "unser"],
			["euern", "DET", "Dat", "euer"],
			["unsrer", "PRON", "Gen", "unserer"],
			["jeden", "DET", "Gen", "jeder"],
			["jedweden", "DET", "Gen", "jedweder"],
			["jeglichen", "DET", "Gen", "jeglicher"],
			["einiges", "DET", "Gen", "einige"],
			["jemand", "PRON", "Acc", "jemand"],
			["niemand", "PRON", "Dat", "niemand"],
			["jemands", "PRON", "Gen", "jemand"],
		] as const)
			expect(tagsOf(spelled, kind, inCase)).toEqual([
				`${lemma} Licensed`,
			]);
		// selben in im selben is a Fused-piece remainder of demselben (ADR
		// 0035), no spelling.
		expect(tagsOf("selben", "DET")).toEqual([]);
		expect(tagsOf("selbe", "DET")).toEqual([]);
		// The possessive PRON has no weak forms: after an article the weak
		// possessive is ADJ, so der meine gives ADJ meine
		// (de/possessive-after-article; decided by agents under the user's
		// delegation, 2026-10-02).
		expect(tagsOf("meinen", "PRON", "Gen")).toEqual([]);
		expect(tagsOf("unsren", "PRON", "Nom")).toEqual([]);
		expect(tagsOf("meine", "PRON", "Nom")).toEqual(["meiner Canonical"]);
		expect(
			authoredRealizations.filter(
				({ member, spelled, inflection }) =>
					member.lemma.kind === "PRON" &&
					member.lemma.canonicalForm === "meiner" &&
					spelled === "meine" &&
					inflection?.gender === "Masc",
			),
		).toEqual([]);
		// Bare PRON viel and wenig are Canonical with no cell, as DET viel's
		// uninflected spelling is; vieles, vielem and weniges keep their cells
		// (decided by agents under the user's delegation, 2026-10-02).
		for (const stem of ["viel", "wenig"]) {
			expect(tagsOf(stem, "PRON", null)).toEqual([`${stem} Canonical`]);
			expect(tagsOf(stem, "PRON", "Acc")).toEqual([]);
		}
		expect(tagsOf("vieles", "PRON", "Nom")).toEqual(["viel Canonical"]);
		expect(tagsOf("vielem", "PRON", "Dat")).toEqual(["viel Canonical"]);
		expect(tagsOf("weniges", "PRON", "Acc")).toEqual(["wenig Canonical"]);
		// mehr and weniger are the comparatives of DET viel and wenig.
		expect(tagsOf("weniger", "DET", null)).toEqual(["wenig Canonical"]);
		expect(tagsOf("mehr", "DET", null)).toEqual(["viel Canonical"]);
		// PRON beiden is the Dat cell's own form only: weak beiden follows
		// an article, where beide is ADJ (de/pron-or-det-by-use).
		expect(tagsOf("beiden", "PRON", "Dat")).toEqual(["beide Canonical"]);
		expect(tagsOf("beiden", "PRON", "Nom")).toEqual([]);
	});

	test("DET and PRON beide have no weak beiden, which stands only after a determiner (de/pron-or-det-by-use)", () => {
		const beidenCells = (kind: string) =>
			authoredRealizations
				.filter(
					({ member, spelled }) =>
						member.lemma.kind === kind &&
						member.lemma.canonicalForm === "beide" &&
						spelled === "beiden",
				)
				.map(({ inflection }) => inflection?.case);
		expect(beidenCells("DET")).toEqual(["Dat"]);
		expect(beidenCells("PRON")).toEqual(["Dat"]);
	});

	test("PRON and DET share their series markers with the adverbs: relative 🧩, total 🌐, irgend- ❔, beide 2⃣ (ADR 0029)", () => {
		const emojiOf = (kind: string, pronType: string) =>
			new Set(
				authoredMembers
					.filter(
						({ lemma }) =>
							lemma.kind === kind &&
							field(lemma.coreFeatures, "pronType") === pronType,
					)
					.map(({ reading }) => reading.emojiDescription),
			);
		for (const kind of ["PRON", "DET"]) {
			for (const emoji of emojiOf(kind, "Rel"))
				expect(emoji.startsWith("🧩"), `${kind} ${emoji}`).toBe(true);
			expect(
				[...emojiOf(kind, "Tot")].filter((emoji) => emoji !== "2⃣"),
				kind,
			).toEqual(["🌐"]);
		}
		const readingsOf = (kind: string, text: string) =>
			authoredMembers
				.filter(
					({ lemma }) =>
						lemma.kind === kind && lemma.canonicalForm === text,
				)
				.map(({ reading }) => reading.emojiDescription);
		expect(readingsOf("DET", "irgendein")).toEqual(["❔"]);
		expect(readingsOf("DET", "irgendwelcher")).toEqual(["❔"]);
		expect(readingsOf("PRON", "irgendeiner")).toEqual(["❔"]);
		expect(readingsOf("PRON", "irgendwelcher")).toEqual(["❔"]);
		expect(readingsOf("DET", "beide")).toEqual(["2⃣"]);
		expect(readingsOf("PRON", "beide")).toEqual(["2⃣"]);
		// Infinitive zu keeps 🔗, as the mit of damit and womit does.
		expect(readingsOf("PART", "zu")).toEqual(["🔗"]);
		// Both perfect auxiliaries are 🏁.
		expect(
			authoredMembers
				.filter(
					({ lemma, knowledge }) =>
						lemma.kind === "AUX" &&
						knowledge.definition?.includes("Perfekt"),
				)
				.map(({ lemma, reading }) =>
					[lemma.canonicalForm, reading.emojiDescription].join(" "),
				)
				.toSorted(),
		).toEqual(["haben 🏁", "sein 🏁"]);
	});

	test("settles the determiner Lemmas the user ruled on 2026-10-02 (system ADR 0032)", () => {
		const readingsOf = (kind: string, text: string) =>
			authoredMembers
				.filter(
					({ lemma }) =>
						lemma.kind === kind && lemma.canonicalForm === text,
				)
				.map(({ lemma, reading }) =>
					[
						field(lemma.coreFeatures, "pronType"),
						reading.emojiDescription,
					]
						.filter(Boolean)
						.join(" "),
				);
		// Exclamative welch is a Reading of interrogative welcher, and Exc left
		// German DET; uninflected welch spells welcher without a cell.
		expect(readingsOf("DET", "welcher")).toEqual([
			"Int ❓",
			"Int ❗",
			"Rel 🧩",
		]);
		expect(readingsOf("DET", "welch")).toEqual([]);
		const uninflected = (kind: string, spelled: string) =>
			authoredRealizations
				.filter(
					(realization) =>
						realization.member.lemma.kind === kind &&
						realization.spelled === spelled &&
						!realization.inflection,
				)
				.map(({ member }) => member.reading.emojiDescription);
		expect(uninflected("DET", "welch")).toEqual(["❓", "❗"]);
		// mehr and weniger are the Cmp of DET viel and wenig; standing alone
		// they are PRON Lemmas, since PRON has no degree.
		for (const text of [
			"mehr",
			"weniger",
			"wieviel",
			"wievielte",
			"manch",
			"selber",
		])
			expect(readingsOf("DET", text), text).toEqual([]);
		expect(
			authoredRealizations
				.filter(
					({ member, spelled, inflection }) =>
						member.lemma.kind === "DET" &&
						["mehr", "weniger"].includes(spelled) &&
						inflection?.degree,
				)
				.map(({ member, spelled, inflection }) => [
					spelled,
					member.lemma.canonicalForm,
					inflection,
				]),
		).toEqual([
			["mehr", "viel", { degree: "Cmp" }],
			["weniger", "wenig", { degree: "Cmp" }],
		]);
		expect(readingsOf("PRON", "mehr")).toEqual(["Ind ➕"]);
		expect(readingsOf("PRON", "weniger")).toEqual(["Ind ➖"]);
		// viel and wenig cite their bare form as DET and PRON; uninflected
		// manch spells DET mancher.
		for (const kind of ["DET", "PRON"]) {
			expect(readingsOf(kind, "viel"), kind).toEqual(["Ind 🔢"]);
			expect(readingsOf(kind, "wenig"), kind).toEqual(["Ind ➖"]);
			expect(readingsOf(kind, "viele"), kind).toEqual([]);
		}
		expect(uninflected("DET", "manch")).toEqual(["🔢"]);
		// Emphatic selbst and selber are ADVs; selbst also means 'even'.
		expect(readingsOf("ADV", "selbst")).toEqual(["🫵", "😮"]);
		expect(readingsOf("ADV", "selber")).toEqual(["🫵"]);
		expect(
			authoredMembers.find(
				({ lemma }) => lemma.canonicalForm === "selber",
			)?.knowledge.semanticRelations?.synonym,
		).toEqual([
			expect.objectContaining({ kind: "ADV", canonicalForm: "selbst" }),
		]);
	});

	test("authors etwas as an invariant Ind DET and PRON (de/pron-or-det-by-use)", () => {
		const etwas = authoredMembers.filter(
			({ lemma }) => lemma.canonicalForm === "etwas",
		);
		expect(
			etwas.map(({ lemma, reading }) => [
				lemma.kind,
				field(lemma.coreFeatures, "pronType"),
				reading.emojiDescription,
			]),
		).toEqual([
			["DET", "Ind", "📦"],
			["PRON", "Ind", "📦"],
		]);
		expect(
			authoredRealizations
				.filter(({ member }) => etwas.includes(member))
				.map(({ spelled, inflection }) => [
					spelled,
					inflection ?? null,
				]),
		).toEqual([
			["etwas", null],
			["etwas", null],
		]);
	});

	test("the authored-Reading check fails a Reading an authored Lemma lacks (ADR 0021)", () => {
		const ja = germanParticleMember({
			canonicalForm: "ja",
			coreFeatures: { partType: "Mod", polarity: null },
		});
		if (!ja) throw Error("ja is authored");
		const reading = (canonicalForm: string, emojiDescription: string) =>
			({
				...ja.reading,
				lemma: { ...ja.lemma, canonicalForm },
				emojiDescription,
			}) as Dumling.Reading;
		expect(authoredReadingIssues(reading("ja", "🤝"))).toEqual([]);
		expect(
			authoredReadingIssues(reading("ja", "🎉")).map(({ path }) => path),
		).toEqual(["reading.emojiDescription"]);
		// A Lemma no member is has no authored Readings to name.
		expect(authoredReadingIssues(reading("sogar", "🎉"))).toEqual([]);
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
		// no two of one pillar share every Core Feature. Never accept a
		// collision here without an ADR that names it. The der and ein article
		// tables are two pillars with the same cells, which their spellings
		// tell apart, so each is checked on its own (ADR 0032). A Syncretism
		// is no cell: its syncretic list keeps its identity apart even where
		// its Core equals a cell's (ADR 0046).
		const coordinates = ["case", "number", "gender"];
		const pillar = ({
			kind,
			canonicalForm,
			coreFeatures,
		}: AuthoredMember["lemma"]) =>
			kind === "DET" &&
			(coreFeatures as { pronType?: string }).pronType === "Art"
				? canonicalForm.startsWith("ein")
					? "ein"
					: "der"
				: kind;
		const groups = new Map<string, Set<string>>();
		for (const { lemma } of authoredMembers) {
			if (
				(lemma.kind !== "PRON" && lemma.kind !== "DET") ||
				isSyncreticUnit(lemma)
			)
				continue;
			const core = Object.entries(lemma.coreFeatures).filter(
				([, value]) => value !== null,
			);
			if (!core.some(([key]) => coordinates.includes(key))) continue;
			const key = `${pillar(lemma)} ${core
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

	test("ihm, seiner, dem, dessen, einem and eines are a Masc and a Neut cell each, and no other pillar cell is split by gender alone (system ADR 0044)", () => {
		// The referent chooses between cells that differ only in gender, and
		// a referent no text settles attests their Syncretism (ADR 0046).
		// Every PRON with case in Core is a pillar cell: personal, der-series
		// or einer. A Syncretism is no cell.
		const byRest = new Map<
			string,
			{ label: string; genders: Set<string> }
		>();
		for (const { lemma } of authoredMembers) {
			if (lemma.kind !== "PRON" || isSyncreticUnit(lemma)) continue;
			const { gender, ...rest } = lemma.coreFeatures as Readonly<
				Record<string, unknown>
			>;
			if ((rest.case ?? null) === null) continue;
			const key = `${lemma.canonicalForm} ${JSON.stringify(rest)}`;
			const entry = byRest.get(key) ?? {
				label: `${lemma.canonicalForm} ${String(rest.case)} ${String(rest.pronType)}`,
				genders: new Set(),
			};
			entry.genders.add(String(gender));
			byRest.set(key, entry);
		}
		expect(
			[...byRest.values()]
				.filter(({ genders }) => genders.size > 1)
				.map(
					({ label, genders }) =>
						`${label}: ${[...genders].toSorted().join(", ")}`,
				)
				.toSorted(),
		).toEqual([
			"dem Dat Dem: Masc, Neut",
			"dem Dat Rel: Masc, Neut",
			"dessen Gen Dem: Masc, Neut",
			"dessen Gen Rel: Masc, Neut",
			"einem Dat Ind: Masc, Neut",
			"eines Gen Ind: Masc, Neut",
			"ihm Dat Prs: Masc, Neut",
			"seiner Gen Prs: Masc, Neut",
		]);
	});

	test("derer is its own invariant Lemma pointing ahead and spells standalone deren elsewhere (system ADR 0044)", () => {
		// Demonstrative derer points ahead to a relative clause and has one
		// uninflected form. Wherever deren could stand alone instead, relative
		// or demonstrative pointing back, derer is a Licensed Variant of that
		// deren cell, and of the Syncretism of the two (ADR 0046). Attributive
		// and standalone deren are one Lemma, so the swap is judged per
		// occurrence: before a noun only deren stands.
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
			"deren Dem Gen null null",
			"deren Rel Gen Plur null",
			"deren Rel Gen Sing Fem",
			"deren Rel Gen null null",
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

	test("was für ein and was für einer are Locutions with no Locution Type (de/was-fuer)", () => {
		const locutions = authoredMembers.filter(
			({ lemma }) => lemma.family === "Locution",
		);
		expect(
			locutions.map(({ lemma, knowledge, coverage }) => ({
				route: `${lemma.kind} ${lemma.canonicalForm}`,
				core: lemma.coreFeatures,
				locutionType: knowledge.locutionType ?? null,
				coverage: coverage.locutionType,
			})),
		).toEqual(
			["DET was für ein", "PRON was für einer"].map((route) => ({
				route,
				core: {},
				locutionType: null,
				coverage: "ReviewedEmpty",
			})),
		);
		// Every spelling is a Surface Dumling accepts. Bare was für spells the
		// DET's plural cells and, before a mass noun, realizes it without one.
		const realizations = authoredRealizations.filter(({ member }) =>
			locutions.includes(member),
		);
		const failures = realizations.flatMap(
			({ member, spelled, inflection }) => {
				const parsed = parseUnit({
					unitKind: "Surface",
					language: "de",
					lemma: member.lemma,
					normalizedSurface: spelled,
					spelling: { kind: "Canonical" },
					surfaceFeatures: null,
					inflectionalFeatures: inflection ?? null,
				});
				return parsed.success
					? []
					: [`${name(member)} ${spelled}: ${parsed.error.message}`];
			},
		);
		expect(failures).toEqual([]);
		expect(
			realizations
				.filter(({ spelled }) => spelled === "was für")
				.map(({ member, inflection }) =>
					[
						member.lemma.kind,
						...(inflection
							? [inflection.case, inflection.number]
							: ["uninflected"]),
					].join(" "),
				),
		).toEqual([
			"DET Nom Plur",
			"DET Acc Plur",
			"DET Dat Plur",
			"DET Gen Plur",
			"DET uninflected",
		]);
	});

	test("jemand, niemand, wer and was are stems (system ADR 0032)", () => {
		const lemmasSpelled = (spelled: string) =>
			authoredRealizations
				.filter(
					(realization) =>
						realization.spelled === spelled &&
						realization.member.lemma.kind === "PRON" &&
						// A stem's Surface marks its cell; invariant
						// attributive wessen marks none.
						realization.inflection != null,
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
					field(lemma.coreFeatures, "pronType") === "Int",
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

	test("authors each w-adverb as one ADV with an interrogative and a relative Reading (system ADR 0029)", () => {
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
		for (const text of whAdverbs) {
			for (const { lemma } of readingsOf(text))
				expect(lemma.coreFeatures, text).toEqual({ comparable: null });
			expect(
				new Set(
					readingsOf(text).map(
						({ reading }) => [...reading.emojiDescription][0],
					),
				),
				text,
			).toEqual(new Set(["❓", "🧩"]));
		}
		// Relative wo has a place and a time Reading; every other use has one.
		expect(
			readingsOf("wo").map(({ reading }) => reading.emojiDescription),
		).toEqual(["❓📍", "🧩📍", "🧩🕰"]);
		expect(
			whAdverbs.filter((text) => text !== "wo").flatMap(readingsOf),
		).toHaveLength(2 * (whAdverbs.length - 1));
		// wieso, weshalb and weswegen claim warum as a synonym in each use.
		const weshalb = authoredMembers.find(
			({ lemma, reading }) =>
				lemma.canonicalForm === "weshalb" &&
				reading.emojiDescription.startsWith("🧩"),
		);
		expect(weshalb?.knowledge.semanticRelations).toEqual({
			synonym: [
				expect.objectContaining({
					canonicalForm: "warum",
					coreFeatures: { comparable: null },
				}),
			],
		});
	});

	test("authors each irgend- adverb as one ADV with one ❔ Reading", () => {
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
					.map(({ lemma, reading }) => [
						lemma.kind,
						lemma.coreFeatures,
						[...reading.emojiDescription][0],
					]),
				text,
			).toEqual([["ADV", { comparable: null }, "❔"]]);
	});

	test("authors the n-words nie, niemals, nirgends, nirgendwo and keineswegs as one ADV with one 🚫 Reading", () => {
		for (const [text, emoji] of [
			["nie", "🚫🕰"],
			["niemals", "🚫🕰"],
			["nirgends", "🚫📍"],
			["nirgendwo", "🚫📍"],
			["keineswegs", "🚫🔧"],
		] as const)
			expect(
				authoredMembers
					.filter(({ lemma }) => lemma.canonicalForm === text)
					.map(({ lemma, reading }) => [
						lemma.kind,
						lemma.coreFeatures,
						reading.emojiDescription,
					]),
				text,
			).toEqual([["ADV", { comparable: null }, emoji]]);
		const relationsOf = (text: string) =>
			authoredMembers.find(({ lemma }) => lemma.canonicalForm === text)
				?.knowledge.semanticRelations;
		for (const text of ["nie", "nirgends", "keineswegs"])
			expect(relationsOf(text), text).toBeUndefined();
		for (const [text, synonym] of [
			["niemals", "nie"],
			["nirgendwo", "nirgends"],
		] as const)
			expect(relationsOf(text), text).toEqual({
				synonym: [
					expect.objectContaining({
						canonicalForm: synonym,
						coreFeatures: { comparable: null },
					}),
				],
			});
	});

	test("authors the demonstratives da, hier, dort, dann and so with the Readings gold names and no marker", () => {
		const readingsOf = (text: string) =>
			authoredMembers
				.filter(
					({ lemma }) =>
						lemma.kind === "ADV" && lemma.canonicalForm === text,
				)
				.map(({ lemma, reading }) => {
					expect(lemma.coreFeatures).toEqual({ comparable: null });
					return reading.emojiDescription;
				});
		expect(readingsOf("da")).toEqual(["📍", "🕰"]);
		expect(readingsOf("hier")).toEqual(["📍"]);
		expect(readingsOf("dort")).toEqual(["📍"]);
		expect(readingsOf("dann")).toEqual(["🕰"]);
		expect(readingsOf("damals")).toEqual(["🕰"]);
		expect(readingsOf("so")).toEqual(["🔧"]);
		// daher and darum also name a reason, 'that's why': the 🤔 of warum.
		expect(readingsOf("daher")).toEqual(["🛫", "🤔"]);
		expect(readingsOf("darum")).toEqual(["🔄", "🤔"]);
		// The hier- pronominal adverbs carry no marker either: hierfür is 🎁,
		// like dafür.
		expect(readingsOf("hierfür")).toEqual(["🎁"]);
		expect(readingsOf("dafür")).toEqual(["🎁"]);
	});

	test("authors dahin, hierhin, hierher, dorthin and dorther as one ADV with one Reading", () => {
		for (const [text, emoji] of [
			["dahin", "🛬"],
			["hierhin", "🛬"],
			["hierher", "🛫"],
			["dorthin", "🛬"],
			["dorther", "🛫"],
		] as const)
			expect(
				authoredMembers
					.filter(({ lemma }) => lemma.canonicalForm === text)
					.map(({ lemma, reading }) => [
						lemma.kind,
						lemma.coreFeatures,
						reading.emojiDescription,
					]),
				text,
			).toEqual([["ADV", { comparable: null }, emoji]]);
	});

	test("authors a reciprocal pronominal adverb for each preposition but zwischen, 🤝 before the preposition's emoji (system ADR 0029)", () => {
		const reciprocals = authoredMembers.filter(
			({ lemma }) =>
				lemma.kind === "ADV" &&
				lemma.canonicalForm.endsWith("einander"),
		);
		expect(
			reciprocals.map(({ lemma }) => lemma.canonicalForm).toSorted(),
		).toEqual(
			[
				"an",
				"auf",
				"aus",
				"bei",
				"durch",
				"für",
				"gegen",
				"hinter",
				"in",
				"mit",
				"nach",
				"neben",
				"über",
				"um",
				"unter",
				"von",
				"vor",
				"zu",
			]
				.map((preposition) => `${preposition}einander`)
				.toSorted(),
		);
		for (const { lemma, reading } of reciprocals) {
			expect(lemma.kind, lemma.canonicalForm).toBe("ADV");
			expect(lemma.coreFeatures).toEqual({ comparable: null });
			expect(reading.emojiDescription.startsWith("🤝")).toBe(true);
		}
		const emojiOf = (text: string) =>
			authoredMembers
				.filter(({ lemma }) => lemma.canonicalForm === text)
				.map(({ reading }) => reading.emojiDescription);
		expect(emojiOf("miteinander")).toEqual(["🤝🔗"]);
		expect(emojiOf("damit")).toEqual(["🔗"]);
		// Standalone einander stays one PRON Lemma.
		expect(emojiOf("einander")).toEqual(["🤝"]);
	});

	test("authors ein wenig as one invariant Ind PRON with one Reading (de/quantifier-by-use)", () => {
		expect(
			authoredMembers
				.filter(({ lemma }) => lemma.canonicalForm === "ein wenig")
				.map(({ lemma, reading }) => [
					lemma.kind,
					lemma.coreFeatures as Readonly<Record<string, unknown>>,
					reading.emojiDescription,
				]),
		).toEqual([
			[
				"PRON",
				{
					person: null,
					polite: null,
					poss: null,
					pronType: "Ind",
					case: null,
					number: null,
					gender: null,
				},
				"🤏",
			],
		]);
	});

	test("authors the her- and hin- adverbs as one ADV with no series marker and one Reading", () => {
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
						lemma.coreFeatures,
						reading.emojiDescription,
					]),
				text,
			).toEqual([["ADV", { comparable: null }, emoji]]);
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
			lexicallyReflexive: "Acc" | "Dat" | null,
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
			verb("sich schämen", "Acc"),
			verb("sich einbilden", "Dat"),
		]) {
			expect(parseUnit(reflexive).success).toBe(true);
			expect(reflexiveDrillDown(reflexive)).toBe(reflexivityUnit);
		}
		expect(reflexiveDrillDown(verb("warten", null))).toBeUndefined();
	});
});

describe("the German pronoun Syncretisms (system ADR 0046)", () => {
	type Core = Readonly<Record<string, unknown>>;
	type Lemma = AuthoredMember["lemma"];
	type Pronoun = Dumling.Lemma<"de", "Lexeme", "PRON">;
	const coreOf = (lemma: Lemma): Core => lemma.coreFeatures;
	const syncreticOf = (lemma: Lemma): readonly string[] =>
		(lemma as { syncretic?: readonly string[] }).syncretic ?? [];
	const unitsOf = (lemma: Lemma): readonly Lemma[] =>
		(lemma as Pronoun).syncretized ?? [];
	/** A Syncretism member's Lemma, typed as the PRON Lemma it is. */
	const pronounOf = ({ lemma }: AuthoredMember) => lemma as Pronoun;
	const glossesOf = (
		{ translations }: Dumrel.ReadingKnowledge,
		language: string,
	): readonly string[] =>
		(translations as Readonly<Record<string, readonly string[]>>)?.[
			language
		] ?? [];
	const label = ({ lemma }: AuthoredMember) =>
		`${lemma.kind} ${lemma.canonicalForm} ${String(coreOf(lemma).case)} ${String(coreOf(lemma).pronType)}: ${syncreticOf(lemma).join(" ")}`;
	const fold = (lemma: Lemma) => foldCase(lemma.canonicalForm, "de");
	const syncretisms = authoredMembers.filter(({ lemma }) =>
		isSyncretism(lemma),
	);
	/** The pillar cells: PRON Lemmas with case in Core, one member each. */
	const cells = [
		...new Map(
			authoredMembers
				.filter(
					({ lemma }) =>
						lemma.family === "Lexeme" &&
						lemma.kind === "PRON" &&
						(coreOf(lemma).case ?? null) !== null &&
						!isSyncreticUnit(lemma),
				)
				.map((member) => [lemmaIdentityKey(member.lemma), member]),
		).values(),
	];
	/** The features only the referent settles: the only ones a Syncretism leaves open. */
	const referentFeatures = ["gender", "number", "polite"];
	const named = (text: string) => {
		const found = syncretisms.find((member) => label(member) === text);
		if (!found) throw Error(`No Syncretism ${text}`);
		return found;
	};

	test("every closed group of pillar cells that differ only in gender, number or politeness has exactly one Syncretism, and nothing else has one", () => {
		expect(syncretisms.map(label).toSorted()).toEqual([
			"PRON dem Dat Dem: gender",
			"PRON dem Dat Rel: gender",
			"PRON deren Gen Dem: gender number",
			"PRON deren Gen Rel: gender number",
			"PRON dessen Gen Dem: gender",
			"PRON dessen Gen Rel: gender",
			"PRON die Acc Dem: gender number",
			"PRON die Acc Rel: gender number",
			"PRON die Nom Dem: gender number",
			"PRON die Nom Rel: gender number",
			"PRON einem Dat Ind: gender",
			"PRON eines Gen Ind: gender",
			"PRON ihm Dat Prs: gender",
			"PRON ihnen Dat Prs: polite",
			"PRON ihrer Gen Prs: gender number",
			"PRON ihrer Gen Prs: gender number polite",
			"PRON ihrer Gen Prs: polite",
			"PRON seiner Gen Prs: gender",
			"PRON sie Acc Prs: gender number",
			"PRON sie Acc Prs: gender number polite",
			"PRON sie Acc Prs: polite",
			"PRON sie Nom Prs: gender number",
			"PRON sie Nom Prs: gender number polite",
			"PRON sie Nom Prs: polite",
		]);
		// A Syncretism leaves open only what the referent settles, and holds
		// every cell of its spelling that has the values it keeps: its group
		// is closed.
		const failures = syncretisms.flatMap((member) => {
			const { lemma } = member;
			const open = syncreticOf(lemma);
			const kept = Object.entries(coreOf(lemma)).filter(
				([feature]) => !open.includes(feature),
			);
			const closure = cells.filter(
				(cell) =>
					cell.lemma.kind === lemma.kind &&
					fold(cell.lemma) === fold(lemma) &&
					kept.every(
						([feature, value]) =>
							(coreOf(cell.lemma)[feature] ?? null) === value,
					),
			);
			return [
				...open
					.filter((feature) => !referentFeatures.includes(feature))
					.map(
						(feature) => `${label(member)}: leaves ${feature} open`,
					),
				...(closure
					.map(({ lemma }) => lemmaIdentityKey(lemma))
					.toSorted()
					.join() === unitsOf(lemma).map(lemmaIdentityKey).join()
					? []
					: [`${label(member)}: its group is not closed`]),
			];
		});
		expect(failures).toEqual([]);
		// The sentence's grammar settles every other shared spelling: case
		// (uns, euch, sich, es, das, einer), dative ihr against nominative
		// ihr, demonstrative or relative, and PRON or DET.
		const forms = new Set(syncretisms.map(({ lemma }) => fold(lemma)));
		for (const form of ["uns", "euch", "sich", "das", "es", "einer", "ihr"])
			expect(forms.has(form), form).toBe(false);
		expect(
			new Set(
				syncretisms.map(({ lemma }) => `${lemma.family}/${lemma.kind}`),
			),
		).toEqual(new Set(["Lexeme/PRON"]));
	});

	test("is spelled lowercase, and its units keep their own spelling", () => {
		for (const { lemma } of syncretisms)
			expect(lemma.canonicalForm).toBe(fold(lemma));
		expect(
			syncretisms
				.filter(({ lemma }) => syncreticOf(lemma).includes("polite"))
				.map(({ lemma }) =>
					[
						lemma.canonicalForm,
						...unitsOf(lemma)
							.map((unit) => unit.canonicalForm)
							.toSorted(),
					].join(" "),
				)
				.toSorted(),
		).toEqual([
			"ihnen Ihnen ihnen",
			"ihrer Ihrer ihrer",
			"ihrer Ihrer ihrer ihrer",
			"sie Sie sie",
			"sie Sie sie",
			"sie Sie sie sie",
			"sie Sie sie sie",
		]);
	});

	test("has its view's identity and no cell's, and syncretismFor finds it from either", () => {
		const cellKeys = new Set(
			authoredMembers
				.filter(({ lemma }) => !isSyncreticUnit(lemma))
				.map(({ lemma }) => lemmaIdentityKey(lemma)),
		);
		for (const member of syncretisms) {
			const view = syncretismView(pronounOf(member));
			expect(lemmaIdentityKey(view)).toBe(lemmaIdentityKey(member.lemma));
			expect(cellKeys.has(lemmaIdentityKey(member.lemma))).toBe(false);
			expect(syncretismFor(member.lemma)).toBe(member);
			expect(syncretismFor(view)).toBe(member);
			// Identity ignores letter case, so a capitalized answer finds it.
			expect(
				syncretismFor({
					...view,
					canonicalForm: member.lemma.canonicalForm.toUpperCase(),
				}),
			).toBe(member);
			// The stored list order is identity.
			expect(
				syncretismFor({
					...view,
					syncretic: syncreticOf(member.lemma).toReversed(),
				} as Pronoun),
			).toBe(syncreticOf(member.lemma).length === 1 ? member : undefined);
		}
		// No cell names a Syncretism, though ihnen that is 3pl or formal has
		// plain 3pl ihnen's Core.
		for (const { lemma } of authoredMembers)
			if (!isSyncreticUnit(lemma))
				expect(syncretismFor(lemma)).toBeUndefined();
		const ihnen = named("PRON ihnen Dat Prs: polite").lemma;
		const plain = cells.find(
			({ lemma }) =>
				lemma.canonicalForm === "ihnen" &&
				(coreOf(lemma).polite ?? null) === null,
		);
		expect(plain?.lemma.coreFeatures).toEqual(ihnen.coreFeatures);
		expect(cellKeys.has(lemmaIdentityKey(ihnen))).toBe(false);
	});

	test("takes its Reading and Knowledge from its units, with an authored definition where theirs differ", () => {
		const failures = syncretisms.flatMap((member) => {
			const keys = new Set(unitsOf(member.lemma).map(lemmaIdentityKey));
			const units = cells.filter(({ lemma }) =>
				keys.has(lemmaIdentityKey(lemma)),
			);
			const { knowledge } = member;
			const definitions = new Set(
				units.map((unit) => unit.knowledge.definition),
			);
			const authored = syncretismDefinitions[label(member)];
			return [
				...units
					.filter(
						(unit) =>
							unit.reading.emojiDescription !==
								member.reading.emojiDescription ||
							unit.knowledge.transcription !==
								knowledge.transcription ||
							!Object.entries(
								unit.knowledge.translations ?? {},
							).every(([language, glosses]) =>
								glosses?.every((gloss) =>
									glossesOf(knowledge, language).includes(
										gloss,
									),
								),
							),
					)
					.map((unit) => `${label(member)}: unlike ${name(unit)}`),
				...(definitions.size > 1 && authored === undefined
					? [`${label(member)}: its units' definitions differ`]
					: []),
				...(knowledge.definition ===
				(authored ?? [...definitions].join(" "))
					? []
					: [`${label(member)}: not its definition`]),
			];
		});
		expect(failures).toEqual([]);
	});

	test("the deren Syncretisms carry derer as a Licensed Variant, like their cells (system ADR 0044)", () => {
		const spellings = authoredRealizations
			.filter(({ member }) => syncretisms.includes(member))
			.map(({ member, spelled, spelling }) => ({
				syncretism: label(member),
				spelled,
				spelling,
			}));
		expect(spellings.filter(({ spelled }) => spelled !== "derer")).toEqual(
			syncretisms.map((member) => ({
				syncretism: label(member),
				spelled: member.lemma.canonicalForm,
				spelling: { kind: "Canonical" },
			})),
		);
		expect(spellings.filter(({ spelled }) => spelled === "derer")).toEqual(
			["Dem", "Rel"].map((pronType) => ({
				syncretism: `PRON deren Gen ${pronType}: gender number`,
				spelled: "derer",
				spelling: { kind: "Variant", variantTags: ["Licensed"] },
			})),
		);
	});

	test("a Reading of a Syncretism or its view names the generated member's Emoji Description (ADR 0021)", () => {
		const member = named("PRON sie Acc Prs: gender number");
		const reading = (lemma: Pronoun, emojiDescription: string) =>
			({
				unitKind: "Reading",
				lemma,
				emojiDescription,
			}) as Dumling.Reading;
		const { emojiDescription } = member.reading;
		for (const lemma of [
			pronounOf(member),
			syncretismView(pronounOf(member)),
		]) {
			expect(
				authoredReadingIssues(reading(lemma, emojiDescription)),
			).toEqual([]);
			expect(
				authoredReadingIssues(reading(lemma, "🎉")).map(
					({ path }) => path,
				),
			).toEqual(["reading.emojiDescription"]);
		}
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
