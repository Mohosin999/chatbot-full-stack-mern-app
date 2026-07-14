import api from "@/api/axiosInstance";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { UserState } from "@/types";

const initialState: UserState = {
  profile: null,
  loading: false,
  updating: false,
  error: null,
};

export const fetchMe = createAsyncThunk(
  "user/fetchMe",
  async (_, { rejectWithValue }) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken)
        return rejectWithValue("No authentication accessToken found");

      const res = await api.get(`${import.meta.env.VITE_BASE_URL}/user`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return res.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch user data"
      );
    }
  }
);

export const updateCustomInstructions = createAsyncThunk(
  "user/updateCustomInstructions",
  async (customInstructions: string, { rejectWithValue }) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken)
        return rejectWithValue("No authentication accessToken found");

      const res = await api.patch(
        `${import.meta.env.VITE_BASE_URL}/user`,
        { customInstructions },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      return res.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update custom instructions"
      );
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearUserProfile: (state) => {
      state.profile = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.loading = false;
        state.profile = null;
        state.error = action.payload as string;
      })
      .addCase(updateCustomInstructions.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateCustomInstructions.fulfilled, (state, action) => {
        state.updating = false;
        if (state.profile) {
          state.profile.customInstructions = action.payload.customInstructions;
        }
        state.error = null;
      })
      .addCase(updateCustomInstructions.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })
      .addMatcher(
        (action) =>
          ["auth/logoutUser/fulfilled", "auth/loginUser/fulfilled", "auth/registerUser/fulfilled", "auth/googleLogin/fulfilled"].includes(action.type),
        () => initialState,
      );
  },
});

export const { clearUserProfile } = userSlice.actions;
export default userSlice.reducer;
