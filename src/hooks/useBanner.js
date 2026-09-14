// src/hooks/useBanner.js
// Admin banner data hook — list + CRUD + reorder mutations.
// Mirrors the shape of useCoupon.js so screens can consume it the same way.
import { useState, useEffect, useCallback, useRef } from 'react';
import axiosClient from '../services/axiosClient';

const DEFAULT_META = { total: 0, maxTotal: 10, active: 0, maxActive: 5 };

const useBanner = () => {
    // --- List state ---
    const [data, setData] = useState([]);
    const [meta, setMeta] = useState(DEFAULT_META);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Mutation state (create/update/delete/reorder) ---
    const [mutationLoading, setMutationLoading] = useState(false);
    const [mutationError, setMutationError] = useState(null);

    const abortControllerRef = useRef(null);

    // --- GET /api/admin/banner ---
    const fetchBanners = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setLoading(true);
        setError(null);

        try {
            const response = await axiosClient.get('/api/admin/banner', {
                signal: abortController.signal,
            });

            const banners = response.data?.banners || [];
            setData(banners);
            setMeta({ ...DEFAULT_META, ...(response.data?.meta || {}) });
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            setError(err.response?.data?.message || err.message || 'Failed to fetch banners');
            console.error('useBanner fetch error:', err);
        } finally {
            if (!abortController.signal.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBanners();
        return () => abortControllerRef.current?.abort();
    }, [fetchBanners]);

    const refetch = useCallback(() => fetchBanners(), [fetchBanners]);

    // Builds the multipart body shared by create/update.
    const buildFormData = ({ title, link, order, isActive, image }) => {
        const formData = new FormData();
        if (title !== undefined) formData.append('title', title ?? '');
        if (link !== undefined) formData.append('link', link ?? '');
        if (order !== undefined && order !== null && order !== '') {
            formData.append('order', String(order));
        }
        if (isActive !== undefined) formData.append('isActive', String(isActive));
        if (image?.uri) {
            formData.append('image', {
                uri: image.uri,
                name: `banner-${Date.now()}.jpg`,
                type: 'image/jpeg',
            });
        }
        return formData;
    };

    // --- POST /api/admin/banner ---
    const createBanner = useCallback(async (payload) => {
        setMutationLoading(true);
        setMutationError(null);
        try {
            const formData = buildFormData(payload);
            const response = await axiosClient.post('/api/admin/banner', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            await fetchBanners();
            return response.data;
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to create banner';
            setMutationError(msg);
            throw new Error(msg);
        } finally {
            setMutationLoading(false);
        }
    }, [fetchBanners]);

    // --- PATCH /api/admin/banner/:id ---
    const updateBanner = useCallback(async (id, payload) => {
        setMutationLoading(true);
        setMutationError(null);
        try {
            const formData = buildFormData(payload);
            const response = await axiosClient.patch(`/api/admin/banner/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            await fetchBanners();
            return response.data;
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to update banner';
            setMutationError(msg);
            throw new Error(msg);
        } finally {
            setMutationLoading(false);
        }
    }, [fetchBanners]);

    // --- DELETE /api/admin/banner/:id ---
    const deleteBanner = useCallback(async (id) => {
        setMutationLoading(true);
        setMutationError(null);
        try {
            const response = await axiosClient.delete(`/api/admin/banner/${id}`);
            await fetchBanners();
            return response.data;
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to delete banner';
            setMutationError(msg);
            throw new Error(msg);
        } finally {
            setMutationLoading(false);
        }
    }, [fetchBanners]);

    // --- PATCH /api/admin/banner/reorder ---
    // orders: [{ id, order }, ...]
    const reorderBanners = useCallback(async (orders) => {
        setMutationLoading(true);
        setMutationError(null);
        try {
            const response = await axiosClient.patch('/api/admin/banner/reorder', { orders });
            await fetchBanners();
            return response.data;
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to reorder banners';
            setMutationError(msg);
            throw new Error(msg);
        } finally {
            setMutationLoading(false);
        }
    }, [fetchBanners]);

    // --- Convenience: flip isActive without touching other fields/image ---
    const toggleBanner = useCallback(async (banner) => {
        return updateBanner(banner._id, { isActive: !banner.isActive });
    }, [updateBanner]);

    return {
        data,
        meta,
        loading,
        error,
        refetch,
        createBanner,
        updateBanner,
        deleteBanner,
        reorderBanners,
        toggleBanner,
        mutationLoading,
        mutationError,
    };
};

export default useBanner;