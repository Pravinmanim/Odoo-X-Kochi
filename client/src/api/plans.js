import api from './client.js';

export const plansApi = {
  list: async (params = {}) => {
    const res = await api.get('/plans', { params });
    return res.data;
  },

  getAvailable: async () => {
    const res = await api.get('/plans/available');
    return res.data;
  },

  get: async (id) => {
    const res = await api.get(`/plans/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/plans', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/plans/${id}`, data);
    return res.data;
  },

  toggle: async (id) => {
    const res = await api.patch(`/plans/${id}/toggle`);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/plans/${id}`);
    return res.data;
  },
};

