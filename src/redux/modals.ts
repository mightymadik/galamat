import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SITE_URL } from "@/utils/consts";

interface IInterface {
  modalSelectedHouse: IHouse | null;
  objectInfo: IObjectData[] | null;
  modalSendRequest: boolean;
  modalSendRequestGlaOne: string | null;
}

// Սկզբնական state
const initialState: IInterface = {
  modalSelectedHouse: null,
  objectInfo: null,
  modalSendRequest: false,
  modalSendRequestGlaOne: null,
};

// Ստեղծել slice
export const modalsSite = createSlice({
  name: "modals",
  initialState,
  reducers: {
    setHouse: (state, action: PayloadAction<IHouse | null>) => {
      state.modalSelectedHouse = action.payload;
    },
    setObjectInfo: (state, action: PayloadAction<IObjectData[] | null>) => {
      state.objectInfo = action.payload;
    },
    setModalSendRequest: (state, action: PayloadAction<boolean>) => {
      if (window.innerWidth > 576) {
        state.modalSendRequest = action.payload;
      } else {
        window.location.href = SITE_URL.SEND_REQUEST;
      }
    },
    setModalSendRequestGalaOne: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      if (window.innerWidth > 576) {
        state.modalSendRequestGlaOne = action.payload;
      } else {
        window.location.href = SITE_URL.SEND_REQUEST;
      }
    },
  },
});

// Export actions and reducer
export const {
  setHouse,
  setObjectInfo,
  setModalSendRequest,
  setModalSendRequestGalaOne,
} = modalsSite.actions;
export default modalsSite.reducer;
