import api from './client.js';

export const subscriptionsApi = {
  list: async (params = {}) => {
    const res = await api.get('/subscriptions', { params });
    return res.data;
  },

  listMy: async (params = {}) => {
    const res = await api.get('/me/subscriptions', { params });
    return res.data;
  },

  get: async (id) => {
    const res = await api.get(`/subscriptions/${id}`);
    return res.data;
  },

  getHistory: async (id) => {
    const res = await api.get(`/subscriptions/${id}/history`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/subscriptions', data);
    return res.data;
  },

  createFromTemplate: async (templateId, data) => {
    const res = await api.post(`/subscriptions/from-template/${templateId}`, data);
    return res.data;
  },

  quote: async (id, reason) => {
    const res = await api.post(`/subscriptions/${id}/quote`, { reason });
    return res.data;
  },

  confirm: async (id, reason) => {
    const res = await api.post(`/subscriptions/${id}/confirm`, { reason });
    return res.data;
  },

  activate: async (id, reason) => {
    const res = await api.post(`/subscriptions/${id}/activate`, { reason });
    return res.data;
  },

  close: async (id, reason) => {
    const res = await api.post(`/subscriptions/${id}/close`, { reason });
    return res.data;
  },

  pause: async (id, reason) => {
    const res = await api.post(`/subscriptions/${id}/pause`, { reason });
    return res.data;
  },

  resume: async (id, reason) => {
    const res = await api.post(`/subscriptions/${id}/resume`, { reason });
    return res.data;
  },

  renew: async (id, reason) => {
    const res = await api.post(`/subscriptions/${id}/renew`, { reason });
    return res.data;
  },
};

export const plansApi = {
  list: async () => {
    const res = await api.get('/plans');
    return res.data;
  },
};
