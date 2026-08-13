import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { markEveryMember, proverbInput, resolvedProverb } from "./builders";

export const contextualContrastCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-proverb-demo-wo-gehobelt-discontinuous": {
				input: proverbInput(
					`„${markEveryMember("Wo gehobelt wird")}, <TARGET>da</TARGET>“, erklärte der Meister und setzte das Sprichwort nach der Pause fort, „${markEveryMember("fallen Späne")}.“`,
				),
				idealOutput: resolvedProverb({
					attested: "Wo gehobelt wird da fallen Späne",
				}).idealOutput,
				explanation:
					"The attribution interrupts one quotation but remains unmarked context; all supplied proverb members stay in source order.",
			},
			"grammar-de-proverb-accept-frueher-vogel-slogan-context": {
				...resolvedProverb({
					attested: "Der frühe Vogel fängt den Wurm",
					prefix: "Nachdem die Gruppe den Werbeslogan „Geiz ist geil“ verworfen hatte, begründete Tom den frühen Start mit dem Sprichwort „",
					suffix: ".“",
				}),
				explanation:
					"The unmarked slogan is route-contrast context and does not enter membership.",
			},
			"grammar-de-proverb-accept-eile-discourse-context": {
				...resolvedProverb({
					attested: "Eile mit Weile",
					prefix: "Nach der Begrüßung „Guten Morgen“ bremste die Ausbilderin den hektischen Lehrling mit „",
					suffix: ".“",
				}),
				explanation:
					"The unmarked greeting is a nearby DiscourseFormula; the marked Proverb remains authoritative.",
			},
			"grammar-de-proverb-accept-betten-idiom-context": {
				...resolvedProverb({
					attested: "Wie man sich bettet, so liegt man",
					prefix: "Obwohl im Gespräch zuvor die Redewendung „den Nagel auf den Kopf treffen“ gefallen war, kommentierte sie die selbst gewählte Lage mit „",
					suffix: ".“",
				}),
				explanation:
					"The unmarked Idiom mention does not affect the fixed Proverb target.",
			},
			"grammar-de-proverb-accept-doppelt-quotation-context": {
				...resolvedProverb({
					attested: "Doppelt gemoppelt hält besser",
					prefix: "Die bloße Meldung „Der Bus kommt später“ war nur eine gewöhnliche Aussage; als sie beide Kopien einpackte, scherzte Mia dagegen: „",
					suffix: ".“",
				}),
				explanation:
					"The arbitrary unmarked quotation and ordinary assertion remain contextual contrast.",
			},
			"grammar-de-proverb-accept-gaul-aphorism-context": {
				...resolvedProverb({
					attested:
						"Einem geschenkten Gaul schaut man nicht ins Maul",
					prefix: "Nach dem Aphorismus „Alt werden heißt sehend werden“ wechselte die Dozentin zu einem traditionellen Sprichwort: „",
					suffix: ".“",
				}),
				explanation:
					"The explicitly framed unmarked Aphorism is context, not a reason to reopen the marked target's route.",
			},
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
