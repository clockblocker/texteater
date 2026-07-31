// PROTOTYPE ONLY — immutable eval gold for issue #14.
//
// This is an evaluator-side module. Prompt Sources and example builders must
// not import it. blind-evaluation-input.ts is the only runner-facing
// projection and deliberately strips gold and control metadata.

export const CORPUS_VERSION = "meaning-resolution-v2-hidden" as const;
export const EVAL_LEARNER_ID = "learner-eval-v2-hidden-001" as const;

export type PresentationHazard = "emoji" | "description" | "example";

export type MeaningCandidate = Readonly<{
	meaningId: string;
	entryId: string;
	meaningInEmojis: string;
	descriptionBlocks: readonly string[];
	examples: readonly string[];
	presentationHazards: readonly PresentationHazard[];
}>;

export type MeaningDraft = Readonly<{
	meaningInEmojis: string;
	descriptionBlocks: readonly string[];
}>;

export type MeaningGold =
	| Readonly<{
			decision: "ReuseExisting";
			meaningId: string;
	  }>
	| Readonly<{
			decision: "DraftNew";
			draft: MeaningDraft;
	  }>;

export type MeaningGroup =
	| "broad-reuse"
	| "false-merge-trap"
	| "multi-candidate-order-control"
	| "zero-inventory";

export type MeaningRequirement =
	| "unseen-entry"
	| "contextual-paraphrase"
	| "broad-reuse-no-split"
	| "distinct-note-no-merge"
	| "zero-inventory"
	| "one-candidate-inventory"
	| "multi-candidate-inventory"
	| "paired-candidate-order"
	| "misleading-emoji"
	| "misleading-description"
	| "misleading-example"
	| "exact-canonical-draft";

export type OrderControl = Readonly<{
	pairId: `MR2-ORDER-${string}`;
	order: "forward" | "reverse";
}>;

export type HiddenMeaningCase = Readonly<{
	id: `MR2-${string}`;
	group: MeaningGroup;
	requirements: readonly MeaningRequirement[];
	learnerId: typeof EVAL_LEARNER_ID;
	language: "de" | "en";
	entryId: string;
	citationForm: string;
	context: string;
	normalizedSurface: string;
	candidates: readonly MeaningCandidate[];
	gold: MeaningGold;
	orderControl?: OrderControl;
}>;

const candidate = (
	meaningId: string,
	entryId: string,
	meaningInEmojis: string,
	descriptionBlocks: readonly string[],
	examples: readonly string[],
	presentationHazards: readonly PresentationHazard[] = [],
): MeaningCandidate => ({
	meaningId,
	entryId,
	meaningInEmojis,
	descriptionBlocks,
	examples,
	presentationHazards,
});

const FLUEGEL_ENTRY = "de-entry-v2-fluegel";
const FLUEGEL_WING = candidate(
	"m2-de-fluegel-wing",
	FLUEGEL_ENTRY,
	"🐦🪽",
	["a bird's limb used for flight", "a physical wing of an animal"],
	["Der Adler breitet seine Flügel aus."],
);
const FLUEGEL_PIANO = candidate(
	"m2-de-fluegel-piano",
	FLUEGEL_ENTRY,
	"🪽",
	["a grand piano with horizontal strings", "a large keyboard instrument"],
	["Vor dem Konzert wird der Flügel gestimmt."],
	["emoji"],
);

const WURZEL_ENTRY = "de-entry-v2-wurzel";
const WURZEL_PLANT = candidate(
	"m2-de-wurzel-plant",
	WURZEL_ENTRY,
	"🌱",
	["the underground part of a plant", "an organ that anchors and feeds it"],
	["Die Wurzel nimmt Wasser aus dem Boden auf."],
);
const TRACK_ENTRY = "en-entry-v2-track";
const TRACK_PATH = candidate(
	"m2-en-track-path",
	TRACK_ENTRY,
	"🛤️",
	[
		"a course or item followed from beginning to end",
		"a marked path or pair of rails",
	],
	["The train waited on the outer track."],
	["description"],
);
const CLOUD_ENTRY = "en-entry-v2-cloud";
const CLOUD_SKY = candidate(
	"m2-en-cloud-sky",
	CLOUD_ENTRY,
	"☁️",
	["a visible mass of droplets in the sky", "a weather formation"],
	["Dark clouds gathered over the harbour."],
);
const CLOUD_COMPUTING = candidate(
	"m2-en-cloud-computing",
	CLOUD_ENTRY,
	"☁️💾",
	["a visible mass high in the atmosphere", "remote networked computing"],
	[
		"The team moved its backups to the cloud.",
		"Cloud services host the application.",
	],
	["description"],
);

