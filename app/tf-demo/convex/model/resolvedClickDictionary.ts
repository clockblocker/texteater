import type { Infer } from "convex/values";
import { authoredReading } from "dumcorpus/inventories";
import { makeSurfaceId } from "dumdict/planning";
import {
	emojiDescriptionOf,
	readingIdentityKey,
} from "../../server/linguisticIdentity";
import {
	parseAttestation,
	parseReading,
} from "../../server/operationalParsing";
import type { MutationCtx } from "../_generated/server";
import {
	createDumdictTransaction,
	type DumdictTransactionOutcome,
	findReadingByKey,
	findSurface,
	storedReadingsOf,
} from "./dumdictTransaction";
import type {
	occurrenceAttestationInputValidator,
	readingDecisionValidator,
	readingValueValidator,
} from "./validators";

function emptyNote() {
	return {
		attestedTranslations: [] as string[],
		attestations: [] as string[],
		notes: "",
	};
}

/**
 * Plans the dictionary side of a resolved occurrence inside this transaction.
 * A New Reading becomes a Reading Note owning the attested Surface; a reused
 * Reading only gains the Surface if the dictionary does not own it yet.
 *
 * A New decision was made before this transaction, so it is checked against
 * the state read here. A Reading another commit stored since is reused, and
 * a Surface already stored, as when a homonym's Lemma owns it, is left out of
 * the new Reading Note and ensured afterwards.
 */
export async function planAndCommitDictionary(
	ctx: MutationCtx,
	args: {
		readonly reading: Infer<typeof readingValueValidator>;
		readonly readingKey: string;
		readonly readingDecision: Infer<typeof readingDecisionValidator>;
		readonly occurrence: Infer<typeof occurrenceAttestationInputValidator>;
	},
): Promise<DumdictTransactionOutcome> {
	const reading = parseReading(args.reading);
	const dictionary = createDumdictTransaction(ctx, reading.lemma.language);
	const ownedSurface = {
		surface: parseAttestation(args.occurrence.attestation).surface,
		note: emptyNote(),
	};
	if (
		args.readingDecision === "Reuse" ||
		(await findReadingByKey(ctx, args.readingKey))
	)
		return dictionary.ensureOwnedSurface({ reading, ownedSurface });
	const surfaceStored =
		(await findSurface(
			ctx,
			makeSurfaceId(ownedSurface.surface.language, ownedSurface.surface),
		)) !== null;
	const added = await dictionary.addNewNote({
		draft: {
			reading,
			note: emptyNote(),
			ownedSurfaces: surfaceStored ? [] : [ownedSurface],
		},
	});
	return added.status === "committed" && surfaceStored
		? dictionary.ensureOwnedSurface({ reading, ownedSurface })
		: added;
}

/**
 * The Lemma's stored Emoji Descriptions when a New must be refused as stale:
 * its judge saw `readingCandidates`, and the Lemma has gained a Reading
 * outside them since (ADR 0031). Undefined when the New stands: no judge
 * took part (an authored or Foreign Reading), or the Reading is stored by
 * now, which the commit reuses.
 */
export async function staleNewReading(
	ctx: MutationCtx,
	args: {
		readonly reading: Infer<typeof readingValueValidator>;
		readonly readingKey: string;
		readonly readingDecision: Infer<typeof readingDecisionValidator>;
		readonly readingCandidates?: readonly string[];
		readonly occurrence: Infer<typeof occurrenceAttestationInputValidator>;
	},
): Promise<readonly string[] | undefined> {
	const seen = args.readingCandidates;
	if (args.readingDecision !== "New" || seen === undefined) return undefined;
	if (authoredReading(args.reading)) return undefined;
	if (await findReadingByKey(ctx, args.readingKey)) return undefined;
	const { lemma } = parseReading(args.reading);
	const keyOf = (emojiDescription: string) =>
		readingIdentityKey({ unitKind: "Reading", lemma, emojiDescription });
	const judged = new Set(seen.map(keyOf));
	const stored = await storedReadingsOf(ctx, args.occurrence.lemmaKey);
	return stored.some((reading) => !judged.has(readingIdentityKey(reading)))
		? stored.flatMap(
				(reading) => emojiDescriptionOf(parseReading(reading)) ?? [],
			)
		: undefined;
}
