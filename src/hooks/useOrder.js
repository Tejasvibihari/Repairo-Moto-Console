// hooks/useOrder.js
import { useState, useEffect, useCallback, useRef } from 'react';
import axiosClient from '../services/axiosClient';

const useOrder = (initialFilters = {}, initialPage = 1, initialLimit = 10) => {
    // --- Existing state ---
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        currentPage: initialPage,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: initialLimit,
    });
    const [filters, setFiltersState] = useState(initialFilters);
    const [page, setPage] = useState(initialPage);
    const [limit, setLimit] = useState(initialLimit);

    // --- New mutation states ---
    const [mutationLoading, setMutationLoading] = useState(false);
    const [mutationError, setMutationError] = useState(null);

    const abortControllerRef = useRef(null);

    // --- Existing helper: setFilters (resets page) ---
    const setFilters = useCallback((updater) => {
        setFiltersState(prev => {
            const newFilters = typeof updater === 'function' ? updater(prev) : updater;
            return newFilters;
        });
        setPage(1);
    }, []);

    // --- Existing fetchOrders (unchanged, but used by refetch) ---
    const fetchOrders = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('limit', limit);

            const STATUS_DB_MAP = {
                'pending': 'Pending',
                'in_progress': 'In Progress',
                'mechanic_assigned': 'Mechanic Assigned',
                'completed': 'Completed',
                'invoice_generated': 'Invoice Generated',
                'cancelled': 'Cancelled',
            };
            const SERVICE_DB_MAP = {
                'scheduled': 'Schedule Repair',
                'emergency': 'Emergency Repair',
            };
            const SORT_DB_MAP = {
                'date_desc': 'createdAt:desc',
                'date_asc': 'createdAt:asc',
                'status': 'status:asc',
                'amount_desc': 'total.total:desc',
            };

            const backendFilters = { ...filters };
            if (backendFilters.search) {
                backendFilters.q = backendFilters.search;
                delete backendFilters.search;
            }
            if (backendFilters.status) {
                backendFilters.status = STATUS_DB_MAP[backendFilters.status] || backendFilters.status;
            }
            if (backendFilters.serviceType) {
                backendFilters.serviceType = SERVICE_DB_MAP[backendFilters.serviceType] || backendFilters.serviceType;
            }
            if (backendFilters.sortBy) {
                backendFilters.sort = SORT_DB_MAP[backendFilters.sortBy] || 'createdAt:desc';
                delete backendFilters.sortBy;
            } else {
                backendFilters.sort = 'createdAt:desc';
            }
            if (backendFilters.mechanic) {
                backendFilters.assignedMechanic = backendFilters.mechanic;
                delete backendFilters.mechanic;
            }
            if (backendFilters.dateRange) {
                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);
                if (backendFilters.dateRange === 'today') {
                    backendFilters.fromDate = todayDate.toISOString();
                    const endToday = new Date(todayDate);
                    endToday.setHours(23, 59, 59, 999);
                    backendFilters.toDate = endToday.toISOString();
                } else if (backendFilters.dateRange === 'week') {
                    const startOfWeek = new Date(todayDate);
                    startOfWeek.setDate(todayDate.getDate() - todayDate.getDay());
                    backendFilters.fromDate = startOfWeek.toISOString();
                } else if (backendFilters.dateRange === 'month') {
                    const startOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
                    backendFilters.fromDate = startOfMonth.toISOString();
                } else if (backendFilters.dateRange === 'custom') {
                    if (backendFilters.dateFrom) backendFilters.fromDate = new Date(backendFilters.dateFrom).toISOString();
                    if (backendFilters.dateTo) {
                        const endCustom = new Date(backendFilters.dateTo);
                        endCustom.setHours(23, 59, 59, 999);
                        backendFilters.toDate = endCustom.toISOString();
                    }
                }
                delete backendFilters.dateRange;
                delete backendFilters.dateFrom;
                delete backendFilters.dateTo;
            }

            Object.entries(backendFilters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.append(key, value);
                }
            });

            const response = await axiosClient.get(`/api/admin/order/getallorder?${params.toString()}`, {
                signal: abortController.signal,
            });

            let orders = [];
            let paginationData = {};
            if (response.data.success) {
                orders = response.data.data || [];
                paginationData = response.data.pagination || {};
            } else if (Array.isArray(response.data)) {
                orders = response.data;
                paginationData = {
                    currentPage: page,
                    totalPages: 1,
                    totalItems: orders.length,
                    itemsPerPage: limit,
                };
            }

            setData(orders);
            setPagination({
                currentPage: paginationData.currentPage || page,
                totalPages: paginationData.totalPages || 1,
                totalItems: paginationData.totalItems || orders.length,
                itemsPerPage: paginationData.itemsPerPage || limit,
            });
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            setError(err.response?.data?.message || err.message || 'Failed to fetch orders');
            console.error('useOrder error:', err);
        } finally {
            if (!abortController.signal.aborted) setLoading(false);
        }
    }, [page, limit, filters]);

    const refetch = useCallback(() => fetchOrders(), [fetchOrders]);

    const changePage = useCallback((newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPage(newPage);
        }
    }, [pagination.totalPages]);

    const changeLimit = useCallback((newLimit) => {
        setLimit(newLimit);
        setPage(1);
    }, []);

    // --- NEW: Update Mechanic ---
    const updateMechanic = useCallback(async (orderId, mechanicId) => {
        setMutationLoading(true);
        setMutationError(null);
        try {
            const response = await axiosClient.put(`/api/admin/order/update/updateMechanic/${orderId}`, { mechanicId });
            await refetch(); // refresh the order list
            return response.data;
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to update mechanic';
            setMutationError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setMutationLoading(false);
        }
    }, [refetch]);

    // --- NEW: Update Delivery Person ---
    const updateDelivery = useCallback(async (orderId, deliveryId) => {
        setMutationLoading(true);
        setMutationError(null);
        try {
            const response = await axiosClient.put(`/api/admin/order/updateDelivery/${orderId}`, { deliveryId });
            await refetch();
            return response.data;
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to update delivery person';
            setMutationError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setMutationLoading(false);
        }
    }, [refetch]);

    // --- NEW: Update Vendor ---
    const updateVendor = useCallback(async (orderId, vendorId) => {
        setMutationLoading(true);
        setMutationError(null);
        try {
            const response = await axiosClient.put(`/api/admin/order/updateVendor/${orderId}`, { vendorId });
            await refetch();
            return response.data;
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to update vendor';
            setMutationError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setMutationLoading(false);
        }
    }, [refetch]);

    // --- NEW: Update Order Status ---
    const updateOrderStatus = useCallback(async (orderId, status) => {
        setMutationLoading(true);
        setMutationError(null);
        try {
            const response = await axiosClient.put(`/api/admin/order/updateStatus/${orderId}`, { status });
            await refetch();
            return response.data;
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to update order status';
            setMutationError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setMutationLoading(false);
        }
    }, [refetch]);

    // --- Clear mutation error helper ---
    const clearMutationError = useCallback(() => setMutationError(null), []);

    useEffect(() => {
        fetchOrders();
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [fetchOrders]);

    // --- Return extended object ---
    return {
        // Existing
        data,
        loading,
        error,
        pagination,
        refetch,
        setPage: changePage,
        setLimit: changeLimit,
        setFilters,
        filters,
        page,
        limit,
        // New mutation methods & states
        updateMechanic,
        updateDelivery,
        updateVendor,
        updateOrderStatus,
        mutationLoading,
        mutationError,
        clearMutationError,
    };
};

export default useOrder;