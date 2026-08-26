// API utility functions for external server calls
import logger from './logger';
import {
  beginNetworkRequest,
  endNetworkRequest,
} from './network-tracker';

const API_BASE_URL ='';

// Timeout duration in milliseconds (30 seconds)
const API_TIMEOUT = 30000;

// Create abort controller for timeout
const createTimeoutController = () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  return { controller, timeoutId };
};

// Session timeout handler - will be set by the session timeout context
let sessionTimeoutHandler = null;

export const setSessionTimeoutHandler = (handler) => {
  sessionTimeoutHandler = handler;
};

// Handle 401 Unauthorized - show session timeout modal instead of auto logout
const handleUnauthorized = (retryCallback = null) => {
  if (typeof window !== 'undefined') {
    // If we have a session timeout handler, use it
    if (sessionTimeoutHandler) {
      sessionTimeoutHandler(retryCallback);
    } else {
      // Fallback to old behavior if handler not set
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }
};

export const apiCall = async (endpoint, options = {}) => {
  const url = endpoint?.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    mode: 'cors',
    credentials: 'include',
  };

  const { controller, timeoutId } = createTimeoutController();

  const config = {
    ...defaultOptions,
    ...options,
    signal: controller.signal,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  beginNetworkRequest();

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    // Handle 401 Unauthorized
    if (response.status === 401) {
      // Create a retry callback that will retry the original request
      const retryCallback = async () => {
        // Get the current user token for retry
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user?.token) {
            // Retry the request with the refreshed token
            const retryConfig = {
              ...config,
              headers: {
                ...config.headers,
                Authorization: `Bearer ${user.token}`,
              },
            };
            return fetch(url, retryConfig);
          }
        }
      };
      
      handleUnauthorized(retryCallback);
      return {
        success: false,
        error: 'Session expired. Please refresh your session.',
        sessionExpired: true,
      };
    }

    // Try to parse JSON, but handle non-JSON responses
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (parseError) {
        logger.error('Failed to parse JSON response:', parseError);
        throw new Error('Invalid response format from server');
      }
    } else {
      // Non-JSON response
      const text = await response.text();
      data = {
        success: !response.ok,
        message: text || 'Unexpected response format',
      };
    }

    // Check if response is ok
    if (!response.ok) {
      return data;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle different error types
    if (error.name === 'AbortError') {
      logger.error('API call timeout:', url);
      return {
        success: false,
        error: 'Request timeout. Please try again.',
      };
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      logger.error('Network error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }

    logger.error('API call failed:', error);
    throw error;
  } finally {
    endNetworkRequest();
  }
};

// Authentication API calls
export const authAPI = {
  login: async (email, password, role) => {
    return apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
  },

  logout: async () => {
    return apiCall('/api/auth/logout', {
      method: 'POST',
    });
  },

  validateToken: async (token) => {
    return apiCall('/api/auth/validate', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

// Products API calls
export const productsAPI = {
  getAll: async (token, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = queryParams ? `/api/products?${queryParams}` : '/api/products';
    return apiCall(endpoint, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  getById: async (id, token) => {
    return apiCall(`/api/products/${id}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  create: async (product, token) => {
    return apiCall('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(product),
    });
  },

  createWithVariants: async (parent, variants, token) => {
    return apiCall('/api/products/with-variants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ parent, variants }),
    });
  },

  update: async (id, product, token) => {
    return apiCall(`/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(product),
    });
  },

  delete: async (id, token) => {
    return apiCall(`/api/products/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  // Variant API
  getWithVariants: async (id, token) => {
    return apiCall(`/api/products/${id}/variants`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  addVariant: async (parentProductId, variant, token) => {
    return apiCall(`/api/products/${parentProductId}/variants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(variant),
    });
  },

  deleteVariant: async (variantId, token) => {
    return apiCall(`/api/products/variants/${variantId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  // Product Attributes API
  getAttributes: async (productId, token) => {
    return apiCall(`/api/products/${productId}/attributes`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  createAttribute: async (productId, attribute, token) => {
    return apiCall(`/api/products/${productId}/attributes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(attribute),
    });
  },

  updateAttribute: async (productId, attributeId, attribute, token) => {
    return apiCall(`/api/products/${productId}/attributes/${attributeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(attribute),
    });
  },

  deleteAttribute: async (productId, attributeId, token) => {
    return apiCall(`/api/products/${productId}/attributes/${attributeId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
};

// Shelves API calls
// Users API calls
export const usersAPI = {
  getAll: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const endpoint = qs ? `/api/users?${qs}` : '/api/users';
    return apiCall(endpoint, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  create: async (userData, token) => {
    return apiCall('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(userData),
    });
  },
  update: async (id, userData, token) => {
    return apiCall(`/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(userData),
    });
  },
  delete: async (id, token) => {
    return apiCall(`/api/users/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  updatePin: async (id, pin, token) => {
    return apiCall(`/api/users/${id}/pin`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ pin }),
    });
  },
};

export const shelvesAPI = {
  getAll: async (token) => {
    return apiCall('/api/shelves', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  create: async (shelf, token) => {
    return apiCall('/api/shelves', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(shelf),
    });
  },

  update: async (id, data, token) => {
    return apiCall(`/api/shelves/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
  },

  delete: async (id, token) => {
    return apiCall(`/api/shelves/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
};

// Dashboard API calls
export const dashboardAPI = {
  getMetrics: async (token) => {
    return apiCall('/api/dashboard/metrics', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
  getRecentUpdates: async (token) => {
    return apiCall('/api/activity?page=1&limit=20', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

//Categories API calls
export const categoriesAPI = {
  getAll: async (token) => {
    return apiCall('/api/categories', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  getById: async (id, token) => {
    return apiCall(`/api/categories/${id}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  create: async (category, token) => {
    return apiCall('/api/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(category),
    });
  },
  update: async (id, category, token) => {
    return apiCall(`/api/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(category),
    });
  },
  delete: async (id, token) => {
    return apiCall(`/api/categories/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  // Subcategory operations
  getSubcategories: async (categoryId, token) => {
    return apiCall(`/api/categories/${categoryId}/subcategories`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  createSubcategory: async (subcategory, token) => {
    return apiCall('/api/categories/subcategories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(subcategory),
    });
  },
  updateSubcategory: async (id, subcategory, token) => {
    return apiCall(`/api/categories/subcategories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(subcategory),
    });
  },
  deleteSubcategory: async (id, token) => {
    return apiCall(`/api/categories/subcategories/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
};

// Sales / Receipts API calls
export const salesAPI = {
  getAll: async (token, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = queryParams ? `/api/sales?${queryParams}` : '/api/sales';
    return apiCall(endpoint, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  create: async (sale, token) => {
    return apiCall('/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(sale),
    });
  },

  getById: async (id, token) => {
    return apiCall(`/api/sales/${id}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  getReceiptByNumber: async (saleNumber, token) => {
    return apiCall(`/api/sales/receipt/${saleNumber}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
};

// Stores API calls
export const storesAPI = {
  getAll: async (token) => {
    return apiCall('/api/stores', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  getById: async (id, token) => {
    return apiCall(`/api/stores/${id}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  create: async (storeData, token) => {
    return apiCall('/api/stores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(storeData),
    });
  },
  update: async (id, storeData, token) => {
    return apiCall(`/api/stores/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(storeData),
    });
  },
  delete: async (id, token) => {
    return apiCall(`/api/stores/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
};

// Counters API calls
export const countersAPI = {
  getAll: async (token, storeId = null) => {
    const endpoint = storeId ? `/api/counters?storeId=${storeId}` : '/api/counters';
    return apiCall(endpoint, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  getById: async (id, token) => {
    return apiCall(`/api/counters/${id}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  create: async (counterData, token) => {
    return apiCall('/api/counters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(counterData),
    });
  },
  update: async (id, counterData, token) => {
    return apiCall(`/api/counters/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(counterData),
    });
  },
  delete: async (id, token) => {
    return apiCall(`/api/counters/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
};

// Stock Transfers API calls
export const stockTransfersAPI = {
  getAll: async (token, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = queryParams ? `/api/stock-transfers?${queryParams}` : '/api/stock-transfers';
    return apiCall(endpoint, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  getById: async (id, token) => {
    return apiCall(`/api/stock-transfers/${id}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  request: async (transferData, token) => {
    return apiCall('/api/stock-transfers/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(transferData),
    });
  },
  approve: async (id, token) => {
    return apiCall(`/api/stock-transfers/${id}/approve`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  ship: async (id, token) => {
    return apiCall(`/api/stock-transfers/${id}/ship`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  receive: async (id, token) => {
    return apiCall(`/api/stock-transfers/${id}/receive`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  cancel: async (id, token) => {
    return apiCall(`/api/stock-transfers/${id}/cancel`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
};

// Store Inventory API calls
export const storeInventoryAPI = {
  getStoreInventory: async (storeId, token, lowStock = false) => {
    const endpoint = lowStock
      ? `/api/store-inventory/store/${storeId}?lowStock=true`
      : `/api/store-inventory/store/${storeId}`;
    return apiCall(endpoint, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  getStoreInventorySummary: async (storeId, token) => {
    return apiCall(`/api/store-inventory/store/${storeId}/summary`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  getProductInventoryAcrossStores: async (productId, token) => {
    return apiCall(`/api/store-inventory/product/${productId}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  updateStoreInventory: async (storeId, productId, inventoryData, token) => {
    return apiCall(`/api/store-inventory/store/${storeId}/product/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(inventoryData),
    });
  },
};

// Shift API
export const shiftsAPI = {
  getAll: async (token, params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.storeId) queryParams.append('storeId', params.storeId);
    if (params.counterId) queryParams.append('counterId', params.counterId);
    if (params.status) queryParams.append('status', params.status);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const endpoint = queryParams.toString() ? `/api/shifts?${queryParams.toString()}` : '/api/shifts';
    return apiCall(endpoint, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },

  getById: async (id, token) => {
    return apiCall(`/api/shifts/${id}`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },

  getCurrent: async (counterId, token) => {
    return apiCall(`/api/shifts/current?counterId=${counterId}`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },

  open: async (shiftData, token) => {
    return apiCall('/api/shifts/open', {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(shiftData),
    });
  },

  close: async (id, closeData, token) => {
    return apiCall(`/api/shifts/${id}/close`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(closeData),
    });
  },
};

// Reports API
export const reportsAPI = {
  getSalesReport: async (token, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = queryParams ? `/api/reports/sales?${queryParams}` : '/api/reports/sales';
    return apiCall(endpoint, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },

  getGstReport: async (token, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = queryParams ? `/api/reports/gst?${queryParams}` : '/api/reports/gst';
    return apiCall(endpoint, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },

  getPaymentModeReport: async (token, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = queryParams ? `/api/reports/payment-mode?${queryParams}` : '/api/reports/payment-mode';
    return apiCall(endpoint, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },

  getInventoryReport: async (token, params = {}) => {
    // Filter out undefined, null, and empty string values
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined && value !== null && value !== '')
    );
    const queryParams = new URLSearchParams(filteredParams).toString();
    const endpoint = queryParams ? `/api/reports/inventory?${queryParams}` : '/api/reports/inventory';
    return apiCall(endpoint, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },

  getCashReconciliationReport: async (token, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = queryParams ? `/api/reports/cash-reconciliation?${queryParams}` : '/api/reports/cash-reconciliation';
    return apiCall(endpoint, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },

  getCounterWiseReport: async (token, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = queryParams ? `/api/reports/counter-wise?${queryParams}` : '/api/reports/counter-wise';
    return apiCall(endpoint, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },
};

// Returns API
export const returnsAPI = {
  getAll: async (token, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = queryParams ? `/api/returns?${queryParams}` : '/api/returns';
    return apiCall(endpoint, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },

  getById: async (id, token) => {
    return apiCall(`/api/returns/${id}`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },

  searchByReceipt: async (receiptNumber, token) => {
    return apiCall(`/api/returns/search?receiptNumber=${receiptNumber}`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },

  create: async (returnData, token) => {
    return apiCall('/api/returns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(returnData),
    });
  },
};

// Settings API (store settings, counter settings)
export const settingsAPI = {
  getStoreSettings: async (storeId, token) => {
    return apiCall(`/api/settings/store/${storeId}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  updateStoreSettings: async (storeId, data, token) => {
    return apiCall(`/api/settings/store/${storeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
  },
  getCounterSettings: async (counterId, token) => {
    return apiCall(`/api/settings/counter/${counterId}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  updateCounterSettings: async (counterId, data, token) => {
    return apiCall(`/api/settings/counter/${counterId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
  },
};

// Device Settings API
export const deviceSettingsAPI = {
  getAllDevices: async (token) => {
    return apiCall('/api/settings/devices', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  getDevice: async (deviceId, token) => {
    return apiCall(`/api/settings/device/${deviceId}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  updateDevice: async (deviceId, data, token) => {
    return apiCall(`/api/settings/device/${deviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
  },
};

// Image Upload API (multipart/form-data — cannot use apiCall which forces JSON)
export const uploadAPI = {
  uploadImage: async (file, token) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch('/api/upload/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Upload failed (${res.status})`);
    }
    return res.json();
  },
  deleteImage: async (objectKey, token) => {
    return apiCall('/api/upload/image', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ objectKey }),
    });
  },
};

// Public API Key API
export const publicApiKeyAPI = {
  getKey: async (token) => {
    return apiCall('/api/settings/api-key', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  generateKey: async (token) => {
    return apiCall('/api/settings/api-key/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

// Payment API
export const paymentsAPI = {
  create: async (paymentData, token) => {
    return apiCall('/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(paymentData),
    });
  },

  getBySale: async (saleId, token) => {
    return apiCall(`/api/payments/sale/${saleId}`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },

  delete: async (id, token) => {
    return apiCall(`/api/payments/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },
};

// Enquiries API calls (admin management)
export const enquiriesAPI = {
  getAll: async (token, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = queryParams ? `/api/enquiries?${queryParams}` : '/api/enquiries';
    return apiCall(endpoint, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  getById: async (id, token) => {
    return apiCall(`/api/enquiries/${id}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  update: async (id, data, token) => {
    return apiCall(`/api/enquiries/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
  },
};
