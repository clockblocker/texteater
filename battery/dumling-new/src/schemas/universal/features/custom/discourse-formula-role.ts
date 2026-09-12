import { z } from "zod";

const GREETING = z.literal("Greeting");
const FAREWELL = z.literal("Farewell");
const APOLOGY = z.literal("Apology");
const THANKS = z.literal("Thanks");
const ACKNOWLEDGMENT = z.literal("Acknowledgment");
const REFUSAL = z.literal("Refusal");
const REQUEST = z.literal("Request");
const REACTION = z.literal("Reaction");
const INITIATION = z.literal("Initiation");
const TRANSITION = z.literal("Transition");

export const DiscourseFormulaRoleSchema = z.enum([
	GREETING.value,
	FAREWELL.value,
	APOLOGY.value,
	THANKS.value,
	ACKNOWLEDGMENT.value,
	REFUSAL.value,
	REQUEST.value,
	REACTION.value,
	INITIATION.value,
	TRANSITION.value,
]);
export const DiscourseFormulaRole = DiscourseFormulaRoleSchema.enum;
export type DiscourseFormulaRole = z.infer<typeof DiscourseFormulaRoleSchema>;
