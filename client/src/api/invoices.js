import api from './client.js';

export const invoicesApi = {
  list: async (params = {}) => {
    const res = await api.get('/invoices', { params });
    return res.data;
  },

  listMy: async (params = {}) => {
    const res = await api.get('/me/invoices', { params });
    return res.data;
  },

  get: async (id) => {
    const res = await api.get(`/invoices/${id}`);
    return res.data;
  },

  confirm: async (id) => {
    const res = await api.post(`/invoices/${id}/confirm`);
    return res.data;
  },

  cancel: async (id) => {
    const res = await api.post(`/invoices/${id}/cancel`);
    return res.data;
  },

  send: async (id) => {
    const res = await api.post(`/invoices/${id}/send`);
    return res.data;
  },

  downloadPdf: async (id, invoiceNumber = 'invoice') => {
    const res = await api.get(`/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${invoiceNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  },

  runBilling: async (dryRun = false) => {
    const res = await api.post('/billing/run', { dry_run: dryRun });
    return res.data;
  },
};
