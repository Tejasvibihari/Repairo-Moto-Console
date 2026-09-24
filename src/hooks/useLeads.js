// src/hooks/useLeads.js
import { useState, useRef, useCallback, useEffect } from 'react';
import { leadService, getErrorMessage } from '../services/leadService';
import { leadEvents } from '../utils/leadEvents';

const PAGE_SIZE = 20;

/**
 * Paginated lead list. Re-fetches from page 1 whenever `status`, `search` or
 * `leadBy` change, and whenever another screen calls leadEvents.emit().
 */
export function useLeads({ leadBy, status, search }) {
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const pageRef = useRef(0);
    const hasMoreRef = useRef(true);
    const loadingMoreRef = useRef(false);
    const reqRef = useRef(0); // ignore responses from superseded requests

    const fetchPage = useCallback(
        async (page) => {
            const req = ++reqRef.current;
            try {
                const res = await leadService.list({ page, limit: PAGE_SIZE, leadBy, status, search });
                if (req !== reqRef.current) return;

                const rows = res.data || [];
                setItems((prev) => {
                    if (page === 1) return rows;
                    const seen = new Set(prev.map((r) => r._id));
                    return [...prev, ...rows.filter((r) => !seen.has(r._id))];
                });
                pageRef.current = page;
                hasMoreRef.current = !!res.pagination?.hasNextPage;
                setTotal(res.pagination?.total ?? rows.length);
                setError(null);
            } catch (e) {
                if (req !== reqRef.current) return;
                setError(getErrorMessage(e, 'Could not load leads.'));
            } finally {
                if (req === reqRef.current) {
                    loadingMoreRef.current = false;
                    setLoading(false);
                    setLoadingMore(false);
                    setRefreshing(false);
                }
            }
        },
        [leadBy, status, search]
    );

    // Filter change → back to page 1 with a spinner.
    useEffect(() => {
        setLoading(true);
        hasMoreRef.current = true;
        fetchPage(1);
    }, [fetchPage]);

    // A lead was created/edited elsewhere → quiet refresh.
    useEffect(() => leadEvents.subscribe(() => fetchPage(1)), [fetchPage]);

    const refresh = useCallback(() => {
        setRefreshing(true);
        fetchPage(1);
    }, [fetchPage]);

    const loadMore = useCallback(() => {
        if (loading || refreshing || loadingMoreRef.current || !hasMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        fetchPage(pageRef.current + 1);
    }, [loading, refreshing, fetchPage]);

    return { items, total, loading, loadingMore, refreshing, error, refresh, loadMore };
}