const STREAM_ENTRY = "en-entry-v2-stream";
const STREAM_MEDIA = candidate(
	"m2-en-stream-media",
	STREAM_ENTRY,
	"📡▶️",
	["continuous digital transmission of media", "audio or video played live"],
	["The stream winds through the valley.", "We streamed the concert live."],
	["example"],
);

const SHELL_ENTRY = "en-entry-v2-shell";
const SHELL_COVER = candidate(
	"m2-en-shell-cover",
	SHELL_ENTRY,
	"🐚",
	["a hard protective outer covering", "the casing of an egg or animal"],
	["The chick broke through its shell."],
);
const SHELL_COMMAND = candidate(
	"m2-en-shell-command",
	SHELL_ENTRY,
	"💻⌨️",
	[
		"a command-line interpreter",
		"a program used to enter operating-system commands",
	],
	[
		"The turtle withdrew into its shell.",
		"Start a shell before running the script.",
	],
	["example"],
);

const draft = (
	meaningInEmojis: string,
	firstBlock: string,
	secondBlock: string,
): MeaningGold => ({
	decision: "DraftNew",
	draft: {
		meaningInEmojis,
		descriptionBlocks: [firstBlock, secondBlock],
	},
});

const reuse = (meaningId: string): MeaningGold => ({
	decision: "ReuseExisting",
	meaningId,
});

