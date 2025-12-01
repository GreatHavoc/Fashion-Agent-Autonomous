// OutfitReviewForm.jsx
import React, { useState } from 'react';
import { Eye, CheckCircle, XCircle, Edit, AlertCircle } from 'lucide-react';
import { validateReviewData } from '../utils/apiClient';
import './OutfitReviewForm.css';

const THEME = {
  bgPrimary: "linear-gradient(135deg, rgba(17,19,36,0.75), rgba(21,24,45,0.55))",
  bgSecondary: "linear-gradient(135deg, rgba(10,13,30,0.85), rgba(17,21,40,0.65))",
  cardBg: "rgba(17, 19, 36, 0.40)",
  subtleCardBg: "rgba(255,255,255,0.03)",
  mutedBg: "rgba(255,255,255,0.02)",
  borderColor: "rgb(159,166,179)",
  textPrimary: "rgb(230,230,235)",
  textSecondary: "rgb(159,166,179)",
  accentBlue: "rgb(159,166,255)",
  success: "rgb(16, 163, 127)",
  danger: "rgb(220, 76, 76)",
  warn: "rgb(240, 170, 70)",
  warnBg: "rgba(251,191,36,0.12)",
  okBg: "rgba(17,128,61,0.08)"
};

const OutfitReviewForm = ({ onSubmit, loading, interruptPayload }) => {
  const [feedback, setFeedback] = useState('');
  const [selectedOutfits, setSelectedOutfits] = useState([]);
  const [decisionType, setDecisionType] = useState(null);
  const [editInstructions, setEditInstructions] = useState('');
 console.log('Interrupt Payload in OutfitReviewForm:', interruptPayload);
  // Extract outfits
  const outfits = interruptPayload?.outfits || [];
  const message = interruptPayload?.message || 'Please review the outfit designs below';
  const totalOutfits = interruptPayload?.total_outfits || outfits.length;

  const toggleOutfitSelection = (outfitId) => {
    setSelectedOutfits((prev) =>
      prev.includes(outfitId)
        ? prev.filter((id) => id !== outfitId)
        : [...prev, outfitId]
    );
  };

  const handleApprove = () => {
    onSubmit({
      approved: true,
      decision_type: 'approve',
      selected_outfit: selectedOutfits.length ? selectedOutfits : null
    });
  };

  const handleReject = () => {
    if (!feedback.trim()) return alert('Please provide rejection feedback');

    onSubmit({
      approved: false,
      decision_type: 'reject',
      feedback,
      selected_outfit: selectedOutfits.length ? selectedOutfits : null
    });
  };

  const handleEdit = () => {
    if (!editInstructions.trim()) return alert('Please provide edit instructions');

    onSubmit({
      approved: false,
      decision_type: 'edit',
      feedback: editInstructions,
      selected_outfit: selectedOutfits.length ? selectedOutfits : null
    });
  };

  return (
    <div
      style={{
        padding: '20px',
        background: THEME.bgSecondary,
        borderRadius: '10px',
        // border: `1px solid ${THEME.borderColor}`,
        color: THEME.textPrimary
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}
      >
        <AlertCircle size={20} color={THEME.accentBlue} />
        <h3 style={{ margin: 0, color: THEME.textPrimary }}>Outfit Review Required</h3>
      </div>

      {/* Message */}
      <div
        style={{
          marginBottom: '16px',
          padding: '12px',
          // background: THEME.subtleCardBg,
          borderRadius: '8px',
          fontSize: '14px',
          // border: `1px solid ${THEME.borderColor}`
        }}
      >
        <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: THEME.textPrimary }}>
          {message}
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: THEME.textSecondary }}>
          Total outfits: {totalOutfits}
        </p>
      </div>

      {/* Outfits Grid */}
      {Array.isArray(outfits) && outfits.length > 0 ? (
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px'
            }}
          >
            {outfits.map((outfit, index) => {
              const selected = selectedOutfits.includes(outfit.outfit_id);

              return (
                <div
                  key={outfit.outfit_id || index}
                  onClick={() => toggleOutfitSelection(outfit.outfit_id)}
                  style={{
                    padding: '12px',
                    background: THEME.cardBg,
                    borderRadius: '8px',
                    border: selected
                      ? `2px solid ${THEME.accentBlue}`
                      : `1px solid ${THEME.borderColor}`,
                    cursor: 'pointer',
                    transition: '0.2s',
                    position: 'relative',
                    color: THEME.textPrimary
                  }}
                >
                  {outfit.image_path ? (
  <img
    src={outfit.image_path}
    alt={outfit.name || `Outfit ${index + 1}`}
    style={{
      width: '100%',
      height: '200px',
      objectFit: 'cover',
      borderRadius: '6px',
      marginBottom: '8px',
      background: '#111',
      border: `1px solid ${THEME.borderColor}`
    }}
    onError={(e) => {
      e.target.onerror = null;
      e.target.src = "/placeholder_image.jpg";    // <–– fallback
    }}
  />
) : (
  <div
    style={{
      width: '100%',
      height: '200px',
      borderRadius: '6px',
      marginBottom: '8px',
      background: THEME.subtleCardBg,
      border: `1px solid ${THEME.borderColor}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: THEME.textSecondary,
      fontSize: '13px'
    }}
  >
    No Image Available
  </div>
)}


                  <div style={{ fontWeight: '600', marginBottom: '4px', color: THEME.textPrimary }}>
                    {outfit.name || `Outfit ${index + 1}`}
                  </div>

                  {outfit.description && (
                    <div style={{ fontSize: '13px', color: THEME.textSecondary }}>
                      {outfit.description}
                    </div>
                  )}

                  {selected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        padding: '4px 8px',
                        background: THEME.accentBlue,
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'white'
                      }}
                    >
                      ✓ Selected
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '20px',
            background: THEME.subtleCardBg,
            borderRadius: '8px',
            textAlign: 'center',
            color: THEME.textSecondary,
            marginBottom: '16px',
            border: `1px solid ${THEME.borderColor}`
          }}
        >
          No outfits available for review
        </div>
      )}

      {/* Decision Buttons */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            fontSize: '14px',
            color: THEME.textPrimary
          }}
        >
          Select Action
        </label>

        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Approve */}
          <button
            onClick={() => setDecisionType('approve')}
            style={{
              flex: 1,
              padding: '10px',
              background: decisionType === 'approve' ? THEME.success : THEME.subtleCardBg,
              color: decisionType === 'approve' ? 'white' : THEME.textPrimary,
              border: `2px solid ${THEME.success}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Approve
          </button>

          {/* Reject */}
          <button
            onClick={() => setDecisionType('reject')}
            style={{
              flex: 1,
              padding: '10px',
              background: decisionType === 'reject' ? THEME.danger : THEME.subtleCardBg,
              color: decisionType === 'reject' ? 'white' : THEME.textPrimary,
              border: `2px solid ${THEME.danger}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Reject
          </button>

          {/* Edit */}
          <button
            onClick={() => setDecisionType('edit')}
            style={{
              flex: 1,
              padding: '10px',
              background: decisionType === 'edit' ? THEME.warn : THEME.subtleCardBg,
              color: decisionType === 'edit' ? 'white' : THEME.textPrimary,
              border: `2px solid ${THEME.warn}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Request Edit
          </button>
        </div>
      </div>

      {/* Conditional Fields */}
      {decisionType === 'reject' && (
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              fontSize: '14px',
              color: THEME.danger
            }}
          >
            Rejection Feedback (Required)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            placeholder="Explain why the designs are being rejected..."
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: `2px solid ${THEME.danger}`,
              background: THEME.subtleCardBg,
              color: THEME.textPrimary,
              fontSize: '14px'
            }}
          />
        </div>
      )}

      {decisionType === 'edit' && (
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              fontSize: '14px',
              color: THEME.warn
            }}
          >
            Edit Instructions (Required)
          </label>
          <textarea
            value={editInstructions}
            onChange={(e) => setEditInstructions(e.target.value)}
            rows={4}
            placeholder="Provide specific changes you want..."
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: `2px solid ${THEME.warn}`,
              background: THEME.subtleCardBg,
              color: THEME.textPrimary,
              fontSize: '14px'
            }}
          />
        </div>
      )}

      {/* Submit */}
      {decisionType && (
        <button
          disabled={loading}
          onClick={() => {
            if (decisionType === 'approve') return handleApprove();
            if (decisionType === 'reject') return handleReject();
            if (decisionType === 'edit') return handleEdit();
          }}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '8px',
            background:
              decisionType === 'approve'
                ? THEME.success
                : decisionType === 'reject'
                ? THEME.danger
                : THEME.warn,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '15px',
            fontWeight: '600',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Processing...' : `Submit ${decisionType}`}
        </button>
      )}
    </div>
  );
};

export default OutfitReviewForm;
