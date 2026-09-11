import { DE_RENDERER_REGISTRY } from "./de/registry";
import { RENDERER_REGISTRY } from "./renderer-registry";
import type {
	NoteBlockRenderer,
	ReadingRenderContext,
} from "./universal/blocks/renderer";
import type { RendererRegistry } from "./universal/blocks/renderer-registry";
import { renderDefaultReadingHeader } from "./universal/blocks/renderers/reading/header/default";

DE_RENDERER_REGISTRY satisfies RendererRegistry<"de">;
RENDERER_REGISTRY satisfies RendererRegistry;

type RegistryWithoutGerman = Omit<typeof RENDERER_REGISTRY, "de">;
declare const registryWithoutGerman: RegistryWithoutGerman;
// @ts-expect-error Every supported language must own a registry.
const missingLanguage: RendererRegistry = registryWithoutGerman;
void missingLanguage;

type GermanRegistryWithoutShadow = Omit<typeof DE_RENDERER_REGISTRY, "Shadow">;
declare const germanRegistryWithoutShadow: GermanRegistryWithoutShadow;
// @ts-expect-error Every Note kind must be deliberately registered.
const missingNoteKind: RendererRegistry<"de"> = germanRegistryWithoutShadow;
void missingNoteKind;

DE_RENDERER_REGISTRY.Reading.Lexeme satisfies RendererRegistry<
	"de",
	"Reading",
	"Lexeme"
>;
DE_RENDERER_REGISTRY.Reading.Lexeme.VERB satisfies RendererRegistry<
	"de",
	"Reading",
	"Lexeme",
	"VERB"
>;

renderDefaultReadingHeader satisfies NoteBlockRenderer<
	"de",
	"Reading",
	"Lexeme",
	"NOUN"
>;
DE_RENDERER_REGISTRY.Reading.Lexeme.VERB.Header satisfies NoteBlockRenderer<
	"de",
	"Reading",
	"Lexeme",
	"VERB"
>;

// @ts-expect-error Only supported target languages can own a registry.
type UnknownLanguageRegistry = RendererRegistry<"fr">;
// @ts-expect-error Only stable Note kinds can own a registry slice.
type UnknownNoteRegistry = RendererRegistry<"de", "Resolution">;
// @ts-expect-error Only grammatical Families supported by the language are valid.
type InvalidFamilyRegistry = RendererRegistry<"de", "Reading", "Construction">;
type InvalidFamilyKindRegistry = RendererRegistry<
	"de",
	"Reading",
	"Lexeme",
	"Aphorism"
>;
// @ts-expect-error A Phraseme Kind cannot address a Lexeme slice.
const invalidFamilyKindRegistry: InvalidFamilyKindRegistry = {};
void (null as unknown as UnknownLanguageRegistry);
void (null as unknown as UnknownNoteRegistry);
void (null as unknown as InvalidFamilyRegistry);
void invalidFamilyKindRegistry;

const nounOnlyHeader = (
	_context: ReadingRenderContext<"de", "Lexeme", "NOUN">,
) => null;
const verbRoute = {
	Lexeme: {
		VERB: {
			// @ts-expect-error A NOUN renderer cannot be registered for a VERB route.
			Header: nounOnlyHeader,
		},
	},
} satisfies RendererRegistry<"de", "Reading">;
void verbRoute;

const invalidBlock = {
	Header: renderDefaultReadingHeader,
	// @ts-expect-error Unknown Blocks cannot enter a route map.
	PronunciationGuide: renderDefaultReadingHeader,
} satisfies RendererRegistry<"de", "Reading", "Lexeme", "NOUN">;
void invalidBlock;
