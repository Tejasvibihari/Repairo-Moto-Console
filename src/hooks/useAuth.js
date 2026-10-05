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

    // Same user-shaping for every way of signing in (password or WhatsApp OTP).
    const completeLogin = (data, userKey) => {
        const { token } = data;
        const userData = data[userKey]; // extract user from correct key

        // If userData is undefined, throw an error
        if (!userData) {
            throw new Error(`User data not found in response under key "${userKey}"`);
        }

        // The backend already returns _id (MongoDB); fall back to id if it is missing
        const mappedUser = {
            ...userData,
            _id: userData._id || userData.id,
        };
        delete mappedUser.id;

        dispatch(loginSuccess({ token, user: mappedUser }));
    };

    // `email` may also be a phone number for employees (the server accepts either).
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
            const body = role === 'admin'
                ? { email, password }
                : { identifier: String(email).trim(), email: String(email).trim(), password };
            const response = await axiosClient.post(url, body);
            completeLogin(response.data, userKey);
            return { success: true };
        } catch (err) {

            const errorMessage = err.response?.data?.message || err.message || 'Login failed. Please try again.';
            dispatch(loginFailure(errorMessage));
            return { success: false, error: errorMessage };
        }
    };

    // ── WhatsApp OTP (employee + vendor only — never admin) ──
    const OTP_BASE = { employee: '/api/employee/auth', vendor: '/api/vendor/auth' };

    /**
     * Ask the server to WhatsApp a code.
     * @returns {{success:true, resendIn:number} | {success:false, error:string, retryAfter?:number}}
     * `retryAfter` (seconds) is set when the number is still cooling down — start the countdown from it.
     */
    const sendOtp = async (phone, role) => {
        if (!OTP_BASE[role]) return { success: false, error: 'WhatsApp login is not available for this role.' };
        try {
            const { data } = await axiosClient.post(`${OTP_BASE[role]}/send-otp`, { phone });
            return { success: true, resendIn: data?.resendIn || 60 };
        } catch (err) {
            const d = err.response?.data;
            return {
                success: false,
                error: d?.message || err.message || 'Could not send the code. Please try again.',
                retryAfter: d?.retryAfter,
                status: err.response?.status,
            };
        }
    };

    const loginWithOtp = async (phone, otp, role) => {
        if (!OTP_BASE[role]) return { success: false, error: 'WhatsApp login is not available for this role.' };
        dispatch(loginStart());
        try {
            const { data } = await axiosClient.post(`${OTP_BASE[role]}/verify-otp`, { phone, otp });
            completeLogin(data, role === 'employee' ? 'employee' : 'vendor');
            return { success: true };
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Verification failed. Please try again.';
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
        sendOtp,
        loginWithOtp,
        logout: performLogout,
    };
}