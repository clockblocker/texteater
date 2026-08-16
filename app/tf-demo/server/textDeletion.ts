import { readingKeyFor } from "../convex/model/linguisticKeys";

type UnknownRecord = Record<string, unknown>;

export type PrunedKnowledge = {
	readonly changed: boolean;
	readonly value: unknown;
};

export function pruneReadingReferences(
	knowledgeValue: unknown,
	doomedReadingKeys: ReadonlySet<string>,
): PrunedKnowledge {
	const knowledge = optionalRecord(knowledgeValue);
	const semanticRelations = optionalRecord(knowledge?.semanticRelations);
	if (!knowledge || !semanticRelations || doomedReadingKeys.size === 0) {
		return { changed: false, value: knowledgeValue };
	}

	let changed = false;
	const nextRelations: UnknownRecord = {};
	for (const [relation, targetsValue] of Object.entries(semanticRelations)) {
		if (!Array.isArray(targetsValue)) {
			nextRelations[relation] = targetsValue;
			continue;
		}
		const targets = targetsValue.filter((target) => {
			const key = readingKeyFromUnknown(target);
			const keep = key === null || !doomedReadingKeys.has(key);
			if (!keep) changed = true;
			return keep;
		});
		if (targets.length > 0) nextRelations[relation] = targets;
		else if (targetsValue.length > 0) changed = true;
	}

	if (!changed) return { changed: false, value: knowledgeValue };
	const value: UnknownRecord = { ...knowledge };
	if (Object.keys(nextRelations).length > 0) {
		value.semanticRelations = nextRelations;
	} else {
		delete value.semanticRelations;
	}
	return { changed: true, value };
}

function readingKeyFromUnknown(value: unknown): string | null {
	const reading = optionalRecord(value);
	if (!reading || typeof reading.emojiDescription !== "string") return null;
	return readingKeyFor({
		lemma: reading.lemma,
		emojiDescription: reading.emojiDescription,
	});
}

function optionalRecord(value: unknown): UnknownRecord | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as UnknownRecord)
		: null;
}
