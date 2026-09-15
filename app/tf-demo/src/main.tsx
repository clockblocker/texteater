import { initializeTheme } from "lego";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initializeMotionPreference } from "@/lib/motion-preference";
import { isPlaygroundPath } from "@/playground/playground-router";

import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("The #root element is required to mount tf-demo.");
}

initializeTheme({ defaultTheme: "dark", storageKey: "tf-demo-theme" });
initializeMotionPreference();

// Everything lives at `/`. The dev-only Playground is the one exception and
// keeps its own path so its pages can be reloaded and linked to.
const keepsPath =
	import.meta.env.DEV && isPlaygroundPath(window.location.pathname);
if (keepsPath) {
	if (window.location.search !== "" || window.location.hash !== "") {
		window.history.replaceState(null, "", window.location.pathname);
	}
} else if (
	window.location.pathname !== "/" ||
	window.location.search !== "" ||
	window.location.hash !== ""
) {
	window.history.replaceState(null, "", "/");
}

const root = createRoot(rootElement);
void Promise.all([import("./App"), import("@/components/app-provider")]).then(
	([{ default: App }, { AppProvider }]) => {
		root.render(
			<StrictMode>
				<AppProvider>
					<App />
				</AppProvider>
			</StrictMode>,
		);
	},
);
