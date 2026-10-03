// src/hooks/useLeadOverview.js
// Admin-only: loads GET /api/lead/overview for the chosen date range and
// refreshes when a lead changes anywhere in the app.
import { useState, useCallback, useEffect, useRef } from 'react';
import { leadService, getErrorMessage } from '../services/leadService';
import { leadEvents } from '../utils/leadEvents';

export function useLeadOverview(range) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const reqRef = useRef(0); // ignore responses from a superseded range

    const fetchOverview = useCallback(async () => {
        const req = ++reqRef.current;
        try {
            const res = await leadService.overview(range);
            if (req !== reqRef.current) return;
            setData(res.data);
            setError(null);
        } catch (e) {
            if (req !== reqRef.current) return;
            setError(getErrorMessage(e, 'Could not load the leads overview.'));
        } finally {
            if (req === reqRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [range]);

    // Range change → spinner + refetch.
    useEffect(() => {
        setLoading(true);
        fetchOverview();
    }, [fetchOverview]);

    // A lead was created / edited elsewhere → quiet refresh.
    useEffect(() => leadEvents.subscribe(fetchOverview), [fetchOverview]);

    const refresh = useCallback(() => {
        setRefreshing(true);
        fetchOverview();
    }, [fetchOverview]);

    const retry = useCallback(() => {
        setLoading(true);
        fetchOverview();
    }, [fetchOverview]);

    return { data, loading, refreshing, error, refresh, retry };
}
