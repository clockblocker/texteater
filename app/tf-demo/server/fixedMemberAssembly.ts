import type { ReadingEntry } from "dumdict";
import { allFixedLemmaCatalogs, fixedMembersFor } from "dumling/fixed";
import { readingFingerprint } from "dumling/reading";
import type { Lemma, Reading } from "dumling/types";
import {
	allFixedGrammaticalRelationClaims,
	type FixedKnowledgeLookup,
	fixedKnowledgeFor,
} from "dumrel/fixed";
import type { GrammaticalRelationClaim } from "dumrel/types";

type GermanLemmaCatalog = Readonly<{
	route: Readonly<{ language: string }>;
	members: readonly Lemma<"de">[];
}>;

export type FixedInventoryAssemblySources = Readonly<{
	lemmaCatalogs: readonly GermanLemmaCatalog[];
	readingsFor: (
		lemma: Lemma<"de">,
	) =>
		| Readonly<{ scope: string; members: readonly Reading<"de">[] }>
		| undefined;
	knowledgeFor: (reading: Reading<"de">) => FixedKnowledgeLookup;
	grammaticalRelations?: readonly GrammaticalRelationClaim[];
}>;

export type FixedInventory = Readonly<{
	lemmas: readonly Lemma<"de">[];
	readingEntries: readonly ReadingEntry<"de">[];
	grammaticalRelations: readonly GrammaticalRelationClaim[];
}>;

function defaultSources(): FixedInventoryAssemblySources {
	return {
		lemmaCatalogs: allFixedLemmaCatalogs().filter(
			({ route }) => route.language === "de",
		) as unknown as readonly GermanLemmaCatalog[],
		readingsFor: (lemma) =>
			fixedMembersFor.reading(
				lemma as Parameters<typeof fixedMembersFor.reading>[0],
			) as
				| Readonly<{
						scope: string;
						members: readonly Reading<"de">[];
				  }>
				| undefined,
		knowledgeFor: (reading) =>
			fixedKnowledgeFor(
				reading as Parameters<typeof fixedKnowledgeFor>[0],
			),
		grammaticalRelations: allFixedGrammaticalRelationClaims(),
	};
}

/**
 * Application-owned composition of package-owned fixed inventories. The
 * returned values are ordinary Dumdict Reading Entries, not a second storage
 * model or an application-owned linguistic catalog.
 */
export function assembleFixedInventory(
	sources: FixedInventoryAssemblySources = defaultSources(),
): FixedInventory {
	const lemmas: Lemma<"de">[] = [];
	const entries: ReadingEntry<"de">[] = [];
	const lemmaKeys = new Set<string>();
	const readingKeys = new Set<string>();
	for (const lemmaCatalog of sources.lemmaCatalogs) {
		if (lemmaCatalog.route.language !== "de") continue;
		for (const lemma of lemmaCatalog.members) {
			const lemmaKey = readingFingerprint({
				lemma,
				emojiDescription: "fixed-lemma-identity",
			});
			if (lemmaKeys.has(lemmaKey)) {
				throw new Error(`Duplicate fixed Lemma ${lemmaKey}.`);
			}
			lemmaKeys.add(lemmaKey);
			lemmas.push(lemma);
			const readingCatalog = sources.readingsFor(lemma);
			// Lemma-only Closed routes deliberately have no Reading catalog.
			if (!readingCatalog) continue;
			for (const candidate of readingCatalog.members) {
				const reading = candidate as Reading<"de">;
				const readingKey = readingFingerprint(reading);
				if (readingKeys.has(readingKey)) {
					throw new Error(`Duplicate fixed Reading ${readingKey}.`);
				}
				const found = sources.knowledgeFor(reading);
				if (found.decision !== "Found") {
					throw new Error(
						`Fixed Knowledge is missing for ${readingKey}.`,
					);
				}
				if (found.scope !== readingCatalog.scope) {
					throw new Error(
						`Fixed Reading and Knowledge scopes disagree for ${readingKey}.`,
					);
				}
				readingKeys.add(readingKey);
				entries.push({
					reading,
					knowledge:
						found.knowledge as ReadingEntry<"de">["knowledge"],
					attestedTranslations: [],
					attestations: [],
					notes: "",
				});
			}
		}
	}
	return Object.freeze({
		lemmas: Object.freeze(lemmas),
		readingEntries: Object.freeze(entries),
		grammaticalRelations: Object.freeze([
			...(sources.grammaticalRelations ?? []),
		]),
	});
}

export function fixedReadingEntries(): readonly ReadingEntry<"de">[] {
	return assembleFixedInventory().readingEntries;
}
