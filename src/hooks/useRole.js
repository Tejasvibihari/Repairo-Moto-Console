import { useSelector } from 'react-redux';
import { selectUserRole } from '../store/slices/authSlice';
import { ROLE_CATEGORY } from '../constants/roles';

export function useRole() {
    const role = useSelector(selectUserRole);
    const category = role ? ROLE_CATEGORY[role] : null;

    return {
        role,
        category,
        isAdmin: category === 'admin',
        isEmployee: category === 'employee',
        isVendor: category === 'vendor',
    };
}
