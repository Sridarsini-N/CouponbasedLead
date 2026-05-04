import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL
});

export const validateCouponApi = async (payload) => {
  const response = await api.post("/coupons/validate", payload);
  return response.data;
};

export const getCouponsApi = async (params = {}) => {
  const response = await api.get("/coupons", { params });
  return response.data;
};

export const createCouponApi = async (payload) => {
  const response = await api.post("/coupons", payload);
  return response.data;
};

export const submitLeadApi = async (payload) => {
  const response = await api.post("/leads", payload);
  return response.data;
};

export const getLeadsApi = async (params = {}) => {
  const response = await api.get("/leads", { params });
  return response.data;
};
