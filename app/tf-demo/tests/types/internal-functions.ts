import type { api } from "../../convex/_generated/api";

// @ts-expect-error A Knowledge retry starts a paid run, so only the server may call it.
export type PublicKnowledgeRetry = typeof api.knowledgeGeneration.retry;
