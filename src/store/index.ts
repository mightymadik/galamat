"use client";

import { configureStore, Middleware } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import galaReducer from "./galaSlice";
import payReducer from "./paySlice";
import favoritesReducer from "./favoritesSlice";
import queueProfileReducer from "./queueProfileSlice";
import { checkAuth, logoutAuth } from "./authThunks";
import { hydrateFavoritesForUser, clearFavorites, persistFavoritesForUser } from "./favoritesSlice";

const favoritesSyncMiddleware: Middleware = (store) => (next) => (action: unknown) => {
  const result = next(action);
  const a = action as { type: string; payload?: { user?: { id: number } } };
  if (checkAuth.fulfilled.match(a) && a.payload?.user?.id) {
    store.dispatch(hydrateFavoritesForUser(a.payload.user.id));
  }
  if (logoutAuth.fulfilled.match(a) || logoutAuth.rejected.match(a)) {
    store.dispatch(clearFavorites());
  }
  if (
    ["favorites/addFavorite", "favorites/removeFavorite", "favorites/toggleFavorite"].includes(a.type)
  ) {
    const state = store.getState() as { auth: { user?: { id: number } }; favorites: { flatIds: number[] } };
    const userId = state.auth.user?.id;
    if (userId != null) {
      persistFavoritesForUser(userId, state.favorites.flatIds);
    }
  }
  return result;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    gala: galaReducer,
    pay: payReducer,
    favorites: favoritesReducer,
    queueProfile: queueProfileReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      thunk: true,
    }).concat(favoritesSyncMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;