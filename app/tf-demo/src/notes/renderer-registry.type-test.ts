import { DE_RENDERER_REGISTRY } from "./de/registry";
import { RENDERER_REGISTRY } from "./renderer-registry";
import type { ReadingRenderContext } from "./universal/blocks/renderer";
import type { RendererRegistry } from "./universal/blocks/renderer-registry";

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
