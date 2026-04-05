// src/navigation/RoleRouter.js
// After authentication succeeds, this component picks the correct navigator
// based on the authenticated user's role.

import React from 'react';
import { useSelector } from 'react-redux';
import { selectUserRole } from '../store/slices/authSlice';
import { ROLES, ROLE_CATEGORY } from '../constants/roles';

import AdminNavigator from './admin/AdminNavigator';
import EmployeeNavigator from './employee/EmployeeNavigator';
import VendorNavigator from './vendor/VendorNavigator';


// Fallback for unknown roles
import UnauthorizedScreen from '../screens/shared/UnauthorizedScreen';

export default function RoleRouter() {
    const role = useSelector(selectUserRole);
    const category = ROLE_CATEGORY[role];

    switch (category) {
        case 'admin': return <AdminNavigator />;
        case 'employee': return <EmployeeNavigator />;
        case 'vendor': return <VendorNavigator />;
        default:
            return <UnauthorizedScreen />;
    }
}