import { z } from "zod";

const normalizedMemberSchema = z.string().min(1).regex(/^\S+$/u, {
	message: "A normalized member must contain no whitespace.",
});

export const normalizedMembersSchema = z.array(normalizedMemberSchema).min(1);
