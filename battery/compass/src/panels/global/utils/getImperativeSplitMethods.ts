import type {
	Layout,
	SplitImperativeHandle,
} from "../../components/split/types";
import { getMountedSplits, updateMountedSplit } from "../mutable-state/splits";
import { layoutsEqual } from "./layoutsEqual";
import { validateSplitLayout } from "./validateSplitLayout";

export function getImperativeSplitMethods({
	splitId,
}: {
	splitId: string;
}): SplitImperativeHandle {
	const find = () => {
		const mountedSplits = getMountedSplits();
		for (const [split, value] of mountedSplits) {
			if (split.id === splitId) {
				return { split, ...value };
			}
		}

		throw Error(`Could not find Split with id "${splitId}"`);
	};

	return {
		getLayout() {
			const { defaultLayoutDeferred, layout } = find();

			if (defaultLayoutDeferred) {
				// This indicates that the Split has not finished mounting yet
				// Likely because it has been rendered inside of a hidden DOM subtree
				// Any layout value will not have been validated and so it should not be returned
				return {};
			}

			return layout;
		},
		setLayout(unsafeLayout: Layout) {
			const {
				defaultLayoutDeferred,
				derivedRegionConstraints,
				split,
				splitSize,
				layout: prevLayout,
				handleToRegions,
			} = find();

			const nextLayout = validateSplitLayout({
				layout: unsafeLayout,
				regionConstraints: derivedRegionConstraints,
			});

			if (defaultLayoutDeferred) {
				// This indicates that the Split has not finished mounting yet
				// Likely because it has been rendered inside of a hidden DOM subtree
				// In this case we cannot fully validate the layout, so we shouldn't apply it
				// It's okay to run the validate function above though,
				// it will still warn about certain types of errors (e.g. wrong number of regions)
				return prevLayout;
			}

			if (!layoutsEqual(prevLayout, nextLayout)) {
				updateMountedSplit(split, {
					defaultLayoutDeferred,
					derivedRegionConstraints,
					splitSize,
					layout: nextLayout,
					handleToRegions,
				});
			}

			return nextLayout;
		},
	};
}
