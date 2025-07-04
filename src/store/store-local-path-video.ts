import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SaveLocationState {
	saveLocation: string | null;
	setSaveLocation: (location: string) => void;
	clearSaveLocation: () => void;
}

export const useSaveLocationStore = create<SaveLocationState>()(
	persist(
		(set) => ({
			saveLocation: null,
			setSaveLocation: (location) => set({ saveLocation: location }),
			clearSaveLocation: () => set({ saveLocation: null }),
		}),
		{
			name: "save-location-video",
		},
	),
);
