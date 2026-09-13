import { getSchemaTreeFor, schemasFor } from "./schemas/public-schemas.js";

export { compactEmojiSequencePattern as dangerouslyHeavyCompactEmojiSequencePatternForAbout100MiBRss } from "./validation-semantics.js";

/**
 * Danger zone: importing this route-specific schema registry adds roughly
 * 100 MiB max RSS. Application validation should use Dumling's parseAsLemma,
 * parseAsSurface, parseAsAttestation, and parseAsReading interfaces instead.
 */
export const dangerouslyHeavySchemasForAbout100MiBRss = schemasFor;

/**
 * Danger zone: importing this route-specific schema tree adds roughly 100 MiB
 * max RSS. Application validation should use Dumling's lightweight parsers.
 */
export const getDangerouslyHeavySchemaTreeForAbout100MiBRss = getSchemaTreeFor;
