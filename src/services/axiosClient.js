// src/services/axiosClient.js
import axios from 'axios';
import Constants from 'expo-constants';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';

// Resolve API URL with fallback chain:
// 1. process.env (works in local dev with .env file)
// 2. expo-constants extra (works in EAS builds via app.config.js)
// 3. Hardcoded fallback (last resort)
const API_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl ||
    'https://api.repairomoto.in';

const axiosClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor – attach token
axiosClient.interceptors.request.use(
    (config) => {
        const { token } = store.getState().auth;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor – handle 401
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            store.dispatch(logout());
            // Optional: emit event or use navigation ref to redirect
        }
        return Promise.reject(error);
    }
);

export default axiosClient;