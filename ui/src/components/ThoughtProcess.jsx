import React, { useEffect, useRef, useState } from 'react';
import { Brain, Search, PenTool, CheckCircle, Loader, ChevronRight, ChevronDown, Database, Code } from 'lucide-react';
import DynamicForm from './DynamicForm';
import './FashionAgentUI.css';

const ThoughtProcess = ({ messages, isActive, activeNode }) => {
    const scrollRef = useRef(null);
    const [openDetails, setOpenDetails] = useState({});
    const [isExpanded, setIsExpanded] = useState(false);

    // Filter messages to show only those relevant to the active node
    const displayMessages = activeNode
        ? messages.filter(msg => msg.event === activeNode)
        : messages;

    useEffect(() => {
        if (scrollRef.current && isExpanded) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [displayMessages, isExpanded]);

    const toggleDetails = (index) => {
        setOpenDetails(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const getIcon = (event) => {
        if (event.includes('search')) return <Search size={16} />;
        if (event.includes('generate')) return <PenTool size={16} />;
        if (event === 'complete') return <CheckCircle size={16} />;
        if (event === 'values') return <Database size={16} />;
        return <Brain size={16} />;
    };

    const formatEventName = (event) => {
        return event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className={`card thought-process-card ${isExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="card-header" onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <Brain className="card-icon" />
                    <h2>Agent Thought Process {activeNode ? `(${formatEventName(activeNode)})` : ''}</h2>
                    {isActive && <div className="pulse-indicator" />}
                </div>
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </div>

            {isExpanded && (
                <div className="thoughts-list" ref={scrollRef}>
                    {displayMessages.map((msg, idx) => (
                        <div key={idx} className={`thought-item fade-in ${openDetails[idx] ? 'expanded' : ''}`}>
                            <div className="thought-icon">
                                {getIcon(msg.event)}
                            </div>
                            <div className="thought-content">
                                <div className="thought-header" onClick={(e) => { e.stopPropagation(); toggleDetails(idx); }}>
                                    <div className="thought-title-group">
                                        <span className="thought-title">{formatEventName(msg.event)}</span>
                                        {msg.data && (
                                            <button className="btn-icon-sm">
                                                {openDetails[idx] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </button>
                                        )}
                                    </div>
                                    <span className="thought-time">
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>

                                {msg.data && (
                                    <div className={`thought-details ${openDetails[idx] ? 'show' : ''}`}>
                                        <div className="data-label">
                                            <Code size={12} />
                                            <span>Data Payload</span>
                                        </div>
                                        {typeof msg.data === 'string' ? (
                                            <p>{msg.data}</p>
                                        ) : (
                                            <DynamicForm data={msg.data} readOnly={true} />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isActive && (
                        <div className="thought-item active-thinking">
                            <Loader className="spin" size={16} />
                            <span>Processing next step...</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ThoughtProcess;
