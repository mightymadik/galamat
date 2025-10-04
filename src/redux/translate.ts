import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface IInterface {
  words: any;
  selectedLang: string;
  languages: string[];
}

const initialState: IInterface = {
  words: null,
  selectedLang: "ru",
  languages: [],
};

export const translateSite = createSlice({
  name: "translate",
  initialState,
  reducers: {
    setWords: (state, action: PayloadAction<object>) => {
      state.words = action.payload;
    },
    setLang: (state, action: PayloadAction<string>) => {
      state.selectedLang = action.payload;
    },
    setLanguages: (state, action: PayloadAction<string[]>) => {
      state.languages = action.payload;
    },
  },
});

// Export actions and reducer
export const { setWords, setLang, setLanguages } = translateSite.actions;
export default translateSite.reducer;
