import type * as Dumling from "dumling/types";

import { assertEmojiDescriptionNormalized } from "../core/validate-slice";
import type {
	DumdictReadingDraft,
	DumdictSemanticRelationDraft,
	OwnedSurfaceDraft,
} from "../dto";
import { makeSurfaceId } from "../dumling-id";
import {
	parseAsLemmaRecord,
	parseAsReadingEntry,
	parseAsSurfaceEntry,
	parsePendingSemanticRelationForDumdictRuntime,
	parseReadingForDumdictRuntime,
	pendingTargetsLanguage,
	unwrapDumdictParse,
} from "../parsing/lightweight-parsers";
import type {
	AddNewNoteRequest,
	EnsureOwnedSurfaceRequest,
	EnsureReadingEntryRequest,
} from "../public";

/*
 * Each workflow request parsed whole on the way in, through the routes its
 * plan's values would take, so its plan holds only parsed values. A malformed
 * value throws `ParsingError`, and a Reading whose Emoji Description isn't
 * normalized throws as the slice validation does.
 */

/** A Reading Entry: the Reading, its note fields and any Knowledge. */
function parseEntry<L extends Dumling.Language>(
	language: L,
	entry: EnsureReadingEntryRequest<L>["entry"],
): EnsureReadingEntryRequest<L>["entry"] {
	const parsed = unwrapDumdictParse(parseAsReadingEntry(entry, language));
	assertEmojiDescriptionNormalized(entry.reading, parsed.reading);
	return parsed;
}

/** A Surface and its note, as the Surface Entry its Lemma would own. */
function parseOwnedSurface<L extends Dumling.Language>(
	language: L,
	ownerLemma: Dumling.Lemma<L>,
	owned: OwnedSurfaceDraft<L>,
): OwnedSurfaceDraft<L> {
	const {
		id: _id,
		ownerLemma: _ownerLemma,
		surface,
		...note
	} = unwrapDumdictParse(
		parseAsSurfaceEntry(
			{
				id: makeSurfaceId(language, owned.surface),
				surface: owned.surface,
				ownerLemma,
				...owned.note,
			},
			language,
		),
	);
	return { surface, note };
}

export function parseEnsureReadingEntryRequest<L extends Dumling.Language>(
	language: L,
	request: EnsureReadingEntryRequest<L>,
): EnsureReadingEntryRequest<L> {
	return { entry: parseEntry(language, request.entry) };
}

export function parseEnsureOwnedSurfaceRequest<L extends Dumling.Language>(
	language: L,
	request: EnsureOwnedSurfaceRequest<L>,
): EnsureOwnedSurfaceRequest<L> {
	const reading = unwrapDumdictParse(
		parseReadingForDumdictRuntime(request.reading, language),
	);
	assertEmojiDescriptionNormalized(request.reading, reading);
	return {
		reading,
		ownedSurface: parseOwnedSurface(
			language,
			reading.lemma,
			request.ownedSurface,
		),
	};
}

/**
 * A draft's relations parsed, or undefined when a target uses another
 * language. A pending target is parsed before its language is read.
 */
function parseRelationDrafts<L extends Dumling.Language>(
	language: L,
	relations: readonly DumdictSemanticRelationDraft<L>[],
): DumdictSemanticRelationDraft<L>[] | undefined {
	const parsed: DumdictSemanticRelationDraft<L>[] = [];
	for (const relation of relations) {
		if (relation.target.kind === "pending") {
			const pending = unwrapDumdictParse(
				parsePendingSemanticRelationForDumdictRuntime(
					relation.target.pending,
				),
			);
			if (!pendingTargetsLanguage(pending, language)) return undefined;
			parsed.push({ target: { kind: "pending", pending } });
			continue;
		}
		const { lemma } = relation.target;
		if (lemma.language !== language) return undefined;
		// An existing target's draft names its relation, which narrows the union.
		if ("relation" in relation)
			parsed.push({
				relation: relation.relation,
				target: {
					kind: "existing",
					lemma: unwrapDumdictParse(
						parseAsLemmaRecord({ lemma }, language),
					).lemma,
				},
			});
	}
	return parsed;
}

/**
 * The draft parsed, or undefined when a relation target uses another
 * language, which the caller refuses before parsing the rest.
 */
export function parseAddNewNoteRequest<L extends Dumling.Language>(
	language: L,
	request: AddNewNoteRequest<L>,
): AddNewNoteRequest<L> | undefined {
	const { draft } = request;
	const relations =
		draft.relations && parseRelationDrafts(language, draft.relations);
	if (draft.relations && !relations) return undefined;
	// The note becomes the new Reading Entry's content, so it parses as one.
	const { reading, ...note } = parseEntry(language, {
		reading: draft.reading,
		...draft.note,
	});
	const parsed: DumdictReadingDraft<L> = {
		reading,
		note,
		...(draft.ownedSurfaces && {
			ownedSurfaces: draft.ownedSurfaces.map((owned) =>
				parseOwnedSurface(language, reading.lemma, owned),
			),
		}),
		...(relations && { relations }),
	};
	return { draft: parsed };
}
