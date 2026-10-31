import api from './client.js';

export const productsApi = {
  list: async (params = {}) => {
    const res = await api.get('/products', { params });
    return res.data;
  },

  get: async (id) => {
    const res = await api.get(`/products/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/products', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/products/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/products/${id}`);
    return res.data;
  },
};

