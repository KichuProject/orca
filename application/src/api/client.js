import axios from 'axios';
import { getBaseUrl } from '../config/api';

const client = axios.create({
  timeout: 60000, // 60s timeout for comprehensive multi-agent reasoning
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Dynamic Base URL injector before every request
client.interceptors.request.use(
  (config) => {
    config.baseURL = getBaseUrl();
    if (__DEV__) {
      console.log(`📡 [ORCA API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with user-safe error normalization
client.interceptors.response.use(
  (response) => response,
  (error) => {
    let friendlyMessage = 'ORCA could not connect right now.';
    let isNetworkError = false;

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      friendlyMessage = 'Analysis took longer than expected. Please tap retry.';
    } else if (!error.response || error.code === 'ERR_NETWORK') {
      friendlyMessage = 'Unable to reach the ORCA marine server. Please verify network connectivity.';
      isNetworkError = true;
    } else if (error.response?.status === 503) {
      friendlyMessage = 'ORCA Marine Intelligence Brain is temporarily offline.';
    } else if (error.response?.status === 422) {
      friendlyMessage = 'Invalid request parameters received by the marine server.';
    } else if (error.response?.status >= 500) {
      friendlyMessage = 'An internal marine processing error occurred. Please try again.';
    }

    if (__DEV__) {
      console.warn('⚠️ [ORCA API Error]', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    const customError = new Error(friendlyMessage);
    customError.originalError = error;
    customError.status = error.response?.status;
    customError.isNetworkError = isNetworkError;
    return Promise.reject(customError);
  }
);

export default client;
