import React, { useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { validateUserInput } from '../utils/apiClient';
import './UserInputForm.css';

const UserInputForm = ({ onSubmit, loading, query, interruptPayload }) => {
  const [customUrls, setCustomUrls] = useState('');
  const [customImages, setCustomImages] = useState('');
  const [customVideos, setCustomVideos] = useState('');
  const [isRetry, setIsRetry] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors([]);

    const rawData = {
      custom_urls: customUrls.split('\n').filter(u => u.trim()).map(u => u.trim()),
      custom_images: customImages.split('\n').filter(i => i.trim()).map(i => i.trim()),
      custom_videos: customVideos.split('\n').filter(v => v.trim()).map(v => v.trim()),
      query: query || ''
    };

    const validation = validateUserInput(rawData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    onSubmit(rawData, isRetry);
    setIsRetry(true); // Mark as retry for next attempt
  };

  const handleSkip = () => {
    // Send proper default structure matching UserInput model
    const defaultData = {
      custom_urls: [],
      custom_images: [],
      custom_videos: [],
      query: query || ''
    };

    onSubmit(defaultData);
  };

  return (
    <div className="card user-input-card">
      <div className="card-header">
        <Upload className="card-icon" />
        <h2>Customize Your Analysis Data</h2>
      </div>

      <div className="card-body">
        {isRetry && (
          <div className="retry-notice">
            <p>⚠️ The previous input was not accepted. Please review and correct your data before submitting again.</p>
          </div>
        )}

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

        <p className="instruction-text">
          {interruptPayload?.message || 'Provide custom URLs, images, and videos for fashion analysis'}
        </p>

        {interruptPayload?.instructions && (
          <div className="instructions-box">
            <h3>Instructions:</h3>
            <ul>
              <li><strong>Custom URLs:</strong> {interruptPayload.instructions.custom_urls}</li>
              <li><strong>Custom Images:</strong> {interruptPayload.instructions.custom_images}</li>
              <li><strong>Custom Videos:</strong> {interruptPayload.instructions.custom_videos}</li>
            </ul>
          </div>
        )}

        {interruptPayload?.example && (
          <details className="example-section">
            <summary>View Example Format</summary>
            <pre className="code-block">
              {JSON.stringify(interruptPayload.example, null, 2)}
            </pre>
          </details>
        )}

        <form onSubmit={handleSubmit} className="user-input-form">
          <div className="form-group">
            <label htmlFor="customUrls">
              Custom URLs (one per line)
              <span className="optional">Optional</span>
            </label>
            <textarea
              id="customUrls"
              value={customUrls}
              onChange={(e) => setCustomUrls(e.target.value)}
              placeholder="https://www.example.com/fashion-article-1&#10;https://www.example.com/fashion-article-2"
              className="textarea"
              rows={5}
              disabled={loading}
            />
            <p className="helper-text">
              Add fashion article URLs, blog posts, or fashion news sites you want analyzed
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="customImages">
              Custom Image URLs (one per line)
              <span className="optional">Optional</span>
            </label>
            <textarea
              id="customImages"
              value={customImages}
              onChange={(e) => setCustomImages(e.target.value)}
              placeholder="https://example.com/outfit1.jpg&#10;https://example.com/outfit2.png"
              className="textarea"
              rows={5}
              disabled={loading}
            />
            <p className="helper-text">
              Add direct image URLs of outfits, fashion looks, or style references
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="customVideos">
              Custom Video URLs (one per line)
              <span className="optional">Optional</span>
            </label>
            <textarea
              id="customVideos"
              value={customVideos}
              onChange={(e) => setCustomVideos(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="textarea"
              rows={4}
              disabled={loading}
            />
            <p className="helper-text">
              Add YouTube or other fashion show/lookbook video URLs
            </p>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Continue Analysis'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSkip}
              disabled={loading}
            >
              Skip & Use Defaults
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserInputForm;
