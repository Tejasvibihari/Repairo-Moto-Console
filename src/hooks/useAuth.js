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
        let userKey = '';

        if (role === 'admin') {
            url = '/api/admin/adminsignin';
            userKey = 'user';
        } else if (role === 'employee') {
            url = '/api/employee/auth/employee-sign-in';
            userKey = 'employee';
        } else if (role === 'vendor') {
            url = '/api/vendor/auth/vendor-sign-in';
            userKey = 'vendor';
        } else {
            const errorMsg = 'Invalid login role provided.';
            dispatch(loginFailure(errorMsg));
            return { success: false, error: errorMsg };
        }



        try {
            const response = await axiosClient.post(url, { email, password });
            const { token } = response.data;
            let userData = response.data[userKey]; // extract user from correct key

            // If userData is undefined, throw an error
            if (!userData) {
                throw new Error(`User data not found in response under key "${userKey}"`);
            }

            // The backend already returns _id (MongoDB), no need to map
            // But ensure _id exists; if not, keep as is
            const mappedUser = {
                ...userData,
                _id: userData._id || userData.id, // fallback to id if _id missing
            };
            // Remove id if it existed and we used it
            if (mappedUser.id && !mappedUser._id) {
                mappedUser._id = mappedUser.id;
            }
            delete mappedUser.id;

            dispatch(loginSuccess({ token, user: mappedUser }));
            return { success: true };
        } catch (err) {

            const errorMessage = err.response?.data?.message || err.message || 'Login failed. Please try again.';
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