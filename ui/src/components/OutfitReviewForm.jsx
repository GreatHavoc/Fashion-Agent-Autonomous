// OutfitReviewForm.jsx
import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
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

const OutfitCard = ({ outfit, index, selected, onToggle }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        padding: '10px',
        background: THEME.cardBg,
        borderRadius: '8px',
        border: selected ? `2px solid ${THEME.accentBlue}` : `1px solid ${THEME.borderColor}`,
        cursor: 'pointer',
        transition: '0.2s',
        position: 'relative',
        color: THEME.textPrimary
      }}
    >
      {/* Image - Compact */}
      {outfit.image_path ? (
        <img
          src={outfit.image_path}
          alt={outfit.name || `Outfit ${index + 1}`}
          onClick={onToggle}
          style={{
            width: '100%',
            height: '120px',
            objectFit: 'cover',
            borderRadius: '6px',
            marginBottom: '6px',
            background: '#111',
            border: `1px solid ${THEME.borderColor}`
          }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/placeholder_image.jpg";
          }}
        />
      ) : (
        <div
          onClick={onToggle}
          style={{
            width: '100%',
            height: '120px',
            borderRadius: '6px',
            marginBottom: '6px',
            background: THEME.subtleCardBg,
            border: `1px solid ${THEME.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: THEME.textSecondary,
            fontSize: '11px'
          }}
        >
          No Image
        </div>
      )}

      {/* Title */}
      <div
        onClick={onToggle}
        style={{
          fontWeight: '600',
          marginBottom: '4px',
          color: THEME.textPrimary,
          fontSize: '13px'
        }}
      >
        {outfit.name || `Outfit ${index + 1}`}
      </div>

      {/* Description - Truncated */}
      {outfit.description && (
        <div style={{ fontSize: '11px', color: THEME.textSecondary, marginBottom: '4px' }}>
          <div style={{
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: expanded ? 'unset' : 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: '1.4'
          }}>
            {outfit.description}
          </div>
          {outfit.description.length > 80 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              style={{
                marginTop: '3px',
                padding: '2px 6px',
                background: 'transparent',
                border: `1px solid ${THEME.borderColor}`,
                borderRadius: '3px',
                color: THEME.accentBlue,
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              {expanded ? '− Less' : '+ More'}
            </button>
          )}
        </div>
      )}

      {/* Selected Badge */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            padding: '2px 6px',
            background: THEME.accentBlue,
            borderRadius: '3px',
            fontSize: '10px',
            fontWeight: '600',
            color: 'white'
          }}
        >
          ✓
        </div>
      )}
    </div>
  );
};

const OutfitReviewForm = ({ onSubmit, loading, interruptPayload }) => {
  const [feedback, setFeedback] = useState('');
  const [selectedOutfits, setSelectedOutfits] = useState([]);
  const [decisionType, setDecisionType] = useState(null);
  const [editInstructions, setEditInstructions] = useState('');

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
        padding: '16px',
        background: THEME.bgSecondary,
        borderRadius: '10px',
        color: THEME.textPrimary,
        maxHeight: '80vh',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      className="outfit-review-scrollable"
    >
      {/* Header - Compact */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <AlertCircle size={18} color={THEME.accentBlue} />
        <h3 style={{ margin: 0, color: THEME.textPrimary, fontSize: '16px' }}>Review Outfits</h3>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: THEME.textSecondary }}>
          {totalOutfits} total
        </span>
      </div>

      {/* Outfits Grid - Compact */}
      {Array.isArray(outfits) && outfits.length > 0 ? (
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px'
            }}
          >
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
        </div>
      ) : (
        <div style={{ padding: '15px', background: THEME.subtleCardBg, borderRadius: '6px', textAlign: 'center', color: THEME.textSecondary, marginBottom: '12px', fontSize: '13px' }}>
          No outfits available
        </div>
      )}

      {/* Decision Buttons */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setDecisionType('approve')}
            style={{
              flex: 1,
              padding: '8px',
              background: decisionType === 'approve' ? THEME.success : THEME.subtleCardBg,
              color: decisionType === 'approve' ? 'white' : THEME.textPrimary,
              border: `2px solid ${THEME.success}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '13px'
            }}
          >
            ✓ Approve
          </button>

          <button
            onClick={() => setDecisionType('reject')}
            style={{
              flex: 1,
              padding: '8px',
              background: decisionType === 'reject' ? THEME.danger : THEME.subtleCardBg,
              color: decisionType === 'reject' ? 'white' : THEME.textPrimary,
              border: `2px solid ${THEME.danger}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '13px'
            }}
          >
            ✗ Reject
          </button>

          <button
            onClick={() => setDecisionType('edit')}
            style={{
              flex: 1,
              padding: '8px',
              background: decisionType === 'edit' ? THEME.warn : THEME.subtleCardBg,
              color: decisionType === 'edit' ? 'white' : THEME.textPrimary,
              border: `2px solid ${THEME.warn}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '13px'
            }}
          >
            ✎ Edit
          </button>
        </div>
      </div>

      {/* Conditional Fields */}
      {decisionType === 'reject' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: THEME.danger }}>
            Rejection Feedback *
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            placeholder="Explain why..."
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              border: `2px solid ${THEME.danger}`,
              background: THEME.subtleCardBg,
              color: THEME.textPrimary,
              fontSize: '13px'
            }}
          />
        </div>
      )}

      {decisionType === 'edit' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: THEME.warn }}>
            Edit Instructions *
          </label>
          <textarea
            value={editInstructions}
            onChange={(e) => setEditInstructions(e.target.value)}
            rows={3}
            placeholder="Specific changes..."
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              border: `2px solid ${THEME.warn}`,
              background: THEME.subtleCardBg,
              color: THEME.textPrimary,
              fontSize: '13px'
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
            padding: '10px',
            background: decisionType === 'approve' ? THEME.success : decisionType === 'reject' ? THEME.danger : THEME.warn,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
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
