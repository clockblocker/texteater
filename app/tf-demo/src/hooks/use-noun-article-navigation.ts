import { useMutation } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useNounArticleNavigation() {
	const openArticle = useAction(api.orchestration.followNounArticle);
	const { follow } = useWorkspaceInteraction();
	const mutation = useMutation({
		mutationFn: async (lemmaId: Id<"lemmas">) => {
			const readingId = await openArticle({ lemmaId });
			follow({ kind: "Reading", readingId });
		},
	});
	return {
		follow: mutation.mutate,
		pending: mutation.isPending,
		error: mutation.error
			? "Could not open the article. Please retry."
			: null,
	};
}
