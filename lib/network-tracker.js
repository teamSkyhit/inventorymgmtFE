let activeRequests = 0;
const listeners = new Set();

const notify = () => {
  const count = Math.max(activeRequests, 0);
  listeners.forEach((listener) => {
    try {
      listener(count);
    } catch (err) {
      console.error('network tracker listener error', err);
    }
  });
};

export const subscribeToNetworkStatus = (callback) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

export const getActiveRequestCount = () => activeRequests;

export const beginNetworkRequest = () => {
  activeRequests += 1;
  notify();
};

export const endNetworkRequest = () => {
  activeRequests = Math.max(activeRequests - 1, 0);
  notify();
};

