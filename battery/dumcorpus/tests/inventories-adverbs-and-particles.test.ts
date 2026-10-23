import { describe, expect, test } from "bun:test";
import { parseUnit } from "dumling";
import { attestationParticleIssues } from "../src/de/check-particles.js";
import {
	type AuthoredMember,
	authoredMembers,
	germanParticleMember,
	germanParticles,
} from "../src/inventories.js";
import { field } from "./inventory-helpers.js";

describe("the German authored inventory", () => {
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

	test("authors herum as one ADV with no series marker and an around and an over Reading", () => {
		expect(
			authoredMembers
				.filter(({ lemma }) => lemma.canonicalForm === "herum")
				.map(({ lemma, reading }) => [
					lemma.kind,
					lemma.coreFeatures,
					reading.emojiDescription,
				]),
		).toEqual([
			["ADV", { comparable: null }, "🔄"],
			["ADV", { comparable: null }, "⌛"],
		]);
	});

	test("authors no colloquial r- adverb and no hinan", () => {
		for (const text of [
			"raus",
			"rein",
			"rüber",
			"runter",
			"rauf",
			"ran",
			"rum",
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
		if (
			!parsed.success ||
			parsed.chain.unitKind !== "Attestation" ||
			parsed.chain.language !== "de"
		)
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
