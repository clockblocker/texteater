import { describe, expect, test } from "bun:test";
import type {
	DumdictEntryDraft,
	DumdictService,
	FindStoredLemmaSensesResult,
	Lemma,
	LemmaDescription,
	LemmaSenseCandidate,
	Selection,
} from "../../../src";
import { derivePendingLemmaId } from "../../../src/core/pending/identity";
import type { SerializedDictionaryNote } from "../../../src/testing/serialized-note";
import {
	englishBankFinancialLemma,
	englishBankFinancialSelection,
	englishBankRiverLemma,
	englishLightIlluminationLemma,
	englishLightIlluminationSelection,
	englishLightWeightLemma,
	englishLightWeightSelection,
	englishLookLemma,
	englishLookSelection,
	englishLookUpLemma,
	englishLookUpSelection,
	englishPlantFactoryLemma,
	englishPlantFactorySelection,
	englishPlantOrganismLemma,
	englishRakeToolLemma,
	englishSpringCoilLemma,
	englishSpringSeasonLemma,
} from "../../attested-entities";
import {
	getBootedUpDumdict,
	makeDumlingIdFor,
	type SurfaceEntry,
} from "./helpers";

type EnglishLemma = Lemma<"en">;
type EnglishSelection = Selection<"en">;

function serializedNote(
	lemma: EnglishLemma,
	note: {
		attestedTranslations: string[];
		attestations: string[];
		notes: string;
	},
	ownedSurfaceEntries: SurfaceEntry<"en">[] = [],
): SerializedDictionaryNote<"en"> {
	return {
		lemmaEntry: {
			id: makeDumlingIdFor("en", lemma),
			lemma,
			lexicalRelations: {},
			morphologicalRelations: {},
			...note,
		},
		ownedSurfaceEntries,
		pendingRelations: [],
	};
}

function resolveLemmaDescription(
	selection: EnglishSelection,
): LemmaDescription<"en"> {
	const { lemma } = selection.surface;
	return {
		language: lemma.language,
		canonicalLemma: lemma.canonicalLemma,
		lemmaKind: lemma.lemmaKind,
		lemmaSubKind: lemma.lemmaSubKind,
	};
}

async function lookupForSelection(
	dict: DumdictService<"en">,
	selection: EnglishSelection,
): Promise<FindStoredLemmaSensesResult<"en">> {
	return dict.findStoredLemmaSenses({
		lemmaDescription: resolveLemmaDescription(selection),
	});
}

function perfectLlmChoosesStoredSense(
	result: FindStoredLemmaSensesResult<"en">,
	targetLemma: EnglishLemma,
): LemmaSenseCandidate<"en"> | undefined {
	return result.candidates.find(
		({ note }) =>
			note.lemma.canonicalLemma === targetLemma.canonicalLemma &&
			note.lemma.lemmaKind === targetLemma.lemmaKind &&
			note.lemma.lemmaSubKind === targetLemma.lemmaSubKind &&
			note.lemma.meaningInEmojis === targetLemma.meaningInEmojis,
	);
}

async function addAttestationAfterConsumerLookup({
	dict,
	selection,
	attestation,
}: {
	dict: DumdictService<"en">;
	selection: EnglishSelection;
	attestation: string;
}) {
	const lookup = await lookupForSelection(dict, selection);
	const picked = perfectLlmChoosesStoredSense(lookup, selection.surface.lemma);
	if (!picked) {
		throw new Error("Expected consumer LLM to pick an existing sense.");
	}

	return {
		lookup,
		mutation: await dict.addAttestation({
			lemmaId: picked.lemmaId,
			attestation,
		}),
	};
}

async function addNewNoteAfterConsumerLookup({
	dict,
	selection,
	draft,
}: {
	dict: DumdictService<"en">;
	selection: EnglishSelection;
	draft: DumdictEntryDraft<"en">;
}) {
	const lookup = await lookupForSelection(dict, selection);
	const picked = perfectLlmChoosesStoredSense(lookup, selection.surface.lemma);
	if (picked) {
		throw new Error("Expected consumer LLM to request a new sense.");
	}

	return {
		lookup,
		mutation: await dict.addNewNote({ draft }),
	};
}

