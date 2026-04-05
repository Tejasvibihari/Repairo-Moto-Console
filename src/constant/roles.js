// ─── Role Constants ───────────────────────────────────────────────────────────
// Single source of truth for every role in the system.
// Backend should return one of these strings in the auth token.

export const ROLES = {
    // Top-level roles
    ADMIN: 'admin',
    VENDOR: 'vendor',
    CUSTOMER: 'customer',

    // Employee sub-roles
    MECHANIC: 'mechanic',
    DELIVERY: 'delivery',
    OPS_MANAGER: 'ops_manager',
    TELECALLER: 'telecaller',
    EMPLOYEE: 'employee', // fallback for any unspecified staff
};

// Which top-level bucket does each role belong to?
export const ROLE_CATEGORY = {
    [ROLES.ADMIN]: 'admin',
    [ROLES.VENDOR]: 'vendor',
    [ROLES.CUSTOMER]: 'customer',
    [ROLES.MECHANIC]: 'employee',
    [ROLES.DELIVERY]: 'employee',
    [ROLES.OPS_MANAGER]: 'employee',
    [ROLES.TELECALLER]: 'employee',
    [ROLES.EMPLOYEE]: 'employee',
};

// Human-readable labels
export const ROLE_LABELS = {
    [ROLES.ADMIN]: 'Administrator',
    [ROLES.VENDOR]: 'Vendor',
    [ROLES.CUSTOMER]: 'Customer',
    [ROLES.MECHANIC]: 'Mechanic',
    [ROLES.DELIVERY]: 'Delivery Agent',
    [ROLES.OPS_MANAGER]: 'Operations Manager',
    [ROLES.TELECALLER]: 'Telecaller',
    [ROLES.EMPLOYEE]: 'Employee',
};

// Helper
export const isEmployee = (role) => ROLE_CATEGORY[role] === 'employee';
export const isAdmin = (role) => role === ROLES.ADMIN;
export const isVendor = (role) => role === ROLES.VENDOR;