import { expect, test } from "bun:test";
import type {
	AccumulateTranslationsInput,
	KnowledgeProduction,
	ProduceKnowledgeInput,
	TranslationAccumulation,
} from "../src/knowledge/types.js";
import type { LanguageModule } from "../src/language-module.js";
import type {
	GrammarResolution,
	ResolveGrammarInput,
	ResolveReadingInput,
} from "../src/resolve/types.js";
import type {
	Route,
	SegmentedSentence,
} from "../src/segment/segmented-sentence.js";
import type { Dumgen } from "./service-test-adapter.js";

/** Compile-only contract: Hebrew identities must not be disguised as German. */
function languageContracts(
	de: LanguageModule<"de">,
	he: LanguageModule<"he">,
	grammar: ResolveGrammarInput<"he">,
	reading: ResolveReadingInput<"he">,
	knowledge: ProduceKnowledgeInput<never, "he">,
	accumulation: AccumulateTranslationsInput<"he">,
	dumgen: Dumgen,
) {
	const hebrewRoute: Route<"he"> = {
		language: "he",
		family: "Lexeme",
		kind: "NOUN",
	};
	// @ts-expect-error A German route never accepts Hebrew identity.
	const germanRoute: Route<"de"> = hebrewRoute;
	// @ts-expect-error A German handler cannot masquerade as a Hebrew module.
	const wrongModule: LanguageModule<"he"> = de;
	const grammarResult: ReturnType<typeof he.resolveGrammar> =
		dumgen.resolve.grammar(grammar);
	const readingResult: ReturnType<typeof he.resolveReading> =
		dumgen.resolve.reading(reading);
	const knowledgeResult: ReturnType<typeof he.produceKnowledge<never>> =
		dumgen.knowledge.produce(knowledge);
	const accumulationResult: ReturnType<typeof he.accumulateTranslations> =
		dumgen.knowledge.accumulateTranslations(accumulation);
	const accumulated: TranslationAccumulation<"he"> = {
		changes: [],
		failures: [],
	};
	// @ts-expect-error A German accumulation cannot accept Hebrew identity.
	const wrongAccumulation: AccumulateTranslationsInput<"de"> = accumulation;
	const wrongModuleAccumulation = de.accumulateTranslations(
		// @ts-expect-error A German module must not handle Hebrew accumulation.
		accumulation,
	);
	const result: KnowledgeProduction<"he"> = {
		changes: [],
		pendingRelations: [],
		paradigmChanges: [],
		failures: [],
	};
	const sentence: SegmentedSentence<"he"> = grammar.sentence;
	const resolved: GrammarResolution<"he"> = { _tag: "Unresolved" };
	return {
		germanRoute,
		wrongModule,
		grammarResult,
		readingResult,
		knowledgeResult,
		accumulationResult,
		accumulated,
		wrongAccumulation,
		wrongModuleAccumulation,
		result,
		sentence,
		resolved,
	};
}

test("language contracts are statically checked without model calls", () => {
	expect(typeof languageContracts).toBe("function");
});
