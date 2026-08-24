import { describe, expect, test } from "bun:test";
import {
	allFixedLemmaCatalogs,
	FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1,
	FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1,
	FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
	fixedMembersFor,
} from "dumling/fixed";
import {
	DE_LEXEME_AUX_V1_FIXED_KNOWLEDGE_COVERAGE,
	DE_LEXEME_DET_V1_FIXED_KNOWLEDGE_COVERAGE,
	fixedKnowledgeFor,
} from "../../src/fixed";
import {
	ParsingError,
	parseAsReadingKnowledge,
} from "../../src/parsing/lightweight-parsers";
import { propagateRelations } from "../../src/relations";

describe("fixed German Knowledge", () => {
	test("authors ordinary Knowledge for every fixed DET Reading", () => {
		const catalog = allFixedLemmaCatalogs().find(
			({ scope }) => scope === FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1,
		);
		expect(catalog).toBeDefined();
		for (const lemma of catalog?.members ?? []) {
			const readings = fixedMembersFor.reading(lemma);
			expect(readings?.members).toHaveLength(1);
			for (const reading of readings?.members ?? []) {
				const found = fixedKnowledgeFor(reading);
				expect(found.decision).toBe("Found");
				if (found.decision !== "Found") continue;
				expect(found.scope).toBe(FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1);
				expect(found.knowledge.transcription).toBeUndefined();
				expect(found.knowledge.definition).toBeTruthy();
				expect(found.knowledge.translations?.en.length).toBeGreaterThan(
					0,
				);
				const canonicalForm = reading.lemma.canonicalForm;
				if (["der", "die", "das"].includes(canonicalForm)) {
					expect(found.knowledge.semanticRelations?.targetKind).toBe(
						"reading",
					);
					expect(
						found.knowledge.semanticRelations?.synonym?.map(
							(target) => {
								if (!("lemma" in target)) {
									throw new Error(
										"Expected a Reading-targeted synonym.",
									);
								}
								return target.lemma.canonicalForm;
							},
						),
					).toEqual(
						["der", "die", "das"].filter(
							(target) => target !== canonicalForm,
						),
					);
					expect(found.coverage.semanticRelations.synonym).toBe(
						"Authored",
					);
					expect(found.coverage.semanticRelationTargetKind).toBe(
						"reading",
					);
				} else {
					expect(found.knowledge.semanticRelations).toBeUndefined();
					expect(found.coverage.semanticRelations.synonym).toBe(
						"ReviewedEmpty",
					);
				}
				expect(Object.isFrozen(found.knowledge)).toBe(true);
				const parsed = parseAsReadingKnowledge(found.knowledge);
				expect(parsed).not.toBeInstanceOf(ParsingError);
				expect(parsed).toEqual(found.knowledge);
			}
		}
	});

	test("records reviewed-empty relation coverage separately from Knowledge", () => {
		expect(DE_LEXEME_DET_V1_FIXED_KNOWLEDGE_COVERAGE).toEqual({
			transcription: "Unauthored",
			definition: "Authored",
			translations: { en: "Authored" },
			semanticRelationTargetKind: "lemma",
			semanticRelations: {
				synonym: "ReviewedEmpty",
				nearSynonym: "ReviewedEmpty",
				antonym: "ReviewedEmpty",
				nearAntonym: "ReviewedEmpty",
			},
		});
		expect(Object.isFrozen(DE_LEXEME_DET_V1_FIXED_KNOWLEDGE_COVERAGE)).toBe(
			true,
		);
	});

	test("authors fixed definitions and translations for every fixed PRON Reading", () => {
		const catalog = allFixedLemmaCatalogs().find(
			({ scope }) =>
				scope === FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
		);
		for (const lemma of catalog?.members ?? []) {
			const reading = fixedMembersFor.reading(lemma)?.members[0];
			if (!reading) throw new Error("Expected one fixed PRON Reading.");
			const found = fixedKnowledgeFor(reading);
			expect(found.decision).toBe("Found");
			if (found.decision !== "Found") continue;
			expect(found.scope).toBe(
				FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
			);
			expect(found.knowledge.definition).toBeTruthy();
			expect(found.knowledge.translations?.en.length).toBeGreaterThan(0);
			if (
				!["Dem", "Rel"].includes(
					(lemma.coreFeatures as Readonly<Record<string, unknown>>)
						.pronType as string,
				) &&
				!["keiner", "jedweder", "jeglicher"].includes(
					lemma.canonicalForm,
				)
			) {
				expect(found.knowledge.semanticRelations).toBeUndefined();
			}
			expect(parseAsReadingKnowledge(found.knowledge)).toEqual(
				found.knowledge,
			);
		}
	});

	test("authors exact demonstrative and relative Knowledge with within-population Reading Synonyms", () => {
		const members =
			fixedMembersFor.lemma({
				language: "de",
				family: "Lexeme",
				kind: "PRON",
			})?.members ?? [];
		const forms = [
			"der",
			"die",
			"das",
			"den",
			"dem",
			"dessen",
			"deren",
			"denen",
		];

		for (const pronType of ["Dem", "Rel"] as const) {
			const population = members.filter(
				(candidate) => candidate.coreFeatures.pronType === pronType,
			);
			expect(population).toHaveLength(8);
			for (const lemma of population) {
				const reading = fixedMembersFor.reading(lemma)?.members[0];
				if (!reading) throw new Error("Expected one fixed Reading.");
				const found = fixedKnowledgeFor(reading);
				expect(found.decision).toBe("Found");
				if (found.decision !== "Found") continue;
				expect(found.coverage).toMatchObject({
					semanticRelationTargetKind: "reading",
					semanticRelations: { synonym: "Authored" },
				});
				expect(found.knowledge).toMatchObject({
					definition:
						pronType === "Dem"
							? `Das Demonstrativpronomen „${lemma.canonicalForm}“ verweist betont auf eine im Kontext bestimmte Person oder Sache.`
							: `Das Relativpronomen „${lemma.canonicalForm}“ leitet einen Relativsatz ein und verweist auf dessen Bezugswort.`,
					translations: {
						en:
							pronType === "Dem"
								? ["that one", "this one"]
								: ["who", "which", "that"],
					},
					semanticRelations: { targetKind: "reading" },
				});
				const synonyms =
					found.knowledge.semanticRelations?.synonym ?? [];
				expect(
					synonyms.map((target) => {
						if (!("lemma" in target)) {
							throw new Error("Expected exact Reading target.");
						}
						return [
							target.lemma.canonicalForm,
							(
								target.lemma.coreFeatures as Readonly<
									Record<string, unknown>
								>
							).pronType,
						];
					}),
				).toEqual(
					forms
						.filter((form) => form !== lemma.canonicalForm)
						.map((form) => [form, pronType]),
				);
			}
		}
	});

	test("authors one plural-only mehrere Knowledge value without relations", () => {
		const lemma = fixedMembersFor
			.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
			?.members.find(
				(candidate) =>
					candidate.canonicalForm === "mehrere" &&
					candidate.coreFeatures.pronType === "Tot",
			);
		if (!lemma) throw new Error("Expected fixed mehrere Lemma.");
		const reading = fixedMembersFor.reading(lemma)?.members[0];
		if (!reading) throw new Error("Expected fixed mehrere Reading.");
		expect(fixedKnowledgeFor(reading)).toMatchObject({
			decision: "Found",
			knowledge: {
				definition:
					"Das Totalpronomen „mehrere“ bezeichnet eine unbestimmte Mehrzahl von Personen oder Sachen.",
				translations: { en: ["several", "multiple"] },
			},
		});
		const found = fixedKnowledgeFor(reading);
		if (found.decision !== "Found") {
			throw new Error("Expected fixed mehrere Knowledge.");
		}
		expect(found.knowledge.semanticRelations).toBeUndefined();
	});

	test("authors exact interrogative Knowledge without Semantic Synonyms", () => {
		const expectedTranslations = {
			wer: ["who"],
			wen: ["whom"],
			wem: ["whom"],
			wessen: ["whose"],
		} as const;
		const catalog = allFixedLemmaCatalogs().find(
			({ scope }) =>
				scope === FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
		);
		for (const [canonicalForm, translations] of Object.entries(
			expectedTranslations,
		)) {
			const lemma = catalog?.members.find(
				(candidate) => candidate.canonicalForm === canonicalForm,
			);
			if (!lemma)
				throw new Error(`Expected fixed ${canonicalForm} Lemma.`);
			const reading = fixedMembersFor.reading(lemma)?.members[0];
			if (!reading)
				throw new Error(`Expected fixed ${canonicalForm} Reading.`);
			const found = fixedKnowledgeFor(reading);
			expect(found.decision).toBe("Found");
			if (found.decision !== "Found") continue;
			expect(found.knowledge.definition).toContain(`„${canonicalForm}“`);
			expect(found.knowledge.translations?.en).toEqual([...translations]);
			expect(found.knowledge.semanticRelations).toBeUndefined();
		}
	});

	test("authors exact jemand Knowledge without Semantic Relations", () => {
		const lemma = allFixedLemmaCatalogs()
			.find(
				({ scope }) =>
					scope === FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
			)
			?.members.find(
				(candidate) =>
					candidate.family === "Lexeme" &&
					candidate.kind === "PRON" &&
					candidate.canonicalForm === "jemand" &&
					candidate.coreFeatures.pronType === "Ind",
			);
		if (!lemma) throw new Error("Expected fixed jemand Lemma.");
		const reading = fixedMembersFor.reading(lemma)?.members[0];
		if (!reading) throw new Error("Expected fixed jemand Reading.");

		expect(reading.emojiDescription).toBe("👤");
		expect(fixedKnowledgeFor(reading)).toMatchObject({
			decision: "Found",
			knowledge: {
				definition:
					"Das Indefinitpronomen „jemand“ verweist auf eine nicht näher bestimmte Person.",
				translations: { en: ["someone", "somebody"] },
			},
		});
		const found = fixedKnowledgeFor(reading);
		if (found.decision !== "Found")
			throw new Error("Expected fixed jemand Knowledge.");
		expect(found.knowledge.semanticRelations).toBeUndefined();
	});

	test("authors exact niemand Knowledge without Semantic Relations", () => {
		const lemma = fixedMembersFor
			.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
			?.members.find(
				(candidate) =>
					candidate.canonicalForm === "niemand" &&
					candidate.coreFeatures.pronType === "Neg",
			);
		if (!lemma) throw new Error("Expected fixed niemand Lemma.");
		const reading = fixedMembersFor.reading(lemma)?.members[0];
		if (!reading) throw new Error("Expected fixed niemand Reading.");

		expect(reading.emojiDescription).toBe("🚫");
		expect(fixedKnowledgeFor(reading)).toMatchObject({
			decision: "Found",
			knowledge: {
				definition:
					"Das Negativpronomen „niemand“ bezeichnet keine Person.",
				translations: { en: ["nobody", "no one"] },
			},
		});
		const found = fixedKnowledgeFor(reading);
		if (found.decision !== "Found")
			throw new Error("Expected fixed niemand Knowledge.");
		expect(found.knowledge.semanticRelations).toBeUndefined();
	});

	test("authors keiner Knowledge with exactly two Lemma-targeted Near Synonyms", () => {
		const lemma = fixedMembersFor
			.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
			?.members.find(({ canonicalForm }) => canonicalForm === "keiner");
		if (!lemma) throw new Error("Expected fixed keiner Lemma.");
		const reading = fixedMembersFor.reading(lemma)?.members[0];
		if (!reading) throw new Error("Expected fixed keiner Reading.");
		const found = fixedKnowledgeFor(reading);
		if (found.decision !== "Found")
			throw new Error("Expected keiner Knowledge.");
		expect(found.coverage.semanticRelations.nearSynonym).toBe("Authored");
		expect(found.knowledge).toEqual({
			definition:
				"Das Negativpronomen „keiner“ verneint die Zugehörigkeit zu einer im Kontext bestimmten Menge und kann sich auf Personen oder Sachen beziehen.",
			translations: { en: ["none", "no one"] },
			semanticRelations: {
				targetKind: "lemma",
				nearSynonym: expect.arrayContaining([
					expect.objectContaining({ canonicalForm: "niemand" }),
					expect.objectContaining({ canonicalForm: "nichts" }),
				]),
			},
		});
	});

	test("authors exact jedermann Knowledge without a relation to jeder", () => {
		const lemma = fixedMembersFor
			.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
			?.members.find(
				({ canonicalForm }) => canonicalForm === "jedermann",
			);
		if (!lemma) throw new Error("Expected fixed jedermann Lemma.");
		const reading = fixedMembersFor.reading(lemma)?.members[0];
		if (!reading) throw new Error("Expected fixed jedermann Reading.");
		const found = fixedKnowledgeFor(reading);
		if (found.decision !== "Found") throw new Error("Expected Knowledge.");
		expect(found.knowledge).toEqual({
			definition:
				"Das Totalpronomen „jedermann“ bezeichnet ausnahmslos jede Person einer betrachteten Gruppe.",
			translations: { en: ["everyone", "everybody"] },
		});
	});

	test("authors exact mancher Knowledge without Semantic Relations", () => {
		const lemma = fixedMembersFor
			.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
			?.members.find(({ canonicalForm }) => canonicalForm === "mancher");
		if (!lemma) throw new Error("Expected fixed mancher Lemma.");
		const reading = fixedMembersFor.reading(lemma)?.members[0];
		if (!reading) throw new Error("Expected fixed mancher Reading.");
		const found = fixedKnowledgeFor(reading);
		if (found.decision !== "Found") throw new Error("Expected Knowledge.");
		expect(found.knowledge).toEqual({
			definition:
				"Das Totalpronomen „mancher“ bezeichnet einen nicht vollständigen Teil einer im Kontext bestimmten Menge.",
			translations: { en: ["some", "many a one"] },
		});
	});

	test("authors exact total-pronoun Knowledge without Semantic Synonyms", () => {
		const expected = {
			alles: {
				definition:
					"Das Totalpronomen „alles“ bezeichnet die Gesamtheit in der Einzahl.",
				translations: ["everything", "all"],
			},
			alle: {
				definition:
					"Das Totalpronomen „alle“ bezeichnet die Gesamtheit in der Mehrzahl.",
				translations: ["all", "everyone"],
			},
		} as const;
		const catalog = allFixedLemmaCatalogs().find(
			({ scope }) =>
				scope === FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
		);

		for (const [canonicalForm, knowledge] of Object.entries(expected)) {
			const lemma = catalog?.members.find(
				(candidate) =>
					candidate.family === "Lexeme" &&
					candidate.kind === "PRON" &&
					candidate.canonicalForm === canonicalForm &&
					candidate.coreFeatures.pronType === "Tot",
			);
			if (!lemma)
				throw new Error(`Expected fixed ${canonicalForm} Lemma.`);
			const reading = fixedMembersFor.reading(lemma)?.members[0];
			if (!reading)
				throw new Error(`Expected fixed ${canonicalForm} Reading.`);
			const found = fixedKnowledgeFor(reading);
			expect(found.decision).toBe("Found");
			if (found.decision !== "Found") continue;
			expect(found.knowledge).toMatchObject({
				definition: knowledge.definition,
				translations: { en: knowledge.translations },
			});
			expect(found.knowledge.semanticRelations).toBeUndefined();
		}
	});

	test("authors exact nichts Knowledge without Semantic Relations", () => {
		const lemma = fixedMembersFor
			.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
			?.members.find(
				(candidate) =>
					candidate.canonicalForm === "nichts" &&
					candidate.coreFeatures.pronType === "Neg",
			);
		if (!lemma) throw new Error("Expected fixed nichts Lemma.");
		const reading = fixedMembersFor.reading(lemma)?.members[0];
		if (!reading) throw new Error("Expected fixed nichts Reading.");
		const found = fixedKnowledgeFor(reading);
		expect(found.decision).toBe("Found");
		if (found.decision !== "Found") return;
		expect(found.knowledge).toEqual({
			definition:
				"Das Negativpronomen „nichts“ verneint das Vorhandensein einer Sache.",
			translations: { en: ["nothing"] },
		});
	});

	test("authors exact jeder Knowledge without Semantic Relations", () => {
		const lemma = fixedMembersFor
			.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
			?.members.find(
				(candidate) =>
					candidate.canonicalForm === "jeder" &&
					candidate.coreFeatures.pronType === "Tot",
			);
		if (!lemma) throw new Error("Expected fixed jeder Lemma.");
		const reading = fixedMembersFor.reading(lemma)?.members[0];
		if (!reading) throw new Error("Expected fixed jeder Reading.");
		const found = fixedKnowledgeFor(reading);
		expect(found.decision).toBe("Found");
		if (found.decision !== "Found") return;
		expect(found.knowledge).toEqual({
			definition:
				"Das Totalpronomen „jeder“ bezeichnet jedes einzelne Mitglied einer Gruppe.",
			translations: { en: ["everyone", "each"] },
		});
	});

	test("authors jedweder Knowledge with one Lemma-targeted jeder Synonym", () => {
		const lemma = fixedMembersFor
			.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
			?.members.find(
				(candidate) =>
					candidate.canonicalForm === "jedweder" &&
					candidate.coreFeatures.pronType === "Tot",
			);
		if (!lemma) throw new Error("Expected fixed jedweder Lemma.");
		const reading = fixedMembersFor.reading(lemma)?.members[0];
		if (!reading) throw new Error("Expected fixed jedweder Reading.");
		const found = fixedKnowledgeFor(reading);
		expect(found.decision).toBe("Found");
		if (found.decision !== "Found") return;
		expect(found.knowledge).toEqual({
			definition:
				"Das gehoben oder veraltet wirkende Totalpronomen „jedweder“ bezeichnet nachdrücklich jedes einzelne Mitglied einer Gruppe.",
			translations: { en: ["each and every", "everyone"] },
			semanticRelations: {
				targetKind: "lemma",
				synonym: [
					expect.objectContaining({
						canonicalForm: "jeder",
						coreFeatures: expect.objectContaining({
							pronType: "Tot",
						}),
					}),
				],
			},
		});
		expect(found.coverage.semanticRelations.synonym).toBe("Authored");
		expect(found.coverage.semanticRelationTargetKind).toBe("lemma");
		expect(
			propagateRelations({
				readings: [
					{ reading: "reading-jedweder", lemma: "lemma-jedweder" },
					{ reading: "reading-jeder", lemma: "lemma-jeder" },
				],
				edges: [
					{
						sourceReading: "reading-jedweder",
						relation: "synonym",
						targetLemma: "lemma-jeder",
					},
				],
			}),
		).toContainEqual({
			sourceReading: "reading-jeder",
			relation: "synonym",
			targetLemma: "lemma-jedweder",
		});
	});

	test("authors jeglicher to jeder and derives symmetric transitive jedweder visibility", () => {
		const lemma = fixedMembersFor
			.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
			?.members.find(
				({ canonicalForm }) => canonicalForm === "jeglicher",
			);
		if (!lemma) throw new Error("Expected fixed jeglicher Lemma.");
		const reading = fixedMembersFor.reading(lemma)?.members[0];
		if (!reading) throw new Error("Expected fixed jeglicher Reading.");
		const found = fixedKnowledgeFor(reading);
		expect(found.decision).toBe("Found");
		if (found.decision !== "Found") return;
		expect(found.knowledge).toMatchObject({
			definition:
				"Das gehoben wirkende Totalpronomen „jeglicher“ bezeichnet jedes einzelne Mitglied einer Gruppe und kann auch pluralisch gebraucht werden.",
			translations: { en: ["each", "any", "every one"] },
			semanticRelations: {
				targetKind: "lemma",
				synonym: [expect.objectContaining({ canonicalForm: "jeder" })],
			},
		});
		const inferred = propagateRelations({
			readings: [
				{ reading: "r-jeglicher", lemma: "l-jeglicher" },
				{ reading: "r-jeder", lemma: "l-jeder" },
				{ reading: "r-jedweder", lemma: "l-jedweder" },
			],
			edges: [
				{
					sourceReading: "r-jeglicher",
					relation: "synonym",
					targetLemma: "l-jeder",
				},
				{
					sourceReading: "r-jedweder",
					relation: "synonym",
					targetLemma: "l-jeder",
				},
			],
		});
		expect(inferred).toContainEqual({
			sourceReading: "r-jeglicher",
			relation: "synonym",
			targetLemma: "l-jedweder",
		});
		expect(inferred).toContainEqual({
			sourceReading: "r-jedweder",
			relation: "synonym",
			targetLemma: "l-jeglicher",
		});
	});

	test("authors one Reading and all peer synonyms for promoted sein forms", () => {
		const peerForms = ["sein", "bin", "bist", "ist", "sind", "seid"];
		const catalog = allFixedLemmaCatalogs().find(
			({ scope }) => scope === FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1,
		);
		expect(catalog).toBeDefined();
		for (const lemma of catalog?.members ?? []) {
			const readings = fixedMembersFor.reading(lemma);
			expect(readings?.members).toHaveLength(1);
			const reading = readings?.members[0];
			if (!reading) throw new Error("Expected one fixed AUX Reading.");
			const found = fixedKnowledgeFor(reading);
			expect(found.decision).toBe("Found");
			if (found.decision !== "Found") continue;
			expect(found.scope).toBe(FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1);
			expect(found.knowledge.definition).toBeTruthy();
			expect(found.knowledge.translations?.en.length).toBeGreaterThan(0);
			if (peerForms.includes(lemma.canonicalForm)) {
				expect(found.knowledge.semanticRelations?.targetKind).toBe(
					"reading",
				);
				expect(
					found.knowledge.semanticRelations?.synonym?.map(
						(target) => {
							if (!("lemma" in target)) {
								throw new Error(
									"Expected a Reading-targeted synonym.",
								);
							}
							return target.lemma.canonicalForm;
						},
					),
				).toEqual(
					peerForms.filter(
						(target) => target !== lemma.canonicalForm,
					),
				);
				expect(found.coverage.semanticRelations.synonym).toBe(
					"Authored",
				);
				expect(found.coverage.semanticRelationTargetKind).toBe(
					"reading",
				);
			} else {
				expect(found.knowledge.semanticRelations).toBeUndefined();
				expect(found.coverage).toBe(
					DE_LEXEME_AUX_V1_FIXED_KNOWLEDGE_COVERAGE,
				);
			}
			const parsed = parseAsReadingKnowledge(found.knowledge);
			expect(parsed).not.toBeInstanceOf(ParsingError);
			expect(parsed).toEqual(found.knowledge);
		}
	});

	test("returns an explicit Miss for an unauthored Reading", () => {
		const lemma = allFixedLemmaCatalogs()[0]?.members[0];
		if (!lemma) throw new Error("Fixed DET fixture is missing.");
		expect(fixedKnowledgeFor({ lemma, emojiDescription: "🆕" })).toEqual({
			decision: "Miss",
			reason: "MemberNotCatalogued",
		});
	});
});
