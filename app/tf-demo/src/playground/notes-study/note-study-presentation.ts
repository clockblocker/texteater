import { NOTE_STUDY_FIXTURES } from "./fixtures";
import { NOTE_STUDY_DATABASE } from "./note-study-dummy-database";
import type {
	NoteStudyFixture,
	NoteStudyForm,
	NoteStudyFormTable,
	NoteStudyLine,
	NoteStudyRelation,
	NoteStudyToken,
	NoteStudyTone,
} from "./note-study-fixture";

/** Extra layout copy which has no place in Dumling, Dumrel, or source Texts. */
export type NoteStudyPresentation = {
	readonly title: NoteStudyLine;
	readonly summary: string;
	readonly pronunciationHref?: string;
	readonly contextLines: readonly NoteStudyLine[];
	readonly contextTone?: NoteStudyTone;
	readonly relationLines?: readonly NoteStudyRelation[];
	readonly formation?: readonly NoteStudyLine[];
	readonly structure?: readonly NoteStudyLine[];
	readonly translatedExplanations?: readonly string[];
	readonly forms?: readonly NoteStudyForm[];
	readonly formTable?: NoteStudyFormTable;
	readonly tags: readonly NoteStudyToken[];
};

export const NOTE_STUDY_PRESENTATION_BY_READING_KEY = new Map<
	string,
	NoteStudyPresentation
>(
	(NOTE_STUDY_FIXTURES as readonly NoteStudyFixture[]).map(
		(fixture, index) => {
			const unit = NOTE_STUDY_DATABASE[index];
			if (!unit)
				throw new Error(
					`Missing database Unit for ${fixture.titleText}.`,
				);
			return [
				unit.readingKey,
				{
					title: fixture.title,
					summary: fixture.summary,
					...(fixture.pronunciationHref
						? { pronunciationHref: fixture.pronunciationHref }
						: {}),
					contextLines: fixture.contexts,
					...(fixture.contextTone
						? { contextTone: fixture.contextTone }
						: {}),
					...(fixture.relations
						? { relationLines: fixture.relations }
						: {}),
					...(fixture.formation
						? { formation: fixture.formation }
						: {}),
					...(fixture.structure
						? { structure: fixture.structure }
						: {}),
					...(fixture.translatedExplanations
						? {
								translatedExplanations:
									fixture.translatedExplanations,
							}
						: {}),
					...(fixture.forms ? { forms: fixture.forms } : {}),
					...(fixture.formTable
						? { formTable: fixture.formTable }
						: {}),
					tags: fixture.tags,
				},
			] as const;
		},
	),
);
