import { ConvexQueryClient } from "@convex-dev/react-query";
import { RegistryProvider } from "@effect/atom-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider, TooltipProvider } from "lego";
import type { ReactNode } from "react";
import { MotionPreferenceSync } from "@/lib/motion-preference";

function requireConvexUrl() {
	const convexUrl = import.meta.env.VITE_CONVEX_URL;

	if (!convexUrl) {
		throw new Error(
			"VITE_CONVEX_URL is not set. Start the app with `bun run dev` so Convex can configure the local deployment.",
		);
	}

	return convexUrl;
}

const convexClient = new ConvexReactClient(requireConvexUrl());
type AdapterClient = ConstructorParameters<typeof ConvexQueryClient>[0];

// Bun 1.3.0 gives the adapter's Convex peer and the app's Convex install
// distinct private type identities. At runtime this is deliberately the one
// top-level client shared by the adapter, provider, queries, and actions.
const convexQueryClient = new ConvexQueryClient(
	convexClient as unknown as AdapterClient,
);
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			queryKeyHashFn: convexQueryClient.hashFn(),
			queryFn: convexQueryClient.queryFn(),
			gcTime: 10_000,
		},
	},
});

convexQueryClient.connect(queryClient);

export function AppProvider({ children }: { children: ReactNode }) {
	// The atom registry is outermost so every subtree, Convex-backed or not,
	// shares one registry and its lifetime is the app's.
	return (
		<RegistryProvider>
			<MotionPreferenceSync />
			<ConvexProvider client={convexClient}>
				<QueryClientProvider client={queryClient}>
					<ThemeProvider
						defaultTheme="dark"
						storageKey="tf-demo-theme"
					>
						<TooltipProvider>{children}</TooltipProvider>
					</ThemeProvider>
				</QueryClientProvider>
			</ConvexProvider>
		</RegistryProvider>
	);
}
