import { z } from "zod";

const YES = z.literal("Yes");

/**
 * Whether an ADV or ADJ Lemma has comparison forms of its own: inflected
 * (`schneller`, `faster`) or suppletive (`gern` → `lieber`). Periphrastic
 * `more` and colloquial forms (`töter`) do not count. `null` means none, so
 * its Surfaces never mark Degree (ADR 0042).
 */
export const ComparableSchema = z.enum([YES.value]);
export const Comparable = ComparableSchema.enum;
export type Comparable = z.infer<typeof ComparableSchema>;
