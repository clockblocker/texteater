export type MeaningCandidate = {
	readonly meaningId: string;
	readonly entryId: string;
	readonly meaningInEmojis: string;
	readonly descriptionBlocks: readonly string[];
	readonly examples: readonly string[];
};

export type MeaningDraft = {
	readonly meaningInEmojis: string;
	readonly descriptionBlocks: readonly string[];
};

export type GoldMeaning =
	| { readonly decision: "ReuseExisting"; readonly meaningId: string }
	| { readonly decision: "DraftNew"; readonly draft: MeaningDraft };

export type MeaningCase = {
	readonly id: string;
	readonly group:
		| "baseline-reuse"
		| "penny-control"
		| "false-merge-trap"
		| "multi-candidate"
		| "empty-inventory";
	readonly learnerId: string;
	readonly language: "de" | "en";
	readonly entryId: string;
	readonly citationForm: string;
	readonly context: string;
	readonly normalizedSurface: string;
	readonly candidates: readonly MeaningCandidate[];
	readonly gold: GoldMeaning;
};

const candidate = (
	meaningId: string,
	entryId: string,
	meaningInEmojis: string,
	description: string,
	examples: readonly string[],
): MeaningCandidate => ({
	meaningId,
	entryId,
	meaningInEmojis,
	descriptionBlocks: [description],
	examples,
});

const MUTTER = candidate(
	"m-de-mutter-parent",
	"de-entry-mutter-parent",
	"👩‍👧",
	"a mother or female parent",
	["Meine Mutter kommt morgen.", "Seine Mutter hilft ihm."],
);
const SURRENDER = candidate(
	"m-en-give-up-surrender",
	"en-entry-give-up",
	"🏳️",
	"to stop trying or surrender",
	["She gave up after the third attempt."],
);
const RED = candidate(
	"m-de-rot-color",
	"de-entry-rot",
	"🔴",
	"having the color red",
	["Sie trägt ein rotes Kleid."],
);
const WRITTEN_WORK = candidate(
	"m-en-book-written-work",
	"en-entry-book-noun",
	"📖",
	"a written work, including a novel or manual",
	["The novel is a long book.", "The repair book explains every step."],
);
const RESERVE = candidate(
	"m-en-book-reserve",
	"en-entry-book-verb",
	"🗓️✅",
	"to reserve something for later use",
	["They booked a room."],
);
const BE_CAREFUL = candidate(
	"m-de-aufpassen-care",
	"de-entry-aufpassen",
	"⚠️👀",
	"to pay attention or be careful",
	["Pass auf dich auf!", "Pass beim Überqueren der Straße auf."],
);
const FUNCTION = candidate(
	"m-de-laufen-function",
	"de-entry-laufen-function",
	"⚙️✅",
	"to operate or function",
	["Der Motor läuft.", "Die Uhr läuft."],
);
const CASTLE = candidate(
	"m-de-schloss-castle",
	"de-entry-schloss",
	"🏰",
	"a large fortified or palatial building",
	["Das Schloss liegt auf einem Hügel."],
);
const LOCK = candidate(
	"m-de-schloss-lock",
	"de-entry-schloss",
	"🔒",
	"a device that fastens a door or other closure",
	["Das Schloss an der Tür klemmt."],
);
const CHAIR_FURNITURE = candidate(
	"m-en-chair-furniture",
	"en-entry-chair",
	"🪑",
	"a seat for one person",
	["She sat on a wooden chair."],
);
const CHAIR_LEADER = candidate(
	"m-en-chair-leader",
	"en-entry-chair",
	"👤🗣️",
	"a person who leads a meeting, committee, or department",
	["The chair opened the meeting.", "The department chair approved it."],
);

const draft = (meaningInEmojis: string, description: string): GoldMeaning => ({
	decision: "DraftNew",
	draft: { meaningInEmojis, descriptionBlocks: [description] },
});

const reuse = (meaningId: string): GoldMeaning => ({
	decision: "ReuseExisting",
	meaningId,
});

const meaningCase = (
	id: string,
	group: MeaningCase["group"],
	language: MeaningCase["language"],
	entryId: string,
	citationForm: string,
	context: string,
	normalizedSurface: string,
	candidates: readonly MeaningCandidate[],
	gold: GoldMeaning,
): MeaningCase => ({
	id,
	group,
	learnerId: "learner-eval-001",
	language,
	entryId,
	citationForm,
	context,
	normalizedSurface,
	candidates,
	gold,
});

