import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const FAVORITES_STORAGE_KEY = "galamat_favorite_flat_ids";

function loadForUser(userId: number): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${FAVORITES_STORAGE_KEY}_${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x: unknown) => typeof x === "number") : [];
  } catch {
    return [];
  }
}

function saveForUser(userId: number, ids: number[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${FAVORITES_STORAGE_KEY}_${userId}`, JSON.stringify(ids));
  } catch {}
}

interface FavoritesState {
  flatIds: number[];
}

const initialState: FavoritesState = {
  flatIds: [],
};

const favoritesSlice = createSlice({
  name: "favorites",
  initialState,
  reducers: {
    setFavorites: (state, action: PayloadAction<number[]>) => {
      state.flatIds = action.payload;
    },
    addFavorite: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      if (!state.flatIds.includes(id)) state.flatIds.push(id);
    },
    removeFavorite: (state, action: PayloadAction<number>) => {
      state.flatIds = state.flatIds.filter((x) => x !== action.payload);
    },
    toggleFavorite: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      const i = state.flatIds.indexOf(id);
      if (i >= 0) state.flatIds = state.flatIds.filter((x) => x !== id);
      else state.flatIds.push(id);
    },
    hydrateFavoritesForUser: (state, action: PayloadAction<number>) => {
      state.flatIds = loadForUser(action.payload);
    },
    clearFavorites: (state) => {
      state.flatIds = [];
    },
  },
});

export const {
  setFavorites,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  hydrateFavoritesForUser,
  clearFavorites,
} = favoritesSlice.actions;

export const persistFavoritesForUser = (userId: number, flatIds: number[]) => {
  saveForUser(userId, flatIds);
};

export default favoritesSlice.reducer;
