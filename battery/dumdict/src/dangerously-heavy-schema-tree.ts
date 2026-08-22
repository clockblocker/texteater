import { getDumdictSchemasFor } from "./schema";

/**
 * Danger zone: importing the language-specific Dumdict schema registry reaches
 * Dumling's route tree and adds roughly 100 MiB max RSS. Application validation
 * should use Dumdict's lightweight parser interfaces instead.
 */
export const getDangerouslyHeavyDumdictSchemaTreeForAbout100MiBRss =
	getDumdictSchemasFor;
