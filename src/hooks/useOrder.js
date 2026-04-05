// hooks/useOrder.js
import { useState, useEffect, useCallback, useRef } from 'react';
import axiosClient from '../services/axiosClient'; // adjust path as needed

const useOrder = (initialFilters = {}, initialPage = 1, initialLimit = 10) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        currentPage: initialPage,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: initialLimit,
    });

    // State for filters, page, limit
    const [filters, setFilters] = useState(initialFilters);
    const [page, setPage] = useState(initialPage);
    const [limit, setLimit] = useState(initialLimit);

    // AbortController ref for cancellation
    const abortControllerRef = useRef(null);

    // Function to fetch orders
    const fetchOrders = useCallback(async () => {
        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setLoading(true);
        setError(null);

        try {
            // Build query parameters
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('limit', limit);

            // Add filters if they have value
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params.append(key, value);
                }
            });

            const response = await axiosClient.get(`/api/admin/order/getallorder?${params.toString()}`, {
                signal: abortController.signal,
            });

            // Handle response structure
            let orders = [];
            let paginationData = {};
            console.log(response.data.data)
            if (response.data.success) {
                orders = response.data.data || [];
                paginationData = response.data.pagination || {};
            } else if (Array.isArray(response.data)) {
                // Fallback for old API format
                orders = response.data;
                paginationData = {
                    currentPage: page,
                    totalPages: 1,
                    totalItems: orders.length,
                    itemsPerPage: limit,
                };
            } else {
                orders = [];
            }

            setData(orders);
            setPagination({
                currentPage: paginationData.currentPage || page,
                totalPages: paginationData.totalPages || 1,
                totalItems: paginationData.totalItems || orders.length,
                itemsPerPage: paginationData.itemsPerPage || limit,
            });
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
                // Request cancelled, ignore
                return;
            }
            setError(err.response?.data?.message || err.message || 'Failed to fetch orders');
            console.error('useOrder error:', err);
        } finally {
            if (abortController.signal.aborted) return;
            setLoading(false);
        }
    }, [page, limit, filters]);

    // Refetch manually (e.g., after filter change without auto-fetch)
    const refetch = useCallback(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Apply new filters and reset to page 1
    const applyFilters = useCallback((newFilters) => {
        setFilters(newFilters);
        setPage(1);
    }, []);

    // Change page
    const changePage = useCallback((newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPage(newPage);
        }
    }, [pagination.totalPages]);

    // Change items per page and reset to page 1
    const changeLimit = useCallback((newLimit) => {
        setLimit(newLimit);
        setPage(1);
    }, []);

    // Auto-fetch when dependencies change
    useEffect(() => {
        fetchOrders();
        // Cleanup: abort request on unmount or before next fetch
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchOrders]);

    return {
        data,
        loading,
        error,
        pagination,
        refetch,
        setPage: changePage,
        setLimit: changeLimit,
        setFilters: applyFilters,
        // Also expose raw setters if needed (use with caution to avoid auto-fetch loops)
        rawSetFilters: setFilters,
        rawSetPage: setPage,
        rawSetLimit: setLimit,
        // Current state values
        filters,
        page,
        limit,
    };
};

export default useOrder;