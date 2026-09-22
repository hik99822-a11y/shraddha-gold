import secureStorage from '../utils/secureStorage';

const API_URL = 'https://api.shraddhagold.com/api';

/**
 * Universal fetch wrapper with authorization header injection
 */
const request = async (endpoint, options = {}) => {
  const token = secureStorage.getItem('shraddha_gold_token');
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        window.dispatchEvent(new CustomEvent('auth_unauthorized', { detail: data.message }));
      }
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err.message);
    throw err;
  }
};

/**
 * Fetch wrapper specifically for downloading files (Blobs)
 */
export const downloadRequest = async (endpoint, options = {}) => {
  const token = secureStorage.getItem('shraddha_gold_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      if (res.status === 401) {
        window.dispatchEvent(new CustomEvent('auth_unauthorized', { detail: 'Unauthorized access' }));
      }
      
      // Try to parse JSON error message if possible
      let errorMessage = `Request failed with status ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // Not a JSON error, ignore
      }
      throw new Error(errorMessage);
    }

    return await res.blob();
  } catch (err) {
    console.error(`[API Download Error] ${endpoint}:`, err.message);
    throw err;
  }
};


export const authApi = {
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
  getMe: () =>
    request('/auth/me', {
      method: 'GET'
    }),
  updateProfile: (profileData) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    }),
  changePassword: (passwordData) =>
    request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData)
    })
};

export const inquiryApi = {
  submit: (inquiryData) =>
    request('/inquiries', {
      method: 'POST',
      body: JSON.stringify(inquiryData)
    }),
  getAll: () =>
    request('/inquiries', {
      method: 'GET'
    })
};

export const adminApi = {
  // 1. Dashboard
  getDashboardStats: () => request('/admin/dashboard', { method: 'GET' }),

  // 2. Customers
  getCustomers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/customers?${qs}`, { method: 'GET' });
  },
  getCustomerById: (id) => request(`/admin/customers/${id}`, { method: 'GET' }),
  createCustomer: (data) =>
    request('/admin/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateCustomer: (id, data) =>
    request(`/admin/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteCustomer: (id) =>
    request(`/admin/customers/${id}`, {
      method: 'DELETE'
    }),
  generateCustomerLink: (id, data) =>
    request(`/admin/customers/${id}/links`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  scheduleCustomerShare: (id, data) =>
    request(`/admin/customers/${id}/schedule-share`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  generateCustomerPdf: (id, options) =>
    downloadRequest(`/admin/customers/${id}/pdf`, {
      method: 'POST',
      body: JSON.stringify(options)
    }),

  // 3. Categories & Category Groups
  getCategories: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/categories?${qs}`, { method: 'GET' });
  },
  createCategory: (data) =>
    request('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateCategory: (id, data) =>
    request(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteCategory: (id) =>
    request(`/admin/categories/${id}`, {
      method: 'DELETE'
    }),

  getCategoryGroups: () => request('/admin/category-groups', { method: 'GET' }),
  createCategoryGroup: (data) =>
    request('/admin/category-groups', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateCategoryGroup: (id, data) =>
    request(`/admin/category-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteCategoryGroup: (id) =>
    request(`/admin/category-groups/${id}`, {
      method: 'DELETE'
    }),

  // 4. Style Images
  getStyleImages: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/style-images?${qs}`, { method: 'GET' });
  },
  uploadSlotImage: (styleId, formData) =>
    request(`/admin/style-images/${styleId}/slot`, {
      method: 'POST',
      body: formData
    }),
  copySlotToAllKt: (styleId, data) =>
    request(`/admin/style-images/${styleId}/copy-slot-all`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  deleteSlotImage: (styleId, kt, slot, deleteAllKt = false) =>
    request(`/admin/style-images/${styleId}/slot`, {
      method: 'DELETE',
      body: JSON.stringify({ kt, slot, deleteAllKt })
    }),
  uploadBulkChunk: (formData) =>
    request('/admin/style-images/bulk-chunk', {
      method: 'POST',
      body: formData
    }),
  syncDesktopServerFolder: (folderPath) =>
    request('/admin/style-images/sync-server-folder', {
      method: 'POST',
      body: JSON.stringify({ folderPath })
    }),
  getUnmatchedImages: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/style-images/unmatched?${qs}`, { method: 'GET' });
  },
  generateCatalogPdf: (data) =>
    downloadRequest('/admin/style-images/generate-pdf', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  createCategoryShareLink: (data) =>
    request('/admin/category-links', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getCategoryShareLinks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/category-links?${qs}`, { method: 'GET' });
  },
  getDefaultMasterShareLink: () =>
    request('/admin/category-links/default', { method: 'GET' }),
  deleteCategoryShareLink: (id) =>
    request(`/admin/category-links/${id}`, {
      method: 'DELETE'
    }),

  // 5. Excel Stock
  uploadExcelStock: (formData) =>
    request('/admin/excel/upload', {
      method: 'POST',
      body: formData
    }),
  getExcelHistory: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/excel/history?${qs}`, { method: 'GET' });
  },
  deleteExcelHistory: (id) =>
    request(`/admin/excel/history/${id}`, {
      method: 'DELETE'
    }),
  getLiveStock: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/excel/stock?${qs}`, { method: 'GET' });
  },
  deleteStockRow: (rowId, data = {}) =>
    request(`/admin/excel/stock/row/${rowId}`, {
      method: 'DELETE',
      body: JSON.stringify(data)
    }),
  deleteStockRows: (rowIds, data = {}) =>
    request('/admin/excel/stock/delete-rows', {
      method: 'POST',
      body: JSON.stringify({ rowIds, ...data })
    }),
  clearAllStock: (data = {}) =>
    request('/admin/excel/stock/clear', {
      method: 'DELETE',
      body: JSON.stringify(data)
    }),
  getStockAvailability: (styleCodes) =>
    request(`/admin/excel/stock/availability?styleCodes=${styleCodes.join(',')}`, { method: 'GET' }),
  getDetectedKts: () => request('/admin/excel/kts', { method: 'GET' }),

  // 6. PDF Compress
  compressPdf: (formData) =>
    request('/admin/pdf-compress', {
      method: 'POST',
      body: formData
    }),
  downloadCompressedPdf: (relativeUrl) => downloadRequest(relativeUrl, { method: 'GET' }),

  // 7. System Config
  getSystemConfig: () => request('/admin/config', { method: 'GET' }),
  updateSystemConfig: (key, value) =>
    request('/admin/config', {
      method: 'POST',
      body: JSON.stringify({ key, value })
    })
};

export const customerApi = {
  getPortalContent: () => request('/customer/portal', { method: 'GET' }),
  downloadPdf: () => downloadRequest('/customer/portal/pdf', { method: 'POST' })
};

export const sharedApi = {
  getSharedContent: (token) => request(`/shared/${token}`, { method: 'GET' })
};

export const orderApi = {
  checkStock: (data) =>
    request('/orders/check-stock', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  lookupCustomerPhones: (data) =>
    request('/orders/customer-phones', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  sendOtp: (data) =>
    request('/orders/send-otp', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  verifyOtpAndOrder: (data) =>
    request('/orders/verify-otp-and-order', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  createOrder: (data) =>
    request('/orders/create', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getPendingOrderCounts: () => request('/orders/pending-counts', { method: 'GET' }),
  getAdminOrders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/orders/admin?${qs}`, { method: 'GET' });
  },
  getOrderById: (id) => request(`/orders/${id}`, { method: 'GET' }),
  updateOrderStatus: (id, status) =>
    request(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
  deleteOrder: (id) =>
    request(`/orders/${id}`, {
      method: 'DELETE'
    }),
  resendWhatsApp: (id) =>
    request(`/orders/${id}/resend-whatsapp`, {
      method: 'POST'
    })
};

