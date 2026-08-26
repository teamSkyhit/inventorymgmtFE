// Single source of truth for all React Query cache keys.
// Changing a key here invalidates the right cache entries everywhere.

export const queryKeys = {
  // Auth
  auth: () => ['auth'],

  // Stores — shared across 7+ pages
  stores: () => ['stores'],
  store: (id) => ['stores', id],

  // Categories — shared via CommonContext
  categories: () => ['categories'],

  // Products
  products: (params = {}) => ['products', params],
  product: (id) => ['products', id],

  // Counters
  counters: (storeId = null) => ['counters', storeId],
  counter: (id) => ['counters', 'detail', id],

  // Sales / Receipts
  sales: (params = {}) => ['sales', params],
  sale: (id) => ['sales', id],
  receipt: (receiptNumber) => ['receipts', receiptNumber],

  // Dashboard
  dashboardMetrics: () => ['dashboard', 'metrics'],
  dashboardActivity: () => ['dashboard', 'activity'],

  // Reports
  report: (type, params = {}) => ['reports', type, params],

  // Returns
  returns: (params = {}) => ['returns', params],

  // Shelves
  shelves: () => ['shelves'],

  // Stock transfers
  stockTransfers: (params = {}) => ['stockTransfers', params],

  // Shifts
  shifts: (params = {}) => ['shifts', params],

  // Users
  users: () => ['users'],

  // Enquiries
  enquiries: (params = {}) => ['enquiries', params],

  // Settings
  storeSettings: (storeId) => ['settings', 'store', storeId],
  devices: () => ['settings', 'devices'],
};
