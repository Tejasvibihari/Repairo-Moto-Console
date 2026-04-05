// hooks/useAuth.js
import { useSelector, useDispatch } from 'react-redux';
import {
    selectIsAuthenticated,
    selectUser,
    loginStart,
    loginSuccess,
    loginFailure,
    logout,
} from '../store/slices/authSlice';
import axiosClient from '../services/axiosClient';

export function useAuth() {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const user = useSelector(selectUser);
    const loading = useSelector((state) => state.auth.loading);
    const error = useSelector((state) => state.auth.error);

    const login = async (email, password, role) => {
        dispatch(loginStart());

        let url = '';
        if (role === 'admin') {
            url = '/api/admin/adminsignin';
        } else if (role === 'employee') {
            url = '/api/employee/auth/employee-sign-in';
        } else if (role === 'vendor') {
            url = '/api/vendor/auth/vendor-sign-in';
        } else {
            const errorMsg = 'Invalid login role provided.';
            dispatch(loginFailure(errorMsg));
            return { success: false, error: errorMsg };
        }

        try {
            const response = await axiosClient.post(url, { email, password });
            const { token, user: userData } = response.data;

            // Map backend field 'id' to '_id' for consistency with existing selectors
            const mappedUser = {
                ...userData,
                _id: userData.id,
            };
            delete mappedUser.id;

            dispatch(loginSuccess({ token, user: mappedUser }));
            return { success: true };
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
            dispatch(loginFailure(errorMessage));
            return { success: false, error: errorMessage };
        }
    };

    const performLogout = () => {
        dispatch(logout());
    };

    return {
        isAuthenticated,
        user,
        loading,
        error,
        login,
        logout: performLogout,
    };
}