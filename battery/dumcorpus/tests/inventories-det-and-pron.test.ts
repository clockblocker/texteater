import { describe, expect, test } from "bun:test";
import { authoredMembers, authoredRealizations } from "../src/inventories.js";
import { field } from "./inventory-helpers.js";

describe("the German authored inventory", () => {
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
			// Bare was is the Shorthand of PRON etwas (de/bare-w-word-is-shorthand).
			["was", null],
		]);
	});

	test("authors ein wenig and ein paar as one invariant Ind PRON each with one Reading (de/quantifier-by-use)", () => {
		for (const [canonicalForm, emoji] of [
			["ein wenig", "🤏"],
			["ein paar", "🤏🔢"],
		] as const)
			expect(
				authoredMembers
					.filter(
						(member) =>
							member.lemma.canonicalForm === canonicalForm,
					)
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
					emoji,
				],
			]);
	});
});
