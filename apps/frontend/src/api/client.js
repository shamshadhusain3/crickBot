import axios from 'axios';

// Create a centralized Axios client
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, 
});

// We can add request/response interceptors here for Auth tokens later
apiClient.interceptors.response.use(
  (response) => response.data, // Only return the data payload recursively
  (error) => {
    // Global error logger wrapper
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
