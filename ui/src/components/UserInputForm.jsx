// UserInputForm.jsx
import React, { useState } from 'react';
import './UserInputForm.css';

const THEME = {
  bgPrimary: "linear-gradient(135deg, rgba(17,19,36,0.75), rgba(21,24,45,0.55))",
  bgSecondary: "linear-gradient(135deg, rgba(10,13,30,0.85), rgba(17,21,40,0.65))",
  cardBg: "rgba(17, 19, 36, 0.40)",
  subtleCardBg: "rgba(5, 6, 17, 0.75)",
  mutedBg: "rgba(255,255,255,0.02)",
  borderColor: "rgb(159,166,179)",
  textPrimary: "rgb(230,230,235)",
  textSecondary: "rgb(159,166,179)",
  accentLink: "rgb(159,166,255)",
  success: "rgb(16, 163, 127)",
  danger: "rgb(153,27,27)",
  warnBg: "rgba(251,191,36,0.12)",
  okBg: "rgba(17,128,61,0.08)"
};

const UserInputForm = ({ onSubmit, initialValues = {} }) => {
  const [customUrls, setCustomUrls] = useState(initialValues.custom_urls || []);
  const [customImages, setCustomImages] = useState(initialValues.custom_images || []);
  const [customVideos, setCustomVideos] = useState(initialValues.custom_videos || []);
  const [query, setQuery] = useState(initialValues.query || '');

  // Temporary input fields for adding new items
  const [urlInput, setUrlInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [videoInput, setVideoInput] = useState('');

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      setCustomUrls([...customUrls, urlInput.trim()]);
      setUrlInput('');
    }
  };

  const handleAddImage = () => {
    if (imageInput.trim()) {
      setCustomImages([...customImages, imageInput.trim()]);
      setImageInput('');
    }
  };

  const handleAddVideo = () => {
    if (videoInput.trim()) {
      setCustomVideos([...customVideos, videoInput.trim()]);
      setVideoInput('');
    }
  };

  const handleRemoveUrl = (index) => {
    setCustomUrls(customUrls.filter((_, i) => i !== index));
  };

  const handleRemoveImage = (index) => {
    setCustomImages(customImages.filter((_, i) => i !== index));
  };

  const handleRemoveVideo = (index) => {
    setCustomVideos(customVideos.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      custom_urls: customUrls,
      custom_images: customImages,
      custom_videos: customVideos,
      query: query
    });
  };

  const handleSkip = () => {
    // Submit with empty values to continue without additional input
    onSubmit({
      custom_urls: [],
      custom_images: [],
      custom_videos: [],
      query: ''
    });
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 500,
    color: THEME.textPrimary,
    fontSize: '14px'
  };

  const inputBase = {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '6px',
    // border: `1px solid ${THEME.borderColor}`,
    fontSize: '14px',
    background: THEME.subtleCardBg,
    color: THEME.textPrimary,
    outline: 'none'
  };

  const addButtonStyle = {
    color: 'var(--accent-strong)',
    background: 'transparent',
    border: '1px solid rgba(124, 92, 255, 0.6)',
    padding: '10px 20px',
    boxShadow: 'none',
    borderRadius: '999px',
    cursor: 'pointer',
  };

  const removeButtonStyle = {
    padding: '2px 8px',
    background: THEME.danger,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  };

  const itemRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    // background: THEME.cardBg,
    borderRadius: '4px',
    fontSize: '13px',
    color: THEME.textPrimary,
    // border: `1px solid ${THEME.borderColor}`
  };

  const actionContainerStyle = {
    display: 'flex',
    gap: '12px',
    marginTop: '8px'
  };

  const submitButtonStyle = {
    flex: 1,
    padding: '10px 20px',
    background: THEME.success,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500
  };

  const skipButtonStyle = {
    color: 'var(--accent-strong)',
    background: 'transparent',
    border: '1px solid rgba(124, 92, 255, 0.6)',
    padding: '10px 20px',
    boxShadow: 'none',
    borderRadius: '999px',
    cursor: 'pointer',
  };

  return (
    <form onSubmit={handleSubmit} className="user-input-form">
      {/* Query Input */}
      <div className="form-field">
        <label className="form-label">
          Query <span className="form-label-optional">(Optional)</span>
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe what fashion trends you want to analyze..."
          rows={3}
          className="form-input form-textarea"
        />
      </div>

      {/* Custom URLs */}
      <div className="form-field">
        <label className="form-label">
          Custom URLs <span className="form-label-optional">(Optional)</span>
        </label>
        <div className="form-input-group">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/fashion-article"
            className="form-input"
          />
          <button type="button" onClick={handleAddUrl} className="btn-add">
            Add
          </button>
        </div>
        {customUrls.length > 0 && (
          <div className="item-list">
            {customUrls.map((url, index) => (
              <div key={index} className="item-row">
                <span className="item-text">{url}</span>
                <button type="button" onClick={() => handleRemoveUrl(index)} className="btn-remove">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom Images */}
      <div className="form-field">
        <label className="form-label">
          Custom Images <span className="form-label-optional">(Optional)</span>
        </label>
        <div className="form-input-group">
          <input
            type="url"
            value={imageInput}
            onChange={(e) => setImageInput(e.target.value)}
            placeholder="Image URL or file path"
            className="form-input"

          />
          <button type="button" onClick={handleAddImage} className="btn-add">
            Add
          </button>
        </div>
        {customImages.length > 0 && (
          <div className="item-list">
            {customImages.map((image, index) => (
              <div key={index} className="item-row">
                <span className="item-text">{image}</span>
                <button type="button" onClick={() => handleRemoveImage(index)} className="btn-remove">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom Videos */}
      <div className="form-field">
        <label className="form-label">
          Custom Videos <span className="form-label-optional">(Optional)</span>
        </label>
        <div className="form-input-group">
          <input
            type="url"
            value={videoInput}
            onChange={(e) => setVideoInput(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="form-input"
          />
          <button type="button" onClick={handleAddVideo} className="btn-add">
            Add
          </button>
        </div>
        {customVideos.length > 0 && (
          <div className="item-list">
            {customVideos.map((video, index) => (
              <div key={index} className="item-row">
                <span className="item-text">{video}</span>
                <button type="button" onClick={() => handleRemoveVideo(index)} className="btn-remove">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="form-actions">
        <button type="submit" className="btn-submit">
          Submit & Continue
        </button>
        <button type="button" onClick={handleSkip} className="btn-skip">
          Skip
        </button>
      </div>
    </form>
  );
};

export default UserInputForm;
