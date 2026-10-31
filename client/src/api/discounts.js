import api from './client.js';

export const discountsApi = {
  list: async (params = {}) => {
    const res = await api.get('/discounts', { params });
    return res.data;
  },

  get: async (id) => {
    const res = await api.get(`/discounts/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/discounts', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/discounts/${id}`, data);
    return res.data;
  },

  toggle: async (id) => {
    const res = await api.patch(`/discounts/${id}/toggle`);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/discounts/${id}`);
    return res.data;
  },
};

