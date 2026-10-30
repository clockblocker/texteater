import { describe, expect, test } from "bun:test";
import {
	foldCase,
	isSyncreticUnit,
	isSyncretism,
	lemmaIdentityKey,
	syncretismView,
} from "dumling";
import type * as Dumling from "dumling/types";
import { translationText } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { authoredReadingIssues } from "../src/check-authored-readings.js";
import { syncretismDefinitions } from "../src/inventories/de/syncretism-definitions.js";
import { syncretismFor } from "../src/inventories/de/syncretisms.js";
import {
	type AuthoredMember,
	authoredMembers,
	authoredRealizations,
	referentCanLeaveOpen,
	stemSyncretisms,
} from "../src/inventories.js";
import { name } from "./inventory-helpers.js";

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
		(
			(
				translations as Readonly<
					Record<string, readonly Dumrel.Translation[]>
				>
			)?.[language] ?? []
		).map(translationText);
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
										translationText(gloss),
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

describe("the German stem Surface Syncretisms (system ADR 0046)", () => {
	const generated = [...stemSyncretisms.values()];
	const labels = generated.map(
		({ member, spelled, cells }) =>
			`${member.lemma.canonicalForm} ${spelled} ${cells[0].case} ${cells.map(({ gender }) => gender).join("/")}`,
	);

	test("the gender-only cells of jeder, keiner and mancher each get one", () => {
		expect(labels).toContain("jeder jedem Dat Masc/Neut");
		expect(labels).toContain("keiner keinem Dat Masc/Neut");
		expect(labels).toContain("keiner keines Gen Masc/Neut");
		expect(labels).toContain("mancher manchem Dat Masc/Neut");
		expect(labels).toContain("mancher manches Gen Masc/Neut");
	});

	test("each holds cells of one case and number that differ in gender alone", () => {
		for (const { cells } of generated) {
			expect(new Set(cells.map((cell) => cell.case)).size).toBe(1);
			expect(new Set(cells.map((cell) => cell.number)).size).toBe(1);
			expect(new Set(cells.map((cell) => cell.gender)).size).toBe(
				cells.length,
			);
		}
	});

	test("alle's singular ones exist, but no open referent attests them", () => {
		expect(labels).toContain("alle allem Dat Masc/Neut");
		expect(labels).toContain("alle alles Gen Masc/Neut");
		expect(
			generated
				.filter((syncretism) => !referentCanLeaveOpen(syncretism))
				.map(
					({ member, spelled }) =>
						`${member.lemma.canonicalForm} ${spelled}`,
				)
				.toSorted(),
		).toEqual(["alle allem", "alle alles"]);
	});

	test("cells that differ in case or number get none", () => {
		// keine is Fem Sing or Plur; keines Nom and Acc Neut differ in case.
		expect(labels.filter((label) => / keine /u.test(label))).toEqual([]);
		expect(
			generated.filter(
				({ member, spelled, cells }) =>
					member.lemma.canonicalForm === "keiner" &&
					spelled === "keines" &&
					cells[0].case !== "Gen",
			),
		).toEqual([]);
		// A pillar's cells get Lemma Syncretisms instead (ihm).
		expect(
			generated.filter(
				({ member }) => member.lemma.canonicalForm === "er",
			),
		).toEqual([]);
	});
});
