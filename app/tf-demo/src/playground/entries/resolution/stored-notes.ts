import type { PlaygroundSnapshot } from "../../../../tooling/playground-snapshot";
import { STORIES, STORY_SENTENCES, type Story, sentenceText } from "./stories";
import {
	lemmaOf,
	presentedSurface,
	STORY_SCROLL_ID,
	STORY_SCROLL_TITLE,
	sentenceId,
	storyId,
	storyIds,
} from "./story-notes";

/**
 * The stored Notes a story's commit hands over to, shaped as the backend's
 * Note queries return them, and the Scroll the stories are clicked in.
 * They stand in for a fake db that holds none of these words.
 */

type StoredNote = PlaygroundSnapshot["notes"][string];
type NoteOf<Kind extends StoredNote["kind"]> = Extract<
	StoredNote,
	{ readonly kind: Kind }
>;
type ScrollView = PlaygroundSnapshot["scrolls"][string];

const KNOWLEDGE_UPDATED_AT = Date.UTC(2026, 10, 10);

const WORD = /[\p{L}\p{M}\p{N}]+|\s+|[^\p{L}\p{M}\p{N}\s]+/gu;

/** A definition as the hidden Definition Text's one Sentence. */
function definitionSentence(story: Story, definition: string) {
	const segments = (definition.match(WORD) ?? []).map((text, index) => {
		const kind = /^\s+$/.test(text)
			? ("Whitespace" as const)
			: /^[\p{L}\p{M}\p{N}]/u.test(text)
				? ("ResolvableText" as const)
				: ("Punctuation" as const);
		return {
			index,
			kind,
			text,
			encountered: false,
			...(kind === "ResolvableText"
				? {
						unit: {
							route: "Unresolved" as const,
							segments: [index],
						},
					}
				: {}),
		};
	});
	return {
		sentenceId: storyId("sentences", `definition-${story.key}`),
		language: "de" as const,
		paragraph: 0,
		position: 0,
		stitchedText: definition,
		segments,
	};
}

function scrollTarget(story: Story) {
	return {
		kind: "Scroll" as const,
		scrollId: STORY_SCROLL_ID,
		focusAttestationId: storyIds(story).attestationId,
		title: STORY_SCROLL_TITLE,
	};
}

/** The clicked sentence as a Source Context: where the Reading was met. */
function sourceContext(story: Story) {
	const segments = STORY_SENTENCES[story.sentence] ?? [];
	return {
		attestationId: storyIds(story).attestationId,
		scrollId: STORY_SCROLL_ID,
		sentencePosition: story.sentence,
		sentenceSnippet: sentenceText(story.sentence),
		segments: segments.map(({ kind, text }) => ({ kind, text })),
		memberSegmentIndices: [...story.members],
		memberTexts: story.members.map((index) => segments[index]?.text ?? ""),
		origin: { kind: "Scroll" as const },
		target: scrollTarget(story),
	};
}

function readingNote(story: Story): NoteOf<"Reading"> {
	const ids = storyIds(story);
	const reading = story.lemma.readings[story.reading];
	const lemmaKey = JSON.stringify([
		"de",
		"Lexeme",
		story.lemma.kind,
		story.lemma.canonicalForm,
		[],
	]);
	const definition = reading?.definition ?? "";
	const text = (value: string) => [[{ kind: "Text" as const, text: value }]];
	const note = {
		kind: "Reading",
		target: { kind: "Reading", readingId: ids.readingId },
		reading: {
			unitKind: "Reading",
			ownerKind: "Reading",
			ownerKey: JSON.stringify([lemmaKey, reading?.emoji ?? ""]),
			readingId: ids.readingId,
			emojiDescription: reading?.emoji ?? "",
			lemma: {
				...lemmaOf(story),
				unitKind: "Lemma",
				ownerKind: "Lemma",
				ownerKey: lemmaKey,
				lemmaId: ids.lemmaId,
			},
		},
		knowledgeState: { status: "Full", activity: "Idle" },
		knowledge: {
			definition,
			translations: {
				en: text(reading?.en ?? ""),
				ru: text(reading?.ru ?? ""),
			},
		},
		knowledgeUpdatedAt: KNOWLEDGE_UPDATED_AT,
		personalAnnotation: "",
		relations: [],
		relationsTruncated: false,
		grammaticalAlternatives: [],
		sourceLinks: [],
		pendingRelations: [],
		structuralReferences: [],
		definitionText: {
			state: "Ready",
			sentence: definitionSentence(story, definition),
		},
		sourceContexts: {
			/* where the Reading was met: this click first, then the others */
			page: [
				story,
				...STORIES.filter(
					(other) =>
						other.key !== story.key &&
						storyIds(other).readingId === ids.readingId,
				),
			].map(sourceContext),
			continueCursor: "_end_cursor",
			isDone: true,
		},
	};
	/* the Note is per Kind; the fixture names its Kind as a string */
	return note as unknown as NoteOf<"Reading">;
}

function lemmaNote(story: Story): NoteOf<"Lemma"> {
	const { lemmaId } = storyIds(story);
	const note = {
		kind: "Lemma",
		target: { kind: "Lemma", lemmaId },
		presented: lemmaOf(story),
		connections: {
			readings: story.lemma.readings.map((reading, index) => {
				const { readingId } = storyIds({ ...story, reading: index });
				return {
					emojiDescription: reading.emoji,
					readingId,
					reflexive: null,
					target: { kind: "Reading", readingId },
				};
			}),
			sameWrittenForm: [],
			surfaces: [],
			continueCursor: "_end_cursor",
			isDone: true,
		},
		formations: [],
		participialAdjectives: [],
	};
	return note as unknown as NoteOf<"Lemma">;
}

