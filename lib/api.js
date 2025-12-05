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

// Handle 401 Unauthorized - auto logout
const handleUnauthorized = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    // Only redirect if not already on login page
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
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
      handleUnauthorized();
      return {
        success: false,
        error: 'Unauthorized. Please login again.',
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
};

// Shelves API calls
// Users API calls
export const usersAPI = {
  getAll: async (token) => {
    return apiCall('/api/users', {
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
};