describe("consumer e2e workflow", () => {
	test("appends an attestation to the sense selected from ambiguous lookup candidates", async () => {
		const { dict, storage } = getBootedUpDumdict("en", [
			serializedNote(englishBankFinancialLemma, {
				attestedTranslations: ["bank"],
				attestations: ["She opened a bank account."],
				notes: "A financial institution.",
			}),
			serializedNote(englishBankRiverLemma, {
				attestedTranslations: ["bank"],
				attestations: ["The canoe scraped the river bank."],
				notes: "The land alongside a river.",
			}),
		]);

		const { lookup, mutation } = await addAttestationAfterConsumerLookup({
			dict,
			selection: englishBankFinancialSelection,
			attestation: "The bank approved the loan.",
		});

		const bankFinancialId = makeDumlingIdFor("en", englishBankFinancialLemma);
		const bankRiverId = makeDumlingIdFor("en", englishBankRiverLemma);
		const storedFinancialBank = storage
			.loadAll()
			.find(({ lemmaEntry }) => lemmaEntry.id === bankFinancialId)?.lemmaEntry;
		const storedRiverBank = storage
			.loadAll()
			.find(({ lemmaEntry }) => lemmaEntry.id === bankRiverId)?.lemmaEntry;

		expect(lookup.candidates.map(({ lemmaId }) => lemmaId).sort()).toEqual(
			[bankFinancialId, bankRiverId].sort(),
		);
		expect(mutation.status).toBe("applied");
		expect(storedFinancialBank?.attestations).toContain(
			"The bank approved the loan.",
		);
		expect(storedRiverBank?.attestations).not.toContain(
			"The bank approved the loan.",
		);
	});

	test("creates a missing same-spelling sense when stored candidates do not match the attested lemma", async () => {
		const { dict, storage } = getBootedUpDumdict("en", [
			serializedNote(englishPlantOrganismLemma, {
				attestedTranslations: ["plant"],
				attestations: ["The plant needs more light."],
				notes: "A living organism that grows in soil or water.",
			}),
			serializedNote(englishRakeToolLemma, {
				attestedTranslations: ["rake"],
				attestations: ["Use the rake after mowing."],
				notes: "A garden tool with a toothed bar.",
			}),
			serializedNote(englishSpringSeasonLemma, {
				attestedTranslations: ["spring"],
				attestations: ["Birds returned in spring."],
				notes: "The season after winter.",
			}),
			serializedNote(englishSpringCoilLemma, {
				attestedTranslations: ["spring"],
				attestations: ["The spring snapped inside the latch."],
				notes: "An elastic coil that stores mechanical energy.",
			}),
		]);

		const { lookup, mutation } = await addNewNoteAfterConsumerLookup({
			dict,
			selection: englishPlantFactorySelection,
			draft: {
				lemma: englishPlantFactoryLemma,
				note: {
					attestedTranslations: ["plant"],
					attestations: ["The auto plant added a night shift."],
					notes: "A factory or industrial production site.",
				},
			},
		});

		const plantOrganismId = makeDumlingIdFor("en", englishPlantOrganismLemma);
		const plantFactoryId = makeDumlingIdFor("en", englishPlantFactoryLemma);
		const postCreateLookup = await lookupForSelection(
			dict,
			englishPlantFactorySelection,
		);

		expect(lookup.candidates.map(({ lemmaId }) => lemmaId)).toEqual([
			plantOrganismId,
		]);
		expect(mutation.status).toBe("applied");
		expect(
			storage
				.loadAll()
				.find(({ lemmaEntry }) => lemmaEntry.id === plantFactoryId)?.lemmaEntry
				.attestations,
		).toContain("The auto plant added a night shift.");
		expect(
			postCreateLookup.candidates.map(({ lemmaId }) => lemmaId).sort(),
		).toEqual([plantOrganismId, plantFactoryId].sort());
	});

	test("creates pending related entries and fills them when the related lemma is later selected", async () => {
		const { dict, storage } = getBootedUpDumdict("en", []);
		const lookUpId = makeDumlingIdFor("en", englishLookUpLemma);
		const lookId = makeDumlingIdFor("en", englishLookLemma);
		const pendingLookId = derivePendingLemmaId({
			language: "en",
			canonicalLemma: "look",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
		});

		const createdPhrasalVerb = await addNewNoteAfterConsumerLookup({
			dict,
			selection: englishLookUpSelection,
			draft: {
				lemma: englishLookUpLemma,
				note: {
					attestedTranslations: ["look up"],
					attestations: ["They look up every unknown word."],
					notes: "Search for information in a reference source.",
				},
				relations: [
					{
						relationFamily: "morphological",
						relation: "consistsOf",
						target: {
							kind: "pending",
							ref: {
								canonicalLemma: "look",
								lemmaKind: "Lexeme",
								lemmaSubKind: "VERB",
							},
						},
					},
				],
			},
		});

		const storedAfterPhrasalVerb = storage.loadAll();
		expect(createdPhrasalVerb.lookup.candidates).toHaveLength(0);
		expect(createdPhrasalVerb.mutation.status).toBe("applied");
		expect(
			storedAfterPhrasalVerb.flatMap(({ pendingRefs }) => pendingRefs ?? []),
		).toContainEqual({
			pendingId: pendingLookId,
			language: "en",
			canonicalLemma: "look",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
		});
		expect(
			storedAfterPhrasalVerb.flatMap(
				({ pendingRelations }) => pendingRelations,
			),
		).toContainEqual({
			sourceLemmaId: lookUpId,
			relationFamily: "morphological",
			relation: "consistsOf",
			targetPendingId: pendingLookId,
		});

		const lookDraft: DumdictEntryDraft<"en"> = {
			lemma: englishLookLemma,
			note: {
				attestedTranslations: ["look"],
				attestations: ["Please look at the map."],
				notes: "Direct one's gaze toward something.",
			},
		};
		const filledPendingLook = await addNewNoteAfterConsumerLookup({
			dict,
			selection: englishLookSelection,
			draft: lookDraft,
		});

		const storedAfterLook = storage.loadAll();
		const lookContextAfterFill = await storage.loadNewNoteContext({
			draft: lookDraft,
		});
		const storedLookUp = storedAfterLook.find(
			({ lemmaEntry }) => lemmaEntry.id === lookUpId,
		)?.lemmaEntry;
		const storedLook = storedAfterLook.find(
			({ lemmaEntry }) => lemmaEntry.id === lookId,
		)?.lemmaEntry;

		expect(filledPendingLook.lookup.candidates).toHaveLength(0);
		expect(filledPendingLook.mutation.status).toBe("applied");
		expect(
			storedAfterLook.flatMap(({ pendingRefs }) => pendingRefs ?? []),
		).toHaveLength(0);
		expect(
			storedAfterLook.flatMap(({ pendingRelations }) => pendingRelations),
		).toHaveLength(0);
		expect(lookContextAfterFill.matchingPendingRefsForNewLemma).toHaveLength(0);
		expect(storedLookUp?.morphologicalRelations.consistsOf).toContain(lookId);
		expect(storedLook?.morphologicalRelations.usedIn).toContain(lookUpId);
	});

	test("uses resolved lemma kind to keep same spelling candidates in separate workflows", async () => {
		const { dict } = getBootedUpDumdict("en", [
			serializedNote(englishLightIlluminationLemma, {
				attestedTranslations: ["light"],
				attestations: ["The morning light filled the room."],
				notes: "Visible illumination.",
			}),
			serializedNote(englishLightWeightLemma, {
				attestedTranslations: ["light"],
				attestations: ["Pack a light jacket."],
				notes: "Low in weight.",
			}),
		]);

		const nounLookup = await lookupForSelection(
			dict,
			englishLightIlluminationSelection,
		);
		const adjectiveLookup = await lookupForSelection(
			dict,
			englishLightWeightSelection,
		);

		expect(
			nounLookup.candidates.map(({ note }) => note.lemma.lemmaSubKind),
		).toEqual(["NOUN"]);
		expect(
			adjectiveLookup.candidates.map(({ note }) => note.lemma.lemmaSubKind),
		).toEqual(["ADJ"]);
	});
});