function surfaceNote(story: Story): NoteOf<"Surface"> {
	const ids = storyIds(story);
	const note = {
		kind: "Surface",
		target: {
			kind: "Surface",
			language: "de",
			normalizedSurface: story.surface.normalizedSurface,
		},
		analyses: [
			{
				analysisKey: ids.surfaceId,
				surfaceId: ids.surfaceId,
				lemmaId: ids.lemmaId,
				lemmaTarget: { kind: "Lemma", lemmaId: ids.lemmaId },
				presented: presentedSurface(story),
			},
		],
		activeReading: null,
		continueCursor: "_end_cursor",
		isDone: true,
	};
	return note as unknown as NoteOf<"Surface">;
}

function attestationNote(story: Story): NoteOf<"Attestation"> {
	const ids = storyIds(story);
	const reading = story.lemma.readings[story.reading];
	const fusions = story.grammarMembers.flatMap((member) =>
		member.orthography === "Fused"
			? [
					{
						...member.fusion,
						realized: [member.component],
						oneLiner: `„${member.fusion.spelling}“ ist „${member.fusion.components
							.map(({ surface }) => surface)
							.join(" ")}“.`,
					},
				]
			: [],
	);
	const context = sourceContext(story);
	const note = {
		kind: "Attestation",
		target: { kind: "Attestation", attestationId: ids.attestationId },
		source: {
			scrollId: context.scrollId,
			sentencePosition: context.sentencePosition,
			sentenceSnippet: context.sentenceSnippet,
			segments: context.segments,
			memberSegmentIndices: context.memberSegmentIndices,
			origin: context.origin,
			target: context.target,
		},
		presented: {
			members: story.grammarMembers,
			valencyMembers: [],
			realizationCoverage: "Full",
			surface: presentedSurface(story),
			fusions,
		},
		surfaceTarget: {
			kind: "Surface",
			language: "de",
			normalizedSurface: story.surface.normalizedSurface,
		},
		reading: {
			emojiDescription: reading?.emoji ?? "",
			reflexive: null,
			valency: null,
			target: { kind: "Reading", readingId: ids.readingId },
		},
	};
	return note as unknown as NoteOf<"Attestation">;
}

/** A story's four stored Notes, whichever of them its Deck deals. */
export function storedNotesOf(story: Story) {
	return {
		Reading: readingNote(story),
		Lemma: lemmaNote(story),
		Surface: surfaceNote(story),
		Attestation: attestationNote(story),
	} as const;
}

/**
 * Every story's stored Notes, by the id the backend's Note queries are
 * asked with: a Reading's, a Lemma's and an Attestation's id, a Surface's
 * analysis key.
 */
export function storedNotesById(): ReadonlyMap<string, StoredNote> {
	const notes = new Map<string, StoredNote>();
	for (const story of STORIES) {
		const ids = storyIds(story);
		const stored = storedNotesOf(story);
		notes.set(ids.readingId, stored.Reading);
		notes.set(ids.lemmaId, stored.Lemma);
		notes.set(ids.surfaceId, stored.Surface);
		notes.set(ids.attestationId, stored.Attestation);
	}
	return notes;
}

/**
 * How a story's words stand in the text: untouched, resolving while their
 * Session runs, failed for good, or attested once it has committed.
 */
export type StoryStatus = "Active" | "PermanentFailure" | "Attested";

function segmentStatus(story: Story, status: StoryStatus | undefined) {
	if (status === undefined) return {};
	if (status !== "Attested") return { resolutionState: status };
	const gender = story.lemma.coreFeatures.gender;
	return {
		attestationId: storyIds(story).attestationId,
		...(typeof gender === "string" ? { gender } : {}),
	};
}

/**
 * The Scroll the stories are clicked in, as `scrollViews.get` returns it,
 * each story's words standing as `statusOf` says.
 */
export function storyScrollView(
	statusOf: (story: Story) => StoryStatus | undefined = () => undefined,
): ScrollView {
	const view = {
		kind: "Scroll",
		target: { kind: "Scroll", scrollId: STORY_SCROLL_ID },
		scrollId: STORY_SCROLL_ID,
		submissionKey: "story-scroll",
		sourceText: STORY_SENTENCES.map((_, index) => sentenceText(index)).join(
			" ",
		),
		createdAt: KNOWLEDGE_UPDATED_AT,
		sceneBreaks: [],
		sentences: STORY_SENTENCES.map((segments, sentence) => ({
			sentenceId: sentenceId(sentence),
			language: "de",
			paragraph: 0,
			position: sentence,
			stitchedText: sentenceText(sentence),
			segments: segments.map(({ kind, text }, index) => {
				const story = STORIES.find(
					(candidate) =>
						candidate.sentence === sentence &&
						candidate.members.includes(index),
				);
				const status = story ? statusOf(story) : undefined;
				return {
					index,
					kind,
					text,
					encountered: status === "Attested",
					...(story
						? {
								unit: {
									route: "Unresolved",
									segments: [...story.members],
								},
								...segmentStatus(story, status),
							}
						: {}),
				};
			}),
		})),
	};
	return view as unknown as ScrollView;
}
