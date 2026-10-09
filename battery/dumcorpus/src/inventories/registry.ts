import { germanInventory } from "./de/inventory.js";
import type { AuthoredMember, InventoryLanguage } from "./member.js";

/** What the language-generic selectors read from one language's Authored Inventory. */
export type LanguageInventory<L extends InventoryLanguage> = {
	/** Every authored member, Syncretisms included (system ADR 0046). */
	readonly members: readonly AuthoredMember<L>[];
	/** Whether a route of this language resolves only to authored members (system ADR 0021). */
	readonly closedRoute: (route: {
		readonly family: string;
		readonly kind: string;
	}) => boolean;
};

/** Each language's Authored Inventory. A language missing here has none. */
const inventories: {
	readonly [L in InventoryLanguage]: LanguageInventory<L>;
} = { de: germanInventory };

/** The Authored Inventory of `language`, or undefined where it has none. */
export function inventoryOf(
	language: string,
): LanguageInventory<InventoryLanguage> | undefined {
	const byLanguage: Readonly<
		Record<string, LanguageInventory<InventoryLanguage>>
	> = inventories;
	return Object.hasOwn(byLanguage, language)
		? byLanguage[language]
		: undefined;
}

/** Every authored member of every language, in registration order. */
export const authoredMembers: readonly AuthoredMember[] = Object.values(
	inventories,
).flatMap((inventory) => inventory.members);
