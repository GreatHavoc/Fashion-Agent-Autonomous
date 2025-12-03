import React from 'react';
import { X } from 'lucide-react';
import './FashionAgentUI.css';

const InputRequiredModal = ({ isOpen, title, children, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>{title}</h3>
                    {onClose && (
                        <button className="btn-close" onClick={onClose}>
                            <X size={20} />
                        </button>
                    )}
                </div>
                <div className="modal-content">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default InputRequiredModal;
