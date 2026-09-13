// hooks/useCoupon.js
// Admin coupon data hook — list (paginated/filterable) + CRUD mutations.
// Mirrors the shape of useOrder.js so screens can consume it the same way.
import { useState, useEffect, useCallback, useRef } from 'react';
import axiosClient from '../services/axiosClient';

const useCoupon = (initialFilters = {}, initialPage = 1, initialLimit = 10) => {
    // --- List state ---
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

    // --- Mutation state (create/update/delete/toggle) ---
    const [mutationLoading, setMutationLoading] = useState(false);
    const [mutationError, setMutationError] = useState(null);

    const abortControllerRef = useRef(null);

    const setFilters = useCallback((updater) => {
        setFiltersState((prev) => {
            const newFilters = typeof updater === 'function' ? updater(prev) : updater;
            return newFilters;
        });
        setPage(1);
    }, []);

    // --- GET /api/admin/coupons/all ---
    const fetchCoupons = useCallback(async () => {
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

            if (filters.search) params.append('search', filters.search);
            if (filters.isActive !== undefined && filters.isActive !== null && filters.isActive !== 'all') {
                params.append('isActive', filters.isActive === true || filters.isActive === 'true');
            }
            if (filters.sort) params.append('sort', filters.sort);

            const response = await axiosClient.get(`/api/admin/coupons/all?${params.toString()}`, {
                signal: abortController.signal,
            });

            let coupons = [];
            let paginationData = {};
            if (response.data?.success) {
                coupons = response.data.data || response.data.coupons || [];
                paginationData = response.data.pagination || {};
            } else if (Array.isArray(response.data)) {
                coupons = response.data;
            }

            setData(coupons);
            setPagination({
                currentPage: paginationData.currentPage || page,
                totalPages: paginationData.totalPages || 1,
                totalItems: paginationData.totalItems ?? coupons.length,
                itemsPerPage: paginationData.itemsPerPage || limit,
            });
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            setError(err.response?.data?.message || err.message || 'Failed to fetch coupons');
            console.error('useCoupon fetch error:', err);
        } finally {
            if (!abortController.signal.aborted) setLoading(false);
        }
    }, [page, limit, filters]);

    const refetch = useCallback(() => fetchCoupons(), [fetchCoupons]);

    const changePage = useCallback((newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPage(newPage);
        }
    }, [pagination.totalPages]);

    const changeLimit = useCallback((newLimit) => {
        setLimit(newLimit);
        setPage(1);
    }, []);

    // --- POST /api/admin/coupons/create ---
    const createCoupon = useCallback(async (payload) => {
        setMutationLoading(true);
        setMutationError(null);
        try {
            const response = await axiosClient.post('/api/admin/coupons/create', payload);
            await refetch();
            return response.data;
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to create coupon';
            setMutationError(msg);
            throw new Error(msg);
        } finally {
            setMutationLoading(false);
        }
    }, [refetch]);

    // --- PUT /api/admin/coupons/:id ---
    const updateCoupon = useCallback(async (id, payload) => {
        setMutationLoading(true);
        setMutationError(null);
        try {
            const response = await axiosClient.put(`/api/admin/coupons/${id}`, payload);
            await refetch();
            return response.data;
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to update coupon';
            setMutationError(msg);
            throw new Error(msg);
        } finally {
            setMutationLoading(false);
        }
    }, [refetch]);

    // --- DELETE /api/admin/coupons/:id ---
    const deleteCoupon = useCallback(async (id) => {
        setMutationLoading(true);
        setMutationError(null);
        try {
            const response = await axiosClient.delete(`/api/admin/coupons/${id}`);
            await refetch();
            return response.data;
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to delete coupon';
            setMutationError(msg);
            throw new Error(msg);
        } finally {
            setMutationLoading(false);
        }
    }, [refetch]);

    // --- PATCH /api/admin/coupons/:id/toggle ---
    const toggleCoupon = useCallback(async (id) => {
        setMutationLoading(true);
        setMutationError(null);
        try {
            const response = await axiosClient.patch(`/api/admin/coupons/${id}/toggle`);
            await refetch();
            return response.data;
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to toggle coupon';
            setMutationError(msg);
            throw new Error(msg);
        } finally {
            setMutationLoading(false);
        }
    }, [refetch]);

    // --- GET /api/admin/coupons/:id (single coupon, e.g. to prefill an edit screen) ---
    const fetchCouponById = useCallback(async (id) => {
        const response = await axiosClient.get(`/api/admin/coupons/${id}`);
        return response.data?.data || response.data;
    }, []);

    // --- GET /api/admin/coupons/:id/usage ---
    const fetchCouponUsage = useCallback(async (id) => {
        const response = await axiosClient.get(`/api/admin/coupons/${id}/usage`);
        return response.data?.data || response.data;
    }, []);

    const clearMutationError = useCallback(() => setMutationError(null), []);

    useEffect(() => {
        fetchCoupons();
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [fetchCoupons]);

    return {
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

        createCoupon,
        updateCoupon,
        deleteCoupon,
        toggleCoupon,
        fetchCouponById,
        fetchCouponUsage,
        mutationLoading,
        mutationError,
        clearMutationError,
    };
};

export default useCoupon;
