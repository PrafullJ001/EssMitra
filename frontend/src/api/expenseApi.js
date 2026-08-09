import axiosInstance from "./axiosInstance";

export const addExpense = (data) => axiosInstance.post("/expenses", data);

export const getExpenses = (params = {}) =>
  axiosInstance.get("/expenses", { params });

export const getExpenseStaffList = () =>
  axiosInstance.get("/expenses/staff-list");

export const updateExpense = (id, data) =>
  axiosInstance.put(`/expenses/${id}`, data);

export const deleteExpense = (id) =>
  axiosInstance.delete(`/expenses/${id}`);

export const addSettlement = (data) =>
  axiosInstance.post("/expenses/settlements", data);

export const getSettlements = (staffId) =>
  axiosInstance.get("/expenses/settlements", {
    params: staffId ? { staffId } : {},
  });

export const updateSettlement = (id, data) =>
  axiosInstance.put(`/expenses/settlements/${id}`, data);

export const deleteSettlement = (id) =>
  axiosInstance.delete(`/expenses/settlements/${id}`);