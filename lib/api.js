// API utility functions for external server calls
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export const apiCall = async (endpoint, options = {}, useProxy = false) => {
  // Use proxy for same-origin requests or direct external calls
  const url = useProxy ? endpoint : `${API_BASE_URL}${endpoint}`;

  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    mode: 'cors',
    credentials: 'include',
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    // Check if response is ok
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Authentication API calls
export const authAPI = {
  login: async (email, password, role) => {
    try {
      // Try direct external API call first
      return await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      });
    } catch (error) {
      console.warn('Direct API call failed, trying proxy:', error.message);
      // Fallback to proxy endpoint if direct call fails due to CORS
      return await apiCall(
        '/api/proxy/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, role }),
        },
        true
      ); // Use proxy
    }
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
  getAll: async () => {
    return apiCall('/api/products');
  },

  create: async (product) => {
    return apiCall('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  update: async (id, product) => {
    return apiCall(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  },

  delete: async (id) => {
    return apiCall(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },
};

// Dashboard API calls
export const dashboardAPI = {
  getMetrics: async (token) => {
    try {
      // Try direct external API call first
      return await apiCall('/api/dashboard/metrics', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.warn(
        'Direct dashboard API call failed, trying proxy:',
        error.message
      );
      // Fallback to proxy endpoint if direct call fails due to CORS
      return await apiCall(
        '/api/proxy/dashboard/metrics',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        true
      ); // Use proxy
    }
  },
  getRecentUpdates: async (token) => {
    try {
      // Try direct external API call first
      return await apiCall('/api/activity?page=1&limit=20', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.warn(
        'Direct recent updates API call failed, trying proxy:',
        error.message
      );
      // Fallback to proxy endpoint if direct call fails due to CORS
      return await apiCall(
        '/api/proxy/dashboard/recent-updates',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        true
      ); // Use proxy
    }
  },
};

//Categories API calls
export const categoriesAPI = {
  getAll: async () => {
    return apiCall('/api/categories');
  },
  create: async (category) => {
    return apiCall('/api/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  },
  update: async (id, category) => {
    return apiCall(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    });
  },
  delete: async (id) => {
    return apiCall(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  },
};
