import { translationLanguageValues } from "dumrel";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { loadKnowledgeSettings } from "../knowledgeSettings";
import { demandKnowledgeAttempt } from "./knowledgeAttempts";
import {
	findAccumulatedKnowledge,
	missingKnowledge,
	nothingMissing,
	occurrenceGovernment,
} from "./knowledgeCoverage";
import { loadOccurrenceAttestation } from "./occurrenceAttestations";

export function assertKey(value: string, name: string): void {
	if (value.trim().length === 0 || value.length > 200) {
		throw new Error(`${name} must contain between 1 and 200 characters.`);
	}
}

/**
 * Demands a Knowledge attempt for whatever an occurrence's Reading still
 * lacks. It lives outside the `knowledgeGeneration` registration module so
 * the click path doesn't bundle the publication machinery.
 */
export async function scheduleKnowledgeGeneration(
	ctx: MutationCtx,
	input: {
		attemptKey: string;
		knowledgeDraftJson?: string;
		visitorId: string;
		readingId: Id<"readings">;
		attestationId: Id<"attestations">;
	},
): Promise<void> {
	assertKey(input.attemptKey, "attemptKey");
	assertKey(input.visitorId, "visitorId");
	if (!ctx.scheduler) return;
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
	const [accumulated, settings] = await Promise.all([
		findAccumulatedKnowledge(ctx, ownerReadingKey),
		loadKnowledgeSettings(ctx, input.visitorId),
	]);
	const translationLanguages = translationLanguageValues.filter(
		(language) => settings.translations[language],
	);
	const missing = missingKnowledge(accumulated, {
		translationLanguages,
		// Government can only be all that is missing once the base is covered.
		attestedGovernment:
			accumulated?.status === "Full"
				? await occurrenceGovernment(ctx, occurrence)
				: [],
	});
	if (nothingMissing(missing)) return;
	await demandKnowledgeAttempt(ctx, {
		...input,
		ownerReadingKey,
		translationLanguages,
	});
}
