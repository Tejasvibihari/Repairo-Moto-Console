import { useState, useEffect, useCallback, useRef } from 'react';
import axiosClient from '../services/axiosClient';

/**
 * Custom hook to fetch employee data.
 * @param {Object} initialQuery - Initial query parameters (e.g., { position: 'mechanic' })
 * @param {boolean} autoFetch - Whether to fetch automatically on mount (default true)
 */
const useEmployee = (initialQuery = {}, autoFetch = true) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(autoFetch);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState(initialQuery);

    const abortControllerRef = useRef(null);

    const fetchEmployees = useCallback(async (customQuery = null) => {
        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams(customQuery || query).toString();
            const url = `/api/admin/employee/getallemployee${params ? `?${params}` : ''}`;
            const response = await axiosClient.get(url, { signal: abortController.signal });

            // Assuming response structure: { message, employees }
            const employees = response.data.employees || [];
            setData(employees);
            return employees;
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            setError(err.response?.data?.message || err.message || 'Failed to fetch employees');
            console.error('useEmployee error:', err);
            throw err;
        } finally {
            if (!abortController.signal.aborted) setLoading(false);
        }
    }, [query]);

    // Refetch with current query
    const refetch = useCallback(() => fetchEmployees(), [fetchEmployees]);

    // Update query and refetch (reset page if pagination needed, but backend may not have pagination)
    const setFilters = useCallback((newQuery) => {
        setQuery(prev => ({ ...prev, ...newQuery }));
    }, []);

    // Manual fetch with temporary query (does not update persistent query)
    const fetchWithQuery = useCallback(async (tempQuery) => {
        return fetchEmployees(tempQuery);
    }, [fetchEmployees]);

    useEffect(() => {
        if (autoFetch) {
            fetchEmployees();
        }
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [autoFetch, fetchEmployees]); // fetchEmployees changes when query changes

    return {
        data,          // array of employees
        loading,
        error,
        refetch,       // refetch with current query
        setFilters,    // update query (auto refetches if autoFetch true)
        fetchWithQuery, // one-off fetch with different query
        query,         // current query object
    };
};

export default useEmployee;