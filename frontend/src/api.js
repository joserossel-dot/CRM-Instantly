import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const fetchLeads = async () => {
  const response = await axios.get(`${API_URL}/api/leads`);
  return response.data;
};

export const updateLeadStatus = async (id, status) => {
  const response = await axios.put(`${API_URL}/api/leads/${id}/status`, { status });
  return response.data;
};

export const deleteLead = async (id) => {
  const response = await axios.delete(`${API_URL}/api/leads/${id}`);
  return response.data;
};

export const addTask = async (leadId, taskData) => {
  const response = await axios.post(`${API_URL}/api/leads/${leadId}/tasks`, taskData);
  return response.data;
};

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post(`${API_URL}/api/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const updateTask = async (taskId, data) => {
  const response = await axios.put(`${API_URL}/api/tasks/${taskId}`, data);
  return response.data;
};

export const deleteTask = async (taskId) => {
  const response = await axios.delete(`${API_URL}/api/tasks/${taskId}`);
  return response.data;
};
