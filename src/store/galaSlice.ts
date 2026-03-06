import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { logoutAuth } from "./authThunks";

export interface WheelSegment {
  label: string;
  probability: number;
}

export interface LastBonus {
  prize: string;
  updatedAt: string;
}

interface GalaState {
  rotation: number;
  isSpinning: boolean;
  prize: string | null;
  hasSpun: boolean;
  segments: WheelSegment[];
  probabilityStatus: "idle" | "loading" | "fulfilled" | "rejected";
  lastBonus: LastBonus | null;
  bonusesStatus: "idle" | "loading" | "fulfilled" | "rejected";
  phone?: string;
  name?: string;
  bonusData?: any;
  messageStatus?: "idle" | "loading" | "sent" | "error";
  formStep: "idle" | "code" | "success" | "error" | "found";
  verificationCode: string[];
  generatedCode: string | null;
  timeLeft: number;
  when?: string;
  errors: {
    phone?: string;
    name?: string;
    code?: string;
  };
}

const DEFAULT_SEGMENTS: WheelSegment[] = [
  { label: "180.000 ₸", probability: 0.1 },
  { label: "70.000 ₸", probability: 0.1 },
  { label: "100.000 ₸", probability: 0.15 },
  { label: "80.000 ₸", probability: 0.1 },
  { label: "120.000 ₸", probability: 0.15 },
  { label: "60.000 ₸", probability: 0.15 },
  { label: "150.000 ₸", probability: 0.15 },
  { label: "70.000 ₸", probability: 0.1 },
];

const initialState: GalaState = {
  rotation: 0,
  isSpinning: false,
  prize: null,
  hasSpun: false,
  segments: [],
  probabilityStatus: "idle",
  lastBonus: null,
  bonusesStatus: "idle",
  formStep: "idle",
  verificationCode: ["", "", "", ""],
  generatedCode: null,
  timeLeft: 180,
  errors: {},
};

const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

export function canClaimBonus(lastBonus: LastBonus | null): boolean {
  if (!lastBonus) return true;
  const updated = new Date(lastBonus.updatedAt).getTime();
  return Date.now() - updated >= TWO_MONTHS_MS;
}

export interface GetCustomerResponse {
  status: "found" | "notFound";
  when?: string;
}

export interface SendMessageResponse {
  status: "ok" | "error";
  data?: any;
}

export interface ClaimPrizeResponse {
  cardUrl: string;
  gpayUrl: string;
  user_hash: string;
}

export interface ProbabilityApiData {
  id?: number;
  documentId?: string;
  sector: string;
  probability: number;
  sector1: string;
  probability1: number;
  sector2: string;
  probability2: number;
  sector3: string;
  probability3: number;
  sector4: string;
  probability4: number;
  sector5: string;
  probability5: number;
  sector6: string;
  probability6: number;
  sector7: string;
  probability7: number;
}

const durationMs = 16000;

function segmentsFromApi(data: ProbabilityApiData): WheelSegment[] {
  const raw = [
    { label: data.sector, p: data.probability },
    { label: data.sector1, p: data.probability1 },
    { label: data.sector2, p: data.probability2 },
    { label: data.sector3, p: data.probability3 },
    { label: data.sector4, p: data.probability4 },
    { label: data.sector5, p: data.probability5 },
    { label: data.sector6, p: data.probability6 },
    { label: data.sector7, p: data.probability7 },
  ];
  const sum = raw.reduce((s, x) => s + x.p, 0);
  return sum > 0
    ? raw.map(({ label, p }) => ({ label, probability: p / sum }))
    : DEFAULT_SEGMENTS;
}

function getRandomSegment(segments: WheelSegment[]): number {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < segments.length; i++) {
    acc += segments[i].probability;
    if (r <= acc) return i;
  }
  return segments.length - 1;
}

export const fetchProbability = createAsyncThunk<
  WheelSegment[],
  void,
  { rejectValue: string }
>(
  "gala/fetchProbability",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get<{ data: ProbabilityApiData }>(
        "/api/galaBonus/probability"
      );
      if (!data?.data) return rejectWithValue("Invalid probability response");
      return segmentsFromApi(data.data);
    } catch (e) {
      return rejectWithValue("Ошибка загрузки вероятностей");
    }
  }
);

export type ClaimPrizeParams = {
  phone: string;
  name: string;
  prize: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
};

export const claimPrize = createAsyncThunk<
  ClaimPrizeResponse,
  ClaimPrizeParams,
  { rejectValue: string }
>(
  "gala/claimPrize",
  async (
    { phone, name, prize, utm_source, utm_medium, utm_campaign, utm_content },
    { rejectWithValue }
  ) => {
    try {
      const cleanPhone = "+" + phone.replace(/\D/g, "");
      const bonusValue = prize.replace(/[^\d]/g, "");

      const response = await axios.post("/api/galaBonus/passquare", {
        phone: cleanPhone,
        name,
        prize: bonusValue,
        ...(utm_source && { utm_source }),
        ...(utm_medium && { utm_medium }),
        ...(utm_campaign && { utm_campaign }),
        ...(utm_content && { utm_content }),
      });

      const data = response.data;

      return {
        cardUrl: data.card_url,
        gpayUrl: data.card_gpay_url,
        user_hash: data.user_hash,
      };
    } catch (e) {
      return rejectWithValue("Ошибка получения приза");
    }
  }
);

export const getCustomer = createAsyncThunk<
  GetCustomerResponse,
  string,
  { rejectValue: string }
>(
  "gala/getCustomer",
  async (phone, { rejectWithValue }) => {
    try {
      const { data } = await axios.post("/api/galaBonus/check", {
        phone,
      });

      return data;
    } catch (e) {
      return rejectWithValue("Ошибка проверки клиента");
    }
  }
);

export const sendMessage = createAsyncThunk<
  SendMessageResponse,
  { phone: string; code: string },
  { rejectValue: string }
>(
  "gala/sendMessage",
  async ({ phone, code }, { rejectWithValue }) => {
    const cleanPhone = "+" + phone.replace(/\D/g, "");
    try {
      const { data } = await axios.post("/api/galaBonus/sendMessage", {
        phone: cleanPhone,
        code,
      });

      return data;
    } catch (e) {
      return rejectWithValue("Ошибка отправки сообщения");
    }
  }
);

export const fetchBonuses = createAsyncThunk<
  LastBonus | null,
  string,
  { rejectValue: string }
>(
  "gala/fetchBonuses",
  async (documentId, { rejectWithValue }) => {
    try {
      const { data } = await axios.get<{
        data?: Array<{ prize?: string; updatedAt?: string }>;
      }>(`/api/galaBonus/bonuses?documentId=${encodeURIComponent(documentId)}`);
      const list = data?.data;
      if (!list?.length) return null;
      const first = list[0];
      if (!first?.prize || !first?.updatedAt) return null;
      return { prize: first.prize, updatedAt: first.updatedAt };
    } catch (e) {
      return rejectWithValue("Ошибка загрузки бонусов");
    }
  }
);

export const createBonus = createAsyncThunk<
  void,
  { documentId: string; prize: string },
  { rejectValue: string }
>(
  "gala/createBonus",
  async ({ documentId, prize }, { rejectWithValue }) => {
    try {
      const prizeDigits = prize.replace(/\D/g, "") || "0";
      await axios.post("/api/galaBonus/bonuses", {
        documentId,
        prize: prizeDigits,
      });
    } catch (e: any) {
      const msg =
        e?.response?.data?.error || e?.message || "Ошибка сохранения приза";
      return rejectWithValue(
        typeof msg === "string" ? msg : "Ошибка сохранения приза"
      );
    }
  }
);

