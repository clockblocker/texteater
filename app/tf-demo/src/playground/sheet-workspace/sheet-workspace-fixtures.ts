import type {
	SheetPlacement,
	SheetSubject,
	SheetWorkspace,
} from "./sheet-workspace";

export const SHEET_WORKSPACE_PANE_IDS = ["west", "central", "east"] as const;

export const SHEET_WORKSPACE_SUBJECTS = {
	article: {
		kind: "Text",
		textId: "the-glass-bead-game",
	},
	grammar: {
		kind: "Note",
		noteId: "note-reading-spiel",
	},
	context: {
		kind: "Note",
		noteId: "note-attestation-spiel",
	},
	translation: {
		kind: "Note",
		noteId: "note-translation-spiel",
	},
} as const satisfies Record<string, SheetSubject>;

export const SHEET_WORKSPACE_SUBJECT_COPY: Record<
	string,
	{
		readonly eyebrow: string;
		readonly title: string;
		readonly summary: string;
	}
> = {
	[SHEET_WORKSPACE_SUBJECTS.article.textId]: {
		eyebrow: "Text",
		title: "Das Glasperlenspiel",
		summary:
			"A fake reading surface for comparing pane-local Sheet movement.",
	},
	[SHEET_WORKSPACE_SUBJECTS.grammar.noteId]: {
		eyebrow: "Reading Note",
		title: "Spiel",
		summary: "das Spiel · noun · neuter",
	},
	[SHEET_WORKSPACE_SUBJECTS.context.noteId]: {
		eyebrow: "Route Note",
		title: "im Spiele",
		summary: "Occurrence context in the opening paragraph.",
	},
	[SHEET_WORKSPACE_SUBJECTS.translation.noteId]: {
		eyebrow: "Knowledge",
		title: "game · play",
		summary: "English translation for the selected Reading.",
	},
};

export function sheetPlacement(
	instanceId: string,
	subject: SheetSubject,
): SheetPlacement {
	return { instanceId, subject };
}

export function createSheetWorkspaceFixture(): SheetWorkspace {
	return {
		centralPaneId: "central",
		activePaneId: "central",
		panes: [
			{
				id: "west",
				sheets: [
					{
						...sheetPlacement(
							"sheet-west-text",
							SHEET_WORKSPACE_SUBJECTS.article,
						),
						locked: true,
					},
				],
			},
			{
				id: "central",
				sheets: [
					{
						...sheetPlacement(
							"sheet-central-text",
							SHEET_WORKSPACE_SUBJECTS.article,
						),
						locked: true,
					},
					{
						...sheetPlacement(
							"sheet-central-grammar",
							SHEET_WORKSPACE_SUBJECTS.grammar,
						),
						locked: false,
					},
				],
			},
			{
				id: "east",
				sheets: [],
			},
		],
	};
}

export function subjectKey(subject: SheetSubject): string {
	return subject.kind === "Text" ? subject.textId : subject.noteId;
}
