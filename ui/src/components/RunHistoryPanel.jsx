import React, { useState, useEffect } from 'react';
import { Clock, Play, CheckCircle, AlertCircle, Loader, X, ChevronRight } from 'lucide-react';
import { searchThreads, getThreadState } from '../utils/apiClient';

/**
 * RunHistoryPanel - Displays list of previous workflow runs
 * Allows user to load a previous run's data into the UI
 */
const RunHistoryPanel = ({ isOpen, onClose, onLoadRun }) => {
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loadingThreadId, setLoadingThreadId] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchThreads();
        }
    }, [isOpen]);

    const fetchThreads = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await searchThreads({ limit: 20 });
            // Result is an array of thread objects
            setThreads(Array.isArray(result) ? result : []);
        } catch (err) {
            console.error('Failed to fetch threads:', err);
            setError(err.message || 'Failed to load run history');
        } finally {
            setLoading(false);
        }
    };

    const handleLoadRun = async (threadId) => {
        setLoadingThreadId(threadId);
        try {
            const state = await getThreadState(threadId);
            onLoadRun(threadId, state);
            onClose();
        } catch (err) {
            console.error('Failed to load run:', err);
            setError(`Failed to load run: ${err.message}`);
        } finally {
            setLoadingThreadId(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusInfo = (thread) => {
        const status = thread.status || 'unknown';
        const metadata = thread.metadata || {};

        if (status === 'idle') {
            return { icon: <CheckCircle size={14} />, label: 'Completed', color: '#10b981' };
        } else if (status === 'busy') {
            return { icon: <Loader size={14} className="spin" />, label: 'Running', color: '#f59e0b' };
        } else if (status === 'interrupted') {
            return { icon: <AlertCircle size={14} />, label: 'Interrupted', color: '#ef4444' };
        }
        return { icon: <Clock size={14} />, label: status, color: 'rgba(255,255,255,0.5)' };
    };

    const getThreadSummary = (thread) => {
        const metadata = thread.metadata || {};
        const values = thread.values || {};

        // Try to get query from various places
        return metadata.query || values.input?.query || 'Fashion Analysis';
    };

    if (!isOpen) return null;

    return (
        <div className="run-history-overlay" onClick={onClose}>
            <div className="run-history-panel" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="run-history-header">
                    <div className="run-history-title">
                        <Clock size={20} />
                        <h2>Run History</h2>
                    </div>
                    <button className="run-history-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="run-history-content">
                    {loading ? (
                        <div className="run-history-loading">
                            <Loader size={24} className="spin" />
                            <span>Loading history...</span>
                        </div>
                    ) : error ? (
                        <div className="run-history-error">
                            <AlertCircle size={24} />
                            <span>{error}</span>
                            <button onClick={fetchThreads}>Retry</button>
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="run-history-empty">
                            <Clock size={32} />
                            <span>No previous runs found</span>
                            <p>Start a new analysis to see it here</p>
                        </div>
                    ) : (
                        <div className="run-history-list">
                            {threads.map((thread) => {
                                const statusInfo = getStatusInfo(thread);
                                const isLoading = loadingThreadId === thread.thread_id;

                                return (
                                    <div
                                        key={thread.thread_id}
                                        className={`run-history-item ${isLoading ? 'loading' : ''}`}
                                        onClick={() => !isLoading && handleLoadRun(thread.thread_id)}
                                    >
                                        <div className="run-history-item-main">
                                            <div className="run-history-item-query">
                                                {getThreadSummary(thread)}
                                            </div>
                                            <div className="run-history-item-meta">
                                                <span className="run-history-item-date">
                                                    {formatDate(thread.created_at)}
                                                </span>
                                                <span
                                                    className="run-history-item-status"
                                                    style={{ color: statusInfo.color }}
                                                >
                                                    {statusInfo.icon}
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="run-history-item-action">
                                            {isLoading ? (
                                                <Loader size={16} className="spin" />
                                            ) : (
                                                <ChevronRight size={16} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="run-history-footer">
                    <span className="run-history-count">
                        {threads.length} run{threads.length !== 1 ? 's' : ''} found
                    </span>
                    <button className="run-history-refresh" onClick={fetchThreads} disabled={loading}>
                        Refresh
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RunHistoryPanel;
