import api from './client.js';

export const authApi = {
  signup: async (data) => {
    const res = await api.post('/auth/signup', data);
    return res.data;
  },

  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },

  forgotPassword: async (data) => {
    const res = await api.post('/auth/forgot', data);
    return res.data;
  },

  resetPassword: async (data) => {
    const res = await api.post('/auth/reset', data);
    return res.data;
  },

  me: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const staffApi = {
  createStaff: async (data) => {
    const res = await api.post('/staff', data);
    return res.data;
  },

  listStaff: async () => {
    const res = await api.get('/staff');
    return res.data;
  },
};

