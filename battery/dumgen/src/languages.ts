/**
 * The language registry (#772): each language Dumgen runs, with its module.
 * Registering a language adds it to `SegmentLanguage` and here. The
 * operations read the modules from `Languages`, the registry built with
 * dumcorpus's inventories unless the host provides others.
 */
import type * as Dumling from "dumling/types";
import * as Context from "effect/Context";
import { germanLanguage } from "./de/language.js";
import { hebrewLanguage } from "./he/language.js";
import type { LanguageModule, LanguageModules } from "./language-module.js";
import type { GermanInventory } from "./segment/de/inventory.js";

/** The options a language module is built from. */
export type LanguageOptions = {
	/** The German Authored Inventories the unit stage reads; dumcorpus's by default. */
	readonly inventory?: GermanInventory;
};

/** Add a language-owned module here; shared operations need no language branches. */
export const languageFactories = {
	de: germanLanguage,
	he: (_options: LanguageOptions): LanguageModule<"he"> => hebrewLanguage,
} satisfies {
	readonly [L in Dumling.Language]?: (
		options: LanguageOptions,
	) => LanguageModule<L>;
};

/** A supported language, derived from the registry rather than a second list. */
export function isSegmentLanguage(
	language: string,
): language is keyof typeof languageFactories {
	return Object.hasOwn(languageFactories, language);
}

/** Every registered language's module, built from the instance's options. */
export function languageModules(options: LanguageOptions): LanguageModules {
	// Each factory is checked against its key above. Object.fromEntries drops
	// that mapped-key correlation; restore it only at this construction boundary.
	return Object.fromEntries(
		Object.entries(languageFactories).map(([language, factory]) => [
			language,
			factory(options),
		]),
	) as LanguageModules;
}

/** The language modules the operations run: `languageModules({})` by default. */
export const Languages = Context.Reference<LanguageModules>(
	"dumgen/Languages",
	{ defaultValue: () => languageModules({}) },
);
