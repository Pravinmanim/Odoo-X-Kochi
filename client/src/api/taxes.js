import api from './client.js';

export const taxesApi = {
  list: async (params = {}) => {
    const res = await api.get('/taxes', { params });
    return res.data;
  },

  get: async (id) => {
    const res = await api.get(`/taxes/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/taxes', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/taxes/${id}`, data);
    return res.data;
  },

  toggle: async (id) => {
    const res = await api.patch(`/taxes/${id}/toggle`);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/taxes/${id}`);
    return res.data;
  },
};

