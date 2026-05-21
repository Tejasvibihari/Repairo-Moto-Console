import axiosClient from './axiosClient';
import { store } from '../store';

export const authService = {
    login: async (credentials) => {
        let url = '';
        const role = credentials.role;
        if (role === 'admin') {
            url = '/api/admin/adminsignin';
        } else if (role === 'employee') {
            url = '/api/employee/auth/employee-sign-in';
        } else if (role === 'vendor') {
            url = '/api/vendor/auth/vendor-sign-in';
        } else {
            throw new Error('Invalid login role provided.');
        }
        
        const response = await axiosClient.post(url, {
            email: credentials.email,
            password: credentials.password
        });
        return response;
    },
    getMe: async () => {
        const { user, token } = store.getState().auth;
        if (!user || !user.role || !token) {
            throw new Error('No session');
        }

        let url = '';
        let userKey = '';
        const role = user.role.toLowerCase();

        if (role === 'admin') {
            url = '/api/admin/me';
            userKey = 'user';
        } else if (role === 'vendor') {
            url = '/api/vendor/me';
            userKey = 'vendor';
        } else {
            // For employee sub-roles (mechanic, delivery, operational_manager, telecaller, employee)
            url = '/api/employee/me';
            userKey = 'employee';
        }

        const response = await axiosClient.get(url);
        const userData = response.data[userKey] || response.data.user || response.data;

        return {
            data: {
                token: response.data.token || token,
                user: {
                    ...userData,
                    _id: userData._id || userData.id || user._id,
                    role: userData.role || user.role,
                }
            }
        };
    }
};

