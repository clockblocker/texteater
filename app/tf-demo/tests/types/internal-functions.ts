import type { api } from "../../convex/_generated/api";

declare const knowledgeGeneration: typeof api.knowledgeGeneration;

// @ts-expect-error A Knowledge retry starts a paid run, so only the server may call it.
void knowledgeGeneration.retry;
