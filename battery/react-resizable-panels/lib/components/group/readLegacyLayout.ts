import type { Layout, LayoutStorage } from "./types";
import { getStorageKey } from "./auto-save/getStorageKey";

export type LegacyLayout = {
  [key: string]: {
    expandToSizes: unknown;
    layout: number[];
  };
};

/**
 * Reads a legacy layout object from `localStorage`  and converts it to a modern `Layout` object.
 * For more information see github.com/bvaughn/react-resizable-panels/issues/605
 */
export function readLegacyLayout({
  id,
  panelIds,
  storage
}: {
  id: string;
  panelIds?: string[] | undefined;
  storage: LayoutStorage;
}): Layout | undefined {
  const readStorageKey = getStorageKey(id, []);

  const maybeLegacyString = storage.getItem(readStorageKey);
  if (!maybeLegacyString) {
    return;
  }

  try {
    // Legacy format stored multiple layouts in a single storage record, each keyed by panel ids
    const maybeLegacyLayout = JSON.parse(maybeLegacyString);

    if (panelIds) {
      // If panel ids were explicitly provided, search for a matching layout
      const key = panelIds.join(",");
      const entry = maybeLegacyLayout[key];
      if (
        entry &&
        Array.isArray(entry.layout) &&
        panelIds.length === entry.layout.length
      ) {
        const layout: Layout = {};
        panelIds.forEach((panelId, index) => {
          layout[panelId] = entry.layout[index];
        });
        return layout;
      }
    } else {
      // If no panel ids were provided, bailout unless the legacy object only contained a single layout
      const keys = Object.keys(maybeLegacyLayout);
      const [key] = keys;
      if (key !== undefined && keys.length === 1) {
        const entry = maybeLegacyLayout[key];
        if (entry && Array.isArray(entry.layout)) {
          const ids = key.split(",");
          if (ids.length === entry.layout.length) {
            const layout: Layout = {};
            ids.forEach((panelId, index) => {
              layout[panelId] = entry.layout[index];
            });
            return layout;
          }
        }
      }
    }
  } catch {
    // No-op
  }
}