const cases = [
	{
		id: "MR2-BROAD-001-FLUEGEL-PIANO",
		group: "broad-reuse",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"broad-reuse-no-split",
			"one-candidate-inventory",
			"misleading-emoji",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "de",
		entryId: FLUEGEL_ENTRY,
		citationForm: "Flügel",
		context: "Der Restaurator polierte die Tasten des Flügels.",
		normalizedSurface: "Flügels",
		candidates: [FLUEGEL_PIANO],
		gold: reuse(FLUEGEL_PIANO.meaningId),
	},
	{
		id: "MR2-BROAD-002-STREAM-MEDIA",
		group: "broad-reuse",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"broad-reuse-no-split",
			"one-candidate-inventory",
			"misleading-example",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "en",
		entryId: STREAM_ENTRY,
		citationForm: "stream",
		context: "The lecture streamed without interruption.",
		normalizedSurface: "streamed",
		candidates: [STREAM_MEDIA],
		gold: reuse(STREAM_MEDIA.meaningId),
	},
	{
		id: "MR2-BROAD-003-CLOUD-COMPUTING",
		group: "broad-reuse",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"broad-reuse-no-split",
			"one-candidate-inventory",
			"misleading-description",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "en",
		entryId: CLOUD_ENTRY,
		citationForm: "cloud",
		context: "Her backup is encrypted in the cloud.",
		normalizedSurface: "cloud",
		candidates: [CLOUD_COMPUTING],
		gold: reuse(CLOUD_COMPUTING.meaningId),
	},
	{
		id: "MR2-BROAD-004-WURZEL-PLANT",
		group: "broad-reuse",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"broad-reuse-no-split",
			"one-candidate-inventory",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "de",
		entryId: WURZEL_ENTRY,
		citationForm: "Wurzel",
		context: "Ein Keim bildet zuerst eine feine Wurzel.",
		normalizedSurface: "Wurzel",
		candidates: [WURZEL_PLANT],
		gold: reuse(WURZEL_PLANT.meaningId),
	},
	{
		id: "MR2-BROAD-005-TRACK-PATH",
		group: "broad-reuse",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"broad-reuse-no-split",
			"one-candidate-inventory",
			"misleading-description",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "en",
		entryId: TRACK_ENTRY,
		citationForm: "track",
		context: "Maintenance closed the eastern railway track.",
		normalizedSurface: "track",
		candidates: [TRACK_PATH],
		gold: reuse(TRACK_PATH.meaningId),
	},
	{
		id: "MR2-TRAP-001-FLUEGEL-PIANO",
		group: "false-merge-trap",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"distinct-note-no-merge",
			"one-candidate-inventory",
			"exact-canonical-draft",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "de",
		entryId: FLUEGEL_ENTRY,
		citationForm: "Flügel",
		context: "Im Proberaum steht ein frisch lackierter Flügel.",
		normalizedSurface: "Flügel",
		candidates: [FLUEGEL_WING],
		gold: draft(
			"🎹",
			"a grand piano with horizontal strings",
			"a large keyboard instrument",
		),
	},
	{
		id: "MR2-TRAP-002-WURZEL-MATH",
		group: "false-merge-trap",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"distinct-note-no-merge",
			"one-candidate-inventory",
			"exact-canonical-draft",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "de",
		entryId: WURZEL_ENTRY,
		citationForm: "Wurzel",
		context: "Berechne die dritte Wurzel aus acht.",
		normalizedSurface: "Wurzel",
		candidates: [WURZEL_PLANT],
		gold: draft(
			"√",
			"a mathematical root of a number",
			"a value obtained by root extraction",
		),
	},
	{
		id: "MR2-TRAP-003-TRACK-RECORDING",
		group: "false-merge-trap",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"distinct-note-no-merge",
			"one-candidate-inventory",
			"misleading-description",
			"exact-canonical-draft",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "en",
		entryId: TRACK_ENTRY,
		citationForm: "track",
		context: "The producer removed one track from the album.",
		normalizedSurface: "track",
		candidates: [TRACK_PATH],
		gold: draft(
			"🎵",
			"one recorded piece of audio",
			"an item in an album or playlist",
		),
	},
	{
		id: "MR2-TRAP-004-CLOUD-COMPUTING",
		group: "false-merge-trap",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"distinct-note-no-merge",
			"one-candidate-inventory",
			"exact-canonical-draft",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "en",
		entryId: CLOUD_ENTRY,
		citationForm: "cloud",
		context: "The service scales automatically in the cloud.",
		normalizedSurface: "cloud",
		candidates: [CLOUD_SKY],
		gold: draft(
			"☁️💾",
			"remote computing accessed over a network",
			"hosted storage or processing outside the local device",
		),
	},
	{
		id: "MR2-TRAP-005-SHELL-COMMAND",
		group: "false-merge-trap",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"distinct-note-no-merge",
			"one-candidate-inventory",
			"exact-canonical-draft",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "en",
		entryId: SHELL_ENTRY,
		citationForm: "shell",
		context: "The administrator changed her default shell.",
		normalizedSurface: "shell",
		candidates: [SHELL_COVER],
		gold: draft(
			"💻⌨️",
			"a command-line interpreter",
			"a program used to enter operating-system commands",
		),
	},
	{
		id: "MR2-PAIR-A-FORWARD",
		group: "multi-candidate-order-control",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"multi-candidate-inventory",
			"paired-candidate-order",
			"misleading-emoji",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "de",
		entryId: FLUEGEL_ENTRY,
		citationForm: "Flügel",
		context: "Beim Solo klang der Flügel besonders warm.",
		normalizedSurface: "Flügel",
		candidates: [FLUEGEL_WING, FLUEGEL_PIANO],
		gold: reuse(FLUEGEL_PIANO.meaningId),
		orderControl: { pairId: "MR2-ORDER-A", order: "forward" },
	},
	{
		id: "MR2-PAIR-A-REVERSE",
		group: "multi-candidate-order-control",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"multi-candidate-inventory",
			"paired-candidate-order",
			"misleading-emoji",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "de",
		entryId: FLUEGEL_ENTRY,
		citationForm: "Flügel",
		context: "Beim Solo klang der Flügel besonders warm.",
		normalizedSurface: "Flügel",
		candidates: [FLUEGEL_PIANO, FLUEGEL_WING],
		gold: reuse(FLUEGEL_PIANO.meaningId),
		orderControl: { pairId: "MR2-ORDER-A", order: "reverse" },
	},
	{
		id: "MR2-PAIR-B-FORWARD",
		group: "multi-candidate-order-control",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"multi-candidate-inventory",
			"paired-candidate-order",
			"misleading-description",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "en",
		entryId: CLOUD_ENTRY,
		citationForm: "cloud",
		context: "The application stores its state in the cloud.",
		normalizedSurface: "cloud",
		candidates: [CLOUD_SKY, CLOUD_COMPUTING],
		gold: reuse(CLOUD_COMPUTING.meaningId),
		orderControl: { pairId: "MR2-ORDER-B", order: "forward" },
	},
	{
		id: "MR2-PAIR-B-REVERSE",
		group: "multi-candidate-order-control",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"multi-candidate-inventory",
			"paired-candidate-order",
			"misleading-description",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "en",
		entryId: CLOUD_ENTRY,
		citationForm: "cloud",
		context: "The application stores its state in the cloud.",
		normalizedSurface: "cloud",
		candidates: [CLOUD_COMPUTING, CLOUD_SKY],
		gold: reuse(CLOUD_COMPUTING.meaningId),
		orderControl: { pairId: "MR2-ORDER-B", order: "reverse" },
	},
	{
		id: "MR2-PAIR-C-FORWARD",
		group: "multi-candidate-order-control",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"multi-candidate-inventory",
			"paired-candidate-order",
			"misleading-example",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "en",
		entryId: SHELL_ENTRY,
		citationForm: "shell",
		context: "Open a shell and run the migration command.",
		normalizedSurface: "shell",
		candidates: [SHELL_COVER, SHELL_COMMAND],
		gold: reuse(SHELL_COMMAND.meaningId),
		orderControl: { pairId: "MR2-ORDER-C", order: "forward" },
	},
	{
		id: "MR2-PAIR-C-REVERSE",
		group: "multi-candidate-order-control",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"multi-candidate-inventory",
			"paired-candidate-order",
			"misleading-example",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "en",
		entryId: SHELL_ENTRY,
		citationForm: "shell",
		context: "Open a shell and run the migration command.",
		normalizedSurface: "shell",
		candidates: [SHELL_COMMAND, SHELL_COVER],
		gold: reuse(SHELL_COMMAND.meaningId),
		orderControl: { pairId: "MR2-ORDER-C", order: "reverse" },
	},
	{
		id: "MR2-ZERO-001-WINDOW-SOFTWARE",
		group: "zero-inventory",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"zero-inventory",
			"exact-canonical-draft",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "en",
		entryId: "en-entry-v2-window",
		citationForm: "window",
		context: "Close the frozen window and reopen the editor.",
		normalizedSurface: "window",
		candidates: [],
		gold: draft(
			"🖥️▭",
			"a rectangular area displayed by software",
			"a view used to interact with an application",
		),
	},
	{
		id: "MR2-ZERO-002-BRANCH-ORGANIZATION",
		group: "zero-inventory",
		requirements: [
			"unseen-entry",
			"contextual-paraphrase",
			"zero-inventory",
			"exact-canonical-draft",
		],
		learnerId: EVAL_LEARNER_ID,
		language: "en",
		entryId: "en-entry-v2-branch",
		citationForm: "branch",
		context: "The museum opened a branch near the station.",
		normalizedSurface: "branch",
		candidates: [],
		gold: draft(
			"🏛️📍",
			"a local division of an organization",
			"one location belonging to a larger institution",
		),
	},
] as const satisfies readonly HiddenMeaningCase[];

function deepFreeze<T>(value: T): Readonly<T> {
	if (
		value !== null &&
		typeof value === "object" &&
		!Object.isFrozen(value)
	) {
		Object.freeze(value);
		for (const nested of Object.values(value)) deepFreeze(nested);
	}
	return value;
}

export const HIDDEN_MEANING_CASES = deepFreeze(cases);
