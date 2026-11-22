import { translationLanguageValues } from "dumrel";
import { assertIdentifier } from "../../server/identifiers";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { loadKnowledgeSettings } from "../knowledgeSettings";
import { projectReadingValue } from "../modules/notes/projections";
import { completeAuthoredComponentKnowledge } from "./dumdictTransaction";
import { inspectRequestIdFor } from "./inspection";
import { demandKnowledgeAttempt } from "./knowledgeAttempts";
import {
	findAccumulatedKnowledge,
	missingKnowledge,
	nothingMissing,
} from "./knowledgeCoverage";
import { loadOccurrenceAttestation } from "./occurrenceAttestations";

/**
 * Demands a Knowledge attempt for whatever an occurrence's Reading still
 * lacks. It lives outside the `knowledgeGeneration` registration module so
 * the click path doesn't bundle the publication machinery.
 */
export async function scheduleKnowledgeGeneration(
	ctx: MutationCtx,
	input: {
		attemptKey: string;
		visitorId: string;
		readingId: Id<"readings">;
		attestationId: Id<"attestations">;
		inspect?: boolean;
	},
): Promise<void> {
	assertIdentifier(input.attemptKey, "attemptKey");
	assertIdentifier(input.visitorId, "visitorId");
	const occurrence = await loadOccurrenceAttestation(
		ctx,
		input.attestationId,
	);
	if (!occurrence || occurrence.reading._id !== input.readingId) {
		throw new Error(
			"Knowledge generation requires the exact saved occurrence.",
		);
	}
	const ownerReadingKey = occurrence.reading.readingKey;
	const inspectRequestId = await inspectRequestIdFor(
		ctx,
		input.attemptKey,
		input.inspect,
	);
	// An exact authored Reading publishes its reviewed Knowledge with no
	// model call (ADR 0021); Dumgen would answer it with a Catalog Miss.
	await completeAuthoredComponentKnowledge(
		ctx,
		projectReadingValue(occurrence.reading, occurrence.lemma),
		inspectRequestId ? { inspectRequestId } : undefined,
	);
	const [accumulated, settings] = await Promise.all([
		findAccumulatedKnowledge(ctx, ownerReadingKey),
		loadKnowledgeSettings(ctx, input.visitorId),
	]);
	const translationLanguages = translationLanguageValues.filter(
		(language) => settings.translations[language],
	);
	const missing = missingKnowledge(accumulated, { translationLanguages });
	if (nothingMissing(missing)) return;
	await demandKnowledgeAttempt(ctx, {
		...input,
		inspect: inspectRequestId !== undefined,
		ownerReadingKey,
		translationLanguages,
	});
}
