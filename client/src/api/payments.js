import api from './client.js';

export const paymentsApi = {
  list: async (params = {}) => {
    const res = await api.get('/payments', { params });
    return res.data;
  },

  record: async (invoiceId, data) => {
    const res = await api.post(`/invoices/${invoiceId}/payments`, data);
    return res.data;
  },
};
