/**
 * The language registry (#772): each language Dumgen runs, with its module.
 * Registering a language adds it to `SegmentLanguage` and here.
 */
import { germanLanguage } from "./de/language.js";
import type { LanguageModules } from "./language-module.js";
import type { GermanInventory } from "./segment/de/inventory.js";

/** The options a language module is built from. */
export type LanguageOptions = {
	/** The German Authored Inventories the unit stage reads; dumcorpus's by default. */
	readonly inventory?: GermanInventory;
};

/** Every registered language's module, built from the instance's options. */
export function languageModules(options: LanguageOptions): LanguageModules {
	return { de: germanLanguage(options) };
}
