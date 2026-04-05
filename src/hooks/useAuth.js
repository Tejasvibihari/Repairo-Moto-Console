import { useSelector, useDispatch } from 'react-redux';
import { selectIsAuthenticated, selectUser, logout } from '../store/slices/authSlice';

export function useAuth() {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const user = useSelector(selectUser);

    const performLogout = () => {
        dispatch(logout());
    };

    return {
        isAuthenticated,
        user,
        logout: performLogout,
    };
}
