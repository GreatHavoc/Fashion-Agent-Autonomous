// OutfitReviewForm.jsx - Redesigned
import React, { useState } from 'react';
import { Check } from 'lucide-react';
import './OutfitReviewForm.css';

const THEME = {
  textPrimary: "rgb(230,230,235)",
  textSecondary: "rgb(159,166,179)",
  accentBlue: "rgb(159,166,255)",
  success: "rgb(16, 163, 127)",
  danger: "rgb(220, 76, 76)",
  warn: "rgb(240, 170, 70)",
};

const OutfitCard = ({ outfit, index, selected, onToggle }) => {
  return (
    <div
      className={`outfit-card ${selected ? 'selected' : ''}`}
      onClick={onToggle}
    >
      {/* Image Container */}
      <div className="outfit-image-container">
        {outfit.image_path ? (
          <img
            src={outfit.image_path}
            alt={outfit.name || `Outfit ${index + 1}`}
            className="outfit-image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/placeholder_image.jpg";
            }}
          />
        ) : (
          <div className="outfit-image-placeholder">
            No Image
          </div>
        )}

        {/* Selection Indicator - Now inside image container for better positioning */}
        {selected && (
          <div className="select-badge">
            <Check size={16} />
          </div>
        )}
      </div>

      {/* Info - Always visible now */}
      <div className="outfit-info">
        <div className="outfit-name">{outfit.name || `Outfit ${index + 1}`}</div>
        {outfit.description && (
          <div className="outfit-description">
            {outfit.description}
          </div>
        )}
      </div>
    </div>
  );
};

const OutfitReviewForm = ({ onSubmit, loading, interruptPayload }) => {
  const [selectedOutfits, setSelectedOutfits] = useState([]);
  const [decisionType, setDecisionType] = useState(null);
  const [feedback, setFeedback] = useState('');

  const outfits = interruptPayload?.outfits || [];
  const totalOutfits = interruptPayload?.total_outfits || outfits.length;

  const toggleOutfitSelection = (outfitId) => {
    setSelectedOutfits((prev) =>
      prev.includes(outfitId)
        ? prev.filter((id) => id !== outfitId)
        : [...prev, outfitId]
    );
  };

  const handleSubmit = () => {
    if (decisionType === 'approve') {
      onSubmit({
        approved: true,
        decision_type: 'approve',
        selected_outfit: selectedOutfits.length ? selectedOutfits : null
      });
    } else if (decisionType === 'reject') {
      if (!feedback.trim()) {
        alert('Please provide rejection feedback');
        return;
      }
      onSubmit({
        approved: false,
        decision_type: 'reject',
        feedback,
        selected_outfit: selectedOutfits.length ? selectedOutfits : null
      });
    } else if (decisionType === 'edit') {
      if (!feedback.trim()) {
        alert('Please provide edit instructions');
        return;
      }
      onSubmit({
        approved: false,
        decision_type: 'edit',
        feedback,
        selected_outfit: selectedOutfits.length ? selectedOutfits : null
      });
    }
  };

  const getSubmitButtonClass = () => {
    if (decisionType === 'approve') return 'btn-submit-review approve';
    if (decisionType === 'reject') return 'btn-submit-review reject';
    if (decisionType === 'edit') return 'btn-submit-review edit';
    return 'btn-submit-review';
  };

  const getSubmitButtonText = () => {
    if (loading) return 'Processing...';
    if (decisionType === 'approve') return 'Approve & Continue';
    if (decisionType === 'reject') return 'Reject & Restart';
    if (decisionType === 'edit') return 'Request Changes';
    return 'Select Decision';
  };

  return (
    <div className="outfit-review-container">
      {/* Count Badge */}
      <div className="outfit-count">
        {selectedOutfits.length > 0 ? `${selectedOutfits.length} of ${totalOutfits}` : `${totalOutfits} designs`}
      </div>

      {/* Outfits Grid */}
      {Array.isArray(outfits) && outfits.length > 0 ? (
        <div className="outfit-grid">
          {outfits.map((outfit, index) => (
            <OutfitCard
              key={outfit.outfit_id || index}
              outfit={outfit}
              index={index}
              selected={selectedOutfits.includes(outfit.outfit_id)}
              onToggle={() => toggleOutfitSelection(outfit.outfit_id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          No outfits available for review
        </div>
      )}

      {/* Decision Buttons */}
      <div className="decision-section">
        <div className="decision-label">Your Decision</div>
        <div className="decision-buttons">
          <button
            onClick={() => setDecisionType('approve')}
            className={`btn-decision approve ${decisionType === 'approve' ? 'active' : ''}`}
          >
            <Check size={16} />
            Approve
          </button>

          <button
            onClick={() => setDecisionType('reject')}
            className={`btn-decision reject ${decisionType === 'reject' ? 'active' : ''}`}
          >
            ✗ Reject
          </button>

          <button
            onClick={() => setDecisionType('edit')}
            className={`btn-decision edit ${decisionType === 'edit' ? 'active' : ''}`}
          >
            ✎ Edit
          </button>
        </div>
      </div>

      {/* Conditional Feedback */}
      {(decisionType === 'reject' || decisionType === 'edit') && (
        <div className="feedback-section">
          <label className={`feedback-label ${decisionType}`}>
            {decisionType === 'reject' ? 'Why are you rejecting?' : 'What changes do you need?'}
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            placeholder={decisionType === 'reject' ? 'Explain why these designs don\'t work...' : 'Describe specific changes needed...'}
            className={`feedback-textarea ${decisionType}`}
          />
        </div>
      )}

      {/* Submit Button */}
      {decisionType && (
        <button
          disabled={loading}
          onClick={handleSubmit}
          className={getSubmitButtonClass()}
        >
          {getSubmitButtonText()}
        </button>
      )}
    </div>
  );
};

export default OutfitReviewForm;
