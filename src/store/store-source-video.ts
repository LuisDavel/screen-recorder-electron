import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SourceVideoState {
  sourceId: { id: string; name: string; thumbnail: string } | null;
  setSourceId: (sourceId: {
    id: string;
    name: string;
    thumbnail: string;
  }) => void;
  clearSourceId: () => void;
}

export const useSourceVideoStore = create<SourceVideoState>()(
  persist(
    (set) => ({
      sourceId: null,
      setSourceId: (sourceId) => set({ sourceId: sourceId }),
      clearSourceId: () => set({ sourceId: null }),
    }),
    {
      name: "save-source-video",
    },
  ),
);
