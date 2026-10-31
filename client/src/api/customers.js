import api from './client.js';

export const customersApi = {
  list: async (params = {}) => {
    const res = await api.get('/customers', { params });
    return res.data;
  },

  get: async (id) => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/customers', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
  },
};