export const CORPUS: readonly MeaningCase[] = [
	meaningCase(
		"MR-01-MUTTER-REUSE",
		"baseline-reuse",
		"de",
		MUTTER.entryId,
		"Mutter",
		"Meine Mutter kommt morgen.",
		"Mutter",
		[MUTTER],
		reuse(MUTTER.meaningId),
	),
	meaningCase(
		"MR-02-GIVE-UP-REUSE",
		"baseline-reuse",
		"en",
		SURRENDER.entryId,
		"give up",
		"Mark gave up on the difficult puzzle.",
		"gave up",
		[SURRENDER],
		reuse(SURRENDER.meaningId),
	),
	meaningCase(
		"MR-03-ROT-REUSE",
		"baseline-reuse",
		"de",
		RED.entryId,
		"rot",
		"Sie las das rote Buch.",
		"rote",
		[RED],
		reuse(RED.meaningId),
	),
	meaningCase(
		"MR-04-BOOK-VERB-REUSE",
		"baseline-reuse",
		"en",
		RESERVE.entryId,
		"book",
		"They book rooms for visiting speakers.",
		"book",
		[RESERVE],
		reuse(RESERVE.meaningId),
	),
	meaningCase(
		"MR-05-AUFPASSEN-REUSE",
		"baseline-reuse",
		"de",
		BE_CAREFUL.entryId,
		"aufpassen",
		"Pass auf dich auf!",
		"pass auf",
		[BE_CAREFUL],
		reuse(BE_CAREFUL.meaningId),
	),
	meaningCase(
		"MR-06-LAUFEN-MOTOR",
		"penny-control",
		"de",
		FUNCTION.entryId,
		"laufen",
		"Der Motor läuft.",
		"läuft",
		[FUNCTION],
		reuse(FUNCTION.meaningId),
	),
	meaningCase(
		"MR-07-LAUFEN-CLOCK",
		"penny-control",
		"de",
		FUNCTION.entryId,
		"laufen",
		"Die Uhr läuft.",
		"läuft",
		[FUNCTION],
		reuse(FUNCTION.meaningId),
	),
	meaningCase(
		"MR-08-LAUFEN-SERVER",
		"penny-control",
		"de",
		FUNCTION.entryId,
		"laufen",
		"Der Server läuft wieder.",
		"läuft",
		[FUNCTION],
		reuse(FUNCTION.meaningId),
	),
	meaningCase(
		"MR-09-BOOK-NOVEL",
		"penny-control",
		"en",
		WRITTEN_WORK.entryId,
		"book",
		"The novel is the best book I read this year.",
		"book",
		[WRITTEN_WORK],
		reuse(WRITTEN_WORK.meaningId),
	),
	meaningCase(
		"MR-10-BOOK-MANUAL",
		"penny-control",
		"en",
		WRITTEN_WORK.entryId,
		"book",
		"The repair book explains every step.",
		"book",
		[WRITTEN_WORK],
		reuse(WRITTEN_WORK.meaningId),
	),
	meaningCase(
		"MR-11-CHAIR-MEETING",
		"penny-control",
		"en",
		CHAIR_LEADER.entryId,
		"chair",
		"The chair opened the meeting.",
		"chair",
		[CHAIR_LEADER],
		reuse(CHAIR_LEADER.meaningId),
	),
	meaningCase(
		"MR-12-CHAIR-DEPARTMENT",
		"penny-control",
		"en",
		CHAIR_LEADER.entryId,
		"chair",
		"The department chair approved the new course.",
		"chair",
		[CHAIR_LEADER],
		reuse(CHAIR_LEADER.meaningId),
	),
	meaningCase(
		"MR-13-SCHLOSS-LOCK-NEW",
		"false-merge-trap",
		"de",
		CASTLE.entryId,
		"Schloss",
		"Das Schloss an der Tür klemmt.",
		"Schloss",
		[CASTLE],
		draft("🔒", "a device that fastens a door or other closure"),
	),
	meaningCase(
		"MR-14-SCHLOSS-CASTLE-NEW",
		"false-merge-trap",
		"de",
		LOCK.entryId,
		"Schloss",
		"Das Schloss liegt auf einem Hügel.",
		"Schloss",
		[LOCK],
		draft("🏰", "a large fortified or palatial building"),
	),
	meaningCase(
		"MR-15-CHAIR-LEADER-NEW",
		"false-merge-trap",
		"en",
		CHAIR_FURNITURE.entryId,
		"chair",
		"The chair opened the meeting.",
		"chair",
		[CHAIR_FURNITURE],
		draft("👤🗣️", "a person who leads a meeting, committee, or department"),
	),
	meaningCase(
		"MR-16-CHAIR-FURNITURE-NEW",
		"false-merge-trap",
		"en",
		CHAIR_LEADER.entryId,
		"chair",
		"She sat on a wooden chair.",
		"chair",
		[CHAIR_LEADER],
		draft("🪑", "a seat for one person"),
	),
	meaningCase(
		"MR-17-MUTTER-FIRST",
		"empty-inventory",
		"de",
		MUTTER.entryId,
		"Mutter",
		"Meine Mutter kommt morgen.",
		"Mutter",
		[],
		draft("👩‍👧", "a mother or female parent"),
	),
	meaningCase(
		"MR-18-SCHLOSS-LOCK-MULTI",
		"multi-candidate",
		"de",
		LOCK.entryId,
		"Schloss",
		"Das Schloss an der Tür klemmt.",
		"Schloss",
		[CASTLE, LOCK],
		reuse(LOCK.meaningId),
	),
	meaningCase(
		"MR-19-SCHLOSS-CASTLE-MULTI",
		"multi-candidate",
		"de",
		CASTLE.entryId,
		"Schloss",
		"Das Schloss liegt auf einem Hügel.",
		"Schloss",
		[LOCK, CASTLE],
		reuse(CASTLE.meaningId),
	),
	meaningCase(
		"MR-20-CHAIR-LEADER-MULTI",
		"multi-candidate",
		"en",
		CHAIR_LEADER.entryId,
		"chair",
		"The committee chair called for a vote.",
		"chair",
		[CHAIR_FURNITURE, CHAIR_LEADER],
		reuse(CHAIR_LEADER.meaningId),
	),
	meaningCase(
		"MR-21-CHAIR-FURNITURE-MULTI",
		"multi-candidate",
		"en",
		CHAIR_FURNITURE.entryId,
		"chair",
		"The child climbed onto the chair.",
		"chair",
		[CHAIR_LEADER, CHAIR_FURNITURE],
		reuse(CHAIR_FURNITURE.meaningId),
	),
];

export function assertCorpusScope(corpus: readonly MeaningCase[]): void {
	for (const meaningCase of corpus) {
		for (const candidateMeaning of meaningCase.candidates) {
			if (candidateMeaning.entryId !== meaningCase.entryId) {
				throw new Error(
					`${meaningCase.id} exposes Meaning ${candidateMeaning.meaningId} from another Entry`,
				);
			}
		}
	}
}
