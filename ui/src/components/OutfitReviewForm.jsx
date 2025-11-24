import React, { useState } from 'react';
import { Eye, CheckCircle, XCircle, Edit, AlertCircle } from 'lucide-react';
import { validateReviewData } from '../utils/apiClient';
import './OutfitReviewForm.css';

const OutfitReviewForm = ({ onSubmit, loading, interruptPayload }) => {
  const [decisionType, setDecisionType] = useState('approve');
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [selectedOutfits, setSelectedOutfits] = useState([]);
  const [isRetry, setIsRetry] = useState(false);
  const [errors, setErrors] = useState([]);

  const outfits = interruptPayload?.outfits || [];

  const handleOutfitToggle = (outfitId) => {
    setSelectedOutfits(prev =>
      prev.includes(outfitId)
        ? prev.filter(id => id !== outfitId)
        : [...prev, outfitId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors([]);

    const reviewData = {
      decision_type: decisionType,
      rejection_feedback: rejectionFeedback,
      edit_instructions: editInstructions,
      selected_outfit_ids: selectedOutfits
    };

    const validation = validateReviewData(reviewData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    onSubmit(reviewData, isRetry);
    setIsRetry(true); // Mark as retry for next attempt
  };

  return (
    <div className="card outfit-review-card">
      <div className="card-header">
        <Eye className="card-icon" />
        <h2>Review Generated Outfits</h2>
      </div>

      <div className="card-body">
        <p className="instruction-text">
          {interruptPayload?.message || 'Review the AI-generated outfit designs and provide your decision'}
        </p>

        {errors.length > 0 && (
          <div className="error-box">
            <div className="error-header">
              <AlertCircle size={16} />
              <h4>Please correct the following errors:</h4>
            </div>
            <ul>
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Outfits Display */}
        {outfits.length > 0 ? (
          <div className="outfits-grid">
            {outfits.map((outfit, idx) => {
              const outfitId = outfit.id || `outfit_${idx}`;
              const isSelected = selectedOutfits.includes(outfitId);

              return (
                <div
                  key={outfitId}
                  className={`outfit-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleOutfitToggle(outfitId)}
                >
                  <div className="outfit-header">
                    <h3>{outfit.name || `Outfit ${idx + 1}`}</h3>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleOutfitToggle(outfitId)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {outfit.image_url && (
                    <div className="outfit-image">
                      <img
                        src={outfit.image_url}
                        alt={outfit.name || `Outfit ${idx + 1}`}
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="outfit-details">
                    <p className="outfit-description">
                      {outfit.description || 'No description available'}
                    </p>

                    {outfit.colors && (
                      <div className="outfit-meta">
                        <strong>Colors:</strong> {outfit.colors.join(', ')}
                      </div>
                    )}

                    {outfit.style && (
                      <div className="outfit-meta">
                        <strong>Style:</strong> {outfit.style}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-outfits">
            <p>No outfits available for review</p>
            <pre className="code-block">
              {JSON.stringify(interruptPayload, null, 2)}
            </pre>
          </div>
        )}

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="review-form">
          <div className="form-group">
            <label htmlFor="decisionType">Your Decision:</label>
            <div className="decision-buttons">
              <button
                type="button"
                className={`decision-btn ${decisionType === 'approve' ? 'active approve' : ''}`}
                onClick={() => setDecisionType('approve')}
              >
                <CheckCircle size={20} />
                Approve
              </button>
              <button
                type="button"
                className={`decision-btn ${decisionType === 'reject' ? 'active reject' : ''}`}
                onClick={() => setDecisionType('reject')}
              >
                <XCircle size={20} />
                Reject
              </button>
              <button
                type="button"
                className={`decision-btn ${decisionType === 'edit' ? 'active edit' : ''}`}
                onClick={() => setDecisionType('edit')}
              >
                <Edit size={20} />
                Request Changes
              </button>
            </div>
          </div>

          {decisionType === 'reject' && (
            <div className="form-group">
              <label htmlFor="rejectionFeedback">
                Rejection Feedback
                <span className="required">* Required</span>
              </label>
              <textarea
                id="rejectionFeedback"
                value={rejectionFeedback}
                onChange={(e) => setRejectionFeedback(e.target.value)}
                placeholder="Explain why these outfits don't meet your requirements..."
                className="textarea"
                rows={5}
                required
                disabled={loading}
              />
              <p className="helper-text">
                Please provide specific feedback on what you don't like about the designs
              </p>
            </div>
          )}

          {decisionType === 'edit' && (
            <div className="form-group">
              <label htmlFor="editInstructions">
                Edit Instructions
                <span className="required">* Required</span>
              </label>
              <textarea
                id="editInstructions"
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                placeholder="What changes do you want? E.g., 'Make it more formal', 'Add traditional accessories', 'Use brighter colors'"
                className="textarea"
                rows={5}
                required
                disabled={loading}
              />
              <p className="helper-text">
                Be specific about the changes you want in the regenerated designs
              </p>
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Submitting...' : `Submit ${decisionType.charAt(0).toUpperCase() + decisionType.slice(1)} Decision`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OutfitReviewForm;
