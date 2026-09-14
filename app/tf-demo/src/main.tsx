import { initializeTheme } from "lego";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("The #root element is required to mount tf-demo.");
}

initializeTheme({ defaultTheme: "dark", storageKey: "tf-demo-theme" });

if (
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
