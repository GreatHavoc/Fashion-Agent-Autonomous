import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import './FashionAgentUI.css';

const DynamicForm = ({ data, onChange, readOnly = false, level = 0, path = [] }) => {
    const [expanded, setExpanded] = React.useState({});

    if (data === null || data === undefined) {
        return <span className="null-value">null</span>;
    }

    const toggleExpand = (key) => {
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleChange = (key, value) => {
        if (readOnly || !onChange) return;

        const newData = Array.isArray(data) ? [...data] : { ...data };
        newData[key] = value;
        onChange(newData);
    };

    const renderValue = (key, value, currentPath) => {
        const fieldPath = [...currentPath, key];
        const isObject = typeof value === 'object' && value !== null;

        if (isObject) {
            const isArray = Array.isArray(value);
            const isEmpty = Object.keys(value).length === 0;
            const isExpanded = expanded[key] !== false; // Default to expanded

            return (
                <div key={key} className="form-group-nested">
                    <div
                        className="nested-header"
                        onClick={() => toggleExpand(key)}
                        style={{ paddingLeft: `${level * 0.5}rem` }}
                    >
                        <span className="expand-icon">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                        <span className="field-label">{key}:</span>
                        <span className="type-badge">{isArray ? 'Array' : 'Object'}</span>
                    </div>

                    {isExpanded && (
                        <div className="nested-content">
                            {isEmpty ? (
                                <div className="empty-message">Empty {isArray ? 'Array' : 'Object'}</div>
                            ) : (
                                <DynamicForm
                                    data={value}
                                    onChange={(newValue) => handleChange(key, newValue)}
                                    readOnly={readOnly}
                                    level={level + 1}
                                    path={fieldPath}
                                />
                            )}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div key={key} className="form-field" style={{ paddingLeft: `${level * 0.5 + 1.5}rem` }}>
                <label className="field-label">{key}:</label>
                {readOnly ? (
                    <span className="field-value-readonly">{String(value)}</span>
                ) : (
                    <input
                        type={typeof value === 'number' ? 'number' : 'text'}
                        value={value}
                        onChange={(e) => {
                            const val = typeof value === 'number' ? Number(e.target.value) : e.target.value;
                            handleChange(key, val);
                        }}
                        className="field-input"
                    />
                )}
            </div>
        );
    };

    return (
        <div className="dynamic-form">
            {Object.entries(data).map(([key, value]) => renderValue(key, value, path))}
        </div>
    );
};

export default DynamicForm;
