import type * as Dumling from "dumling/types";
import { makeSurfaceId } from "../../src";
import { readingFingerprint } from "../../src/core/identity";
import type { DumdictValidationRouteKey } from "../../src/parsing/validation-route-types";
import { germanHausLemma } from "../attested-entities/de/lemmas";
import { germanHausCitationSurface } from "../attested-entities/de/surfaces";
import { englishWalkCitationSurface } from "../attested-entities/eng/surfaces";
import { hebrewKatvuPastThirdPluralInflectionSurface } from "../attested-entities/heb/surfaces";
import { germanGehenLemma, germanGehenReading } from "../fixtures/de-notes";
import { englishWalkLemma, englishWalkReading } from "../fixtures/en-notes";
import { hebrewKatavLemma, hebrewKatavReading } from "../fixtures/he-notes";

export const languageFixtures = {
	de: {
		lemma: germanGehenLemma,
		reading: germanGehenReading,
		surface: germanHausCitationSurface,
		surfaceOwner: germanHausLemma,
	},
	en: {
		lemma: englishWalkLemma,
		reading: englishWalkReading,
		surface: englishWalkCitationSurface,
		surfaceOwner: englishWalkLemma,
	},
	he: {
		lemma: hebrewKatavLemma,
		reading: hebrewKatavReading,
		surface: hebrewKatvuPastThirdPluralInflectionSurface,
		surfaceOwner: hebrewKatavLemma,
	},
} as const;

export function fixturesFor(language: Dumling.Language) {
	const fixture = languageFixtures[language];
	const lemmaRecord = { lemma: fixture.lemma };
	const readingEntry = {
		reading: fixture.reading,
		attestedTranslations: [],
		attestations: [],
		notes: "",
	};
	const pending = {
		relation: "nearSynonym" as const,
		target: {
			language,
			canonicalForm: "target",
			family: "Lexeme",
			kind: "VERB",
		},
	};
	const locator = {
		sourceReadingKey: readingFingerprint(fixture.reading),
		relation: pending.relation,
		targetPendingId: `pending:${language}`,
	};
	const pendingRecord = {
		sourceReading: fixture.reading,
		pending,
		locator,
	};
	const changePrecondition = {
		kind: "revisionMatches" as const,
		revision: "revision-1",
	};
	const readingPatch = { kind: "addAttestation" as const, value: "text" };
	const plannedChange = {
		type: "createLemma" as const,
		record: lemmaRecord,
		preconditions: [],
	};
	const request = { baseRevision: "revision-1", changes: [plannedChange] };
	const surfaceEntry = {
		id: makeSurfaceId(language, fixture.surface),
		surface: fixture.surface,
		ownerLemma: fixture.surfaceOwner,
		attestedTranslations: [],
		attestations: [],
		notes: "",
	};
	return {
		changePrecondition,
		lemmaRecord,
		locator,
		pendingRecord,
		plannedChange,
		readingEntry,
		readingPatch,
		request,
		surfaceEntry,
	};
}

export function successfulInputs(): Record<DumdictValidationRouteKey, unknown> {
	const inputs = {
		parseAsCommitChangesResult: {
			status: "committed",
			nextRevision: "revision-2",
		},
	} as Record<DumdictValidationRouteKey, unknown>;
	for (const language of ["de", "en", "he"] as const) {
		const fixture = fixturesFor(language);
		inputs[`parseAsChangePrecondition:${language}`] =
			fixture.changePrecondition;
		inputs[`parseAsCommitChangesRequest:${language}`] = fixture.request;
		inputs[`parseAsDumdictPlan:${language}`] = fixture.request;
		inputs[`parseAsLemmaRecord:${language}`] = fixture.lemmaRecord;
		inputs[`parseAsPendingSemanticRelationLocator:${language}`] =
			fixture.locator;
		inputs[`parseAsPendingSemanticRelationRecord:${language}`] =
			fixture.pendingRecord;
		inputs[`parseAsPlannedChangeOp:${language}`] = fixture.plannedChange;
		inputs[`parseAsReadingEntry:${language}`] = fixture.readingEntry;
		inputs[`parseAsReadingPatchOp:${language}`] = fixture.readingPatch;
		inputs[`parseAsSurfaceEntry:${language}`] = fixture.surfaceEntry;
	}
	return inputs;
}
