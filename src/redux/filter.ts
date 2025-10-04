import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface IInterface {
  params: IParams;
}

const initialState: IInterface = {
  params: {
    projectId: 0,
    houseId: 0,
    rooms: [],
    "price[min]": 0,
    "price[max]": 50000000,
    minFloor: 0,
    maxFloor: 0,
    "area[min]": 0,
    "area[max]": 400,
  },
};

export const filterParams = createSlice({
  name: "filter-params",
  initialState,
  reducers: {
    setChangeParams: (state, action: PayloadAction<IParams>) => {
      state.params = action.payload;
    },
  },
});

// Export actions and reducer
export const { setChangeParams } = filterParams.actions;
export default filterParams.reducer;
