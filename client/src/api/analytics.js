import api from './client.js';

export async function getOverview(params = {}) {
  const res = await api.get('/analytics/overview', { params });
  return res.data?.data;
}

export async function getRevenueAnalytics(params = {}) {
  const res = await api.get('/analytics/revenue', { params });
  return res.data?.data;
}

export async function getSubscriptionAnalytics(params = {}) {
  const res = await api.get('/analytics/subscriptions', { params });
  return res.data?.data;
}

export async function getCustomerAnalytics(params = {}) {
  const res = await api.get('/analytics/customers', { params });
  return res.data?.data;
}

export async function downloadReport(reportType, params = {}) {
  const res = await api.get('/analytics/reports/export', {
    params: { ...params, reportType },
    responseType: 'blob',
  });

  // Extract filename from response headers or build default
  const disposition = res.headers['content-disposition'] || '';
  let filename = `brightloop-${reportType}-report.csv`;
  const match = disposition.match(/filename="?([^";]+)"?/);
  if (match && match[1]) {
    filename = match[1];
  }

  // Create download link and trigger browser save
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
