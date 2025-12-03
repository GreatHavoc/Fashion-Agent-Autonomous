import React from 'react';
import { X } from 'lucide-react';
import './InputRequiredModal.css';

const InputRequiredModal = ({ isOpen, title, children, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <div className="modal-header-content">
                        <div className="modal-title-icon"></div>
                        <h3 className="modal-title">{title}</h3>
                    </div>
                    {onClose && (
                        <button className="btn-close" onClick={onClose} aria-label="Close modal">
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