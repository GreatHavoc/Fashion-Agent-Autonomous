import React from 'react';
import { ShoppingBag, ExternalLink } from 'lucide-react';
import './FashionAgentUI.css';

const OutfitCard = ({ outfit }) => {
    return (
        <div className="outfit-card fade-in">
            <div className="outfit-image-container">
                {outfit.image_url ? (
                    <img src={outfit.image_url} alt={outfit.name} className="outfit-image" />
                ) : (
                    <div className="outfit-placeholder">
                        <ShoppingBag size={48} />
                        <span>No Image Available</span>
                    </div>
                )}
            </div>

            <div className="outfit-content">
                <h3>{outfit.name}</h3>
                <p className="outfit-description">{outfit.description}</p>

                <div className="outfit-items">
                    <h4>Key Items:</h4>
                    <ul>
                        {outfit.items && outfit.items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                        ))}
                    </ul>
                </div>

                {outfit.reasoning && (
                    <div className="outfit-reasoning">
                        <strong>Why it works:</strong> {outfit.reasoning}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OutfitCard;