const galaSlice = createSlice({
  name: "gala",
  initialState,
  reducers: {
    startSpin: (state) => {
      state.isSpinning = true;
      state.prize = null;
      state.hasSpun = false;
    },
    finishSpin: (state, action: PayloadAction<{ rotation: number; prize: string }>) => {
      state.isSpinning = false;
      state.hasSpun = true;
      state.rotation = action.payload.rotation;
      state.prize = action.payload.prize;
    },
    resetWheel: (state) => {
      state.rotation = 0;
      state.isSpinning = false;
      state.hasSpun = false;
      state.prize = null;
    },
    saveFormData: (state, action: PayloadAction<{ phone: string; name: string }>) => {
      state.phone = action.payload.phone;
      state.name = action.payload.name;
    },
    setFormStep: (state, action: PayloadAction<GalaState["formStep"]>) => {
      state.formStep = action.payload;
    },
    setVerificationCode: (state, action: PayloadAction<string[]>) => {
      state.verificationCode = action.payload;
    },
    setGeneratedCode: (state, action: PayloadAction<string | null>) => {
      state.generatedCode = action.payload;
    },
    setTimeLeft: (state, action: PayloadAction<number>) => {
      state.timeLeft = action.payload;
    },
    setWhen: (state, action: PayloadAction<string | undefined>) => {
      state.when = action.payload;
    },
    setFormErrors: (state, action: PayloadAction<Partial<GalaState["errors"]>>) => {
      state.errors = { ...state.errors, ...action.payload };
    },
    clearFormErrors: (state) => {
      state.errors = {};
    },
    resetForm: (state) => {
      state.formStep = "idle";
      state.verificationCode = ["", "", "", ""];
      state.generatedCode = null;
      state.timeLeft = 180;
      state.errors = {};
      state.when = undefined;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(claimPrize.fulfilled, (state, action) => {
      state.bonusData = action.payload;
    });
    builder.addCase(claimPrize.rejected, (state) => {
      state.formStep = "error";
    });
    builder.addCase(sendMessage.pending, (state) => {
      state.messageStatus = "loading";
    });
    builder.addCase(sendMessage.fulfilled, (state) => {
      state.messageStatus = "sent";
    });
    builder.addCase(sendMessage.rejected, (state) => {
      state.messageStatus = "error";
    });
    builder.addCase(getCustomer.fulfilled, (state, action) => {
      if (action.payload.status === "found") {
        state.when = action.payload.when;
      }
    });
    builder.addCase(fetchProbability.pending, (state) => {
      state.probabilityStatus = "loading";
    });
    builder.addCase(fetchProbability.fulfilled, (state, action) => {
      state.probabilityStatus = "fulfilled";
      state.segments = action.payload;
    });
    builder.addCase(fetchProbability.rejected, (state) => {
      state.probabilityStatus = "rejected";
    });
    builder.addCase(fetchBonuses.pending, (state) => {
      state.bonusesStatus = "loading";
    });
    builder.addCase(fetchBonuses.fulfilled, (state, action) => {
      state.bonusesStatus = "fulfilled";
      state.lastBonus = action.payload;
      if (action.payload) state.when = action.payload.updatedAt;
    });
    builder.addCase(fetchBonuses.rejected, (state) => {
      state.bonusesStatus = "rejected";
    });
    builder.addCase(createBonus.fulfilled, (state, action) => {
      const prize = action.meta.arg.prize.replace(/\D/g, "") || "0";
      const updatedAt = new Date().toISOString();
      state.lastBonus = { prize, updatedAt };
      state.when = updatedAt;
    });
    builder.addCase(logoutAuth.fulfilled, (state) => {
      state.lastBonus = null;
      state.bonusesStatus = "idle";
    });
    builder.addCase(logoutAuth.rejected, (state) => {
      state.lastBonus = null;
      state.bonusesStatus = "idle";
    });
  },
});

export const { 
  startSpin, 
  finishSpin, 
  resetWheel, 
  saveFormData,
  setFormStep,
  setVerificationCode,
  setGeneratedCode,
  setTimeLeft,
  setWhen,
  setFormErrors,
  clearFormErrors,
  resetForm
} = galaSlice.actions;

/** Check gala-bonuses by user, then spin or return locked. Call before allowing spin. */
export const trySpin = (documentId: string) => async (dispatch: any, getState: any) => {
  await dispatch(fetchBonuses(documentId));
  const lastBonus = getState().gala.lastBonus;
  if (lastBonus && !canClaimBonus(lastBonus)) {
    return { locked: true as const, when: lastBonus.updatedAt };
  }
  dispatch(handleSpin());
  return { locked: false as const };
};

// --- thunk for global handleSpin ---
export const handleSpin = () => (dispatch: any, getState: any) => {
  const { rotation, isSpinning, hasSpun, segments: stateSegments } =
    getState().gala;
  if (isSpinning || hasSpun) return;

  const segments =
    stateSegments?.length > 0 ? stateSegments : DEFAULT_SEGMENTS;
  const segmentCount = segments.length;
  const segmentAngle = 360 / segmentCount;

  dispatch(startSpin());

  const audio = new Audio("/audio/chick.mp3");
  audio.currentTime = 0;
  audio.play().catch(() => {});
  audio.loop = false;

  const selectedIndex = getRandomSegment(segments);
  const centerOfSelected = selectedIndex * segmentAngle + segmentAngle / 2;
  const targetAngle = 360 - centerOfSelected;
  const fullTurns = 8;
  const finalRotation = fullTurns * 360 + targetAngle;

  const wheel = document.querySelector(".wheel") as HTMLElement;
  if (wheel) {
    wheel.style.transition = `transform ${durationMs}ms cubic-bezier(0.33, 1, 0.68, 1)`;
    wheel.style.transform = `rotate(${rotation + finalRotation}deg)`;
  }

  setTimeout(() => {
    audio.pause();
    audio.currentTime = 0;

    const tada = new Audio("/audio/tada.mp3");
    tada.volume = 1;
    tada.play().catch(() => {});

    dispatch(
      finishSpin({
        rotation: rotation + finalRotation,
        prize: segments[selectedIndex].label,
      })
    );
  }, durationMs);
};

export default galaSlice.reducer;