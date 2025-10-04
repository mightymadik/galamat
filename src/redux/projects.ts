import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface IInterface {
  projects: IProjectMerged[];
}

const initialState: IInterface = {
  projects: [],
};

export const projectsState = createSlice({
  name: "projects",
  initialState,
  reducers: {
    setProjects: (state, action: PayloadAction<IProjectMerged[]>) => {
      state.projects = action.payload;
    },
  },
});

export const { setProjects } = projectsState.actions;
export default projectsState.reducer;
