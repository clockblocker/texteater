import type {
	CardDemoFakeSegment,
	CardDemoNoteKind,
} from "../card-demo/card-demo-contract";
import {
	CARD_DEMO_FAKE_TEXT,
	CARD_DEMO_RESOLUTION_CHAIN,
	cardDemoFakeSegmentById,
} from "../card-demo/card-demo-fixtures";
import type {
	SheetPlacement,
	SheetSubject,
	SheetWorkspace,
} from "./sheet-workspace";

export const SHEET_WORKSPACE_PANE_IDS = ["west", "central", "east"] as const;

const CARD_DEMO_NOTE_PREFIX = "card-demo-note";

export const SHEET_WORKSPACE_SUBJECTS = {
	article: {
		kind: "Text",
		textId: CARD_DEMO_FAKE_TEXT.id,
	},
	grammar: cardDemoNoteSubject("reading", CARD_DEMO_FAKE_TEXT.segments[0]),
	context: cardDemoNoteSubject(
		"attestation",
		CARD_DEMO_FAKE_TEXT.segments[1],
	),
	translation: cardDemoNoteSubject(
		"surface",
		CARD_DEMO_FAKE_TEXT.segments[2],
	),
} as const satisfies Record<string, SheetSubject>;

export type CardDemoNoteSheetSubject = {
	readonly kind: "Note";
	readonly noteId: string;
};

export type CardDemoNoteSheetSource = {
	readonly kind: CardDemoNoteKind;
	readonly segment: CardDemoFakeSegment;
};

export function cardDemoNoteSubject(
	kind: CardDemoNoteKind,
	segment: CardDemoFakeSegment,
): CardDemoNoteSheetSubject {
	return {
		kind: "Note",
		noteId: `${CARD_DEMO_NOTE_PREFIX}:${kind}:${segment.id}`,
	};
}

export function cardDemoNoteSheetSource(
	subject: SheetSubject,
): CardDemoNoteSheetSource | null {
	if (subject.kind !== "Note") return null;
	const [prefix, candidateKind, segmentId, ...rest] =
		subject.noteId.split(":");
	if (prefix !== CARD_DEMO_NOTE_PREFIX || rest.length > 0 || !segmentId)
		return null;
	const card = CARD_DEMO_RESOLUTION_CHAIN.find(
		(candidate) => candidate.kind === candidateKind,
	);
	const segment = cardDemoFakeSegmentById(segmentId);
	return card && segment ? { kind: card.kind, segment } : null;
}

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
				sheets: [],
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
