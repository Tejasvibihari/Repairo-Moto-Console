import { useState, useEffect, useCallback, useRef } from 'react';
import axiosClient from '../services/axiosClient';

/**
 * Custom hook to fetch all vendors.
 * (Backend endpoint currently does not support filters, but hook is extendable.)
 */
const useVendor = (autoFetch = true) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(autoFetch);
    const [error, setError] = useState(null);

    const abortControllerRef = useRef(null);

    const fetchVendors = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setLoading(true);
        setError(null);

        try {
            const response = await axiosClient.get('/api/vendor/getallvendor', {
                signal: abortController.signal,
            });
            // Assuming response structure: { message, vendors }
            const vendors = response.data.vendors || [];
            setData(vendors);
            return vendors;
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            setError(err.response?.data?.message || err.message || 'Failed to fetch vendors');
            console.error('useVendor error:', err);
            throw err;
        } finally {
            if (!abortController.signal.aborted) setLoading(false);
        }
    }, []);

    const refetch = useCallback(() => fetchVendors(), [fetchVendors]);

    useEffect(() => {
        if (autoFetch) {
            fetchVendors();
        }
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [autoFetch, fetchVendors]);

    return {
        data,      // array of vendors
        loading,
        error,
        refetch,
    };
};

export default useVendor;