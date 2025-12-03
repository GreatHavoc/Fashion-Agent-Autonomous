// TaskDataViewer.jsx
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Edit2, Save, X } from 'lucide-react';
import { saveStateThenStream, updateStateAndRerun } from '../utils/apiClient';
import { FaYoutube, FaGlobe, FaRegImage } from "react-icons/fa";



const THEME = {
  bgPrimary: "linear-gradient(135deg, rgba(17,19,36,0.75), rgba(21,24,45,0.55))",
  bgSecondary: "linear-gradient(135deg, rgba(10,13,30,0.85), rgba(17,21,40,0.65))",
  cardBg: "rgba(17, 19, 36, 0.40)",
  subtleCardBg: "rgba(255,255,255,0.03)",
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

// Helper for robust image loading
const RobustImage = ({ src, alt, isThumbnail = false }) => {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        color: 'rgba(255,255,255,0.2)'
      }}>
        <FaRegImage size={isThumbnail ? 16 : 32} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
};


const ThesisCard = ({ thesis }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 300;
  const shouldTruncate = thesis && thesis.length > maxLength;

  return (
    <div style={{
      padding: '24px',
      background: "linear-gradient(135deg, rgba(124, 92, 255, 0.1), rgba(124, 92, 255, 0.02))",
      borderRadius: '16px',
      marginBottom: '32px',
      border: "1px solid rgba(124, 92, 255, 0.15)",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background element */}
      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(124, 92, 255, 0.2)', filter: 'blur(50px)', borderRadius: '50%' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 12px', borderRadius: '99px',
          background: 'rgba(124, 92, 255, 0.2)', color: '#a888ff',
          fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em',
          marginBottom: '16px'
        }}>
          <span style={{ fontSize: '14px' }}>✨</span> AI Synthesis
        </div>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600', color: '#fff' }}>
          Executive Summary
        </h3>
        <div style={{ fontSize: '15px', lineHeight: '1.7', color: 'rgba(255, 255, 255, 0.9)', whiteSpace: 'pre-wrap' }}>
          {shouldTruncate && !isExpanded ? `${thesis.slice(0, maxLength)}...` : thesis}
        </div>

        {shouldTruncate && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              marginTop: '12px',
              background: 'transparent',
              border: 'none',
              color: '#a888ff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {isExpanded ? 'Show Less' : 'Read More'} <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        )}
      </div>
    </div>
  );
};

// Updated TrendExplorer: Cleaner Layout, Compact Header
const TrendExplorer = ({ data }) => {
  const [activeTab, setActiveTab] = useState('style');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const trendAnalysis = data.final_processor?.trend_analysis;

  if (!trendAnalysis) return null;

  useEffect(() => {
    setSelectedIndex(0);
  }, [activeTab]);

  // Mock Pantone Library (Common Fashion Colors)
  const getPantoneData = (colorName) => {
    const name = colorName?.toLowerCase() || '';
    const library = {
      'black': { hex: '#2D2926', code: '19-4005 TCX', name: 'Jet Black' },
      'white': { hex: '#F4F5F0', code: '11-0601 TCX', name: 'Bright White' },
      'cream': { hex: '#EAE6CA', code: '11-0107 TCX', name: 'Papyrus' },
      'brown': { hex: '#4E3B31', code: '19-1217 TCX', name: 'Espresso' },
      'espresso': { hex: '#3B2F2F', code: '19-1419 TCX', name: 'Chicory Coffee' },
      'red': { hex: '#C8102E', code: '18-1662 TCX', name: 'Flame Scarlet' },
      'regal red': { hex: '#9E1030', code: '19-1763 TCX', name: 'Racing Red' },
      'pink': { hex: '#F6D2D9', code: '13-2802 TCX', name: 'Fairy Tale' },
      'powder pink': { hex: '#ECB7B7', code: '14-1511 TCX', name: 'Powder Pink' },
      'purple': { hex: '#663399', code: '19-3542 TCX', name: 'Pansy' },
      'eggplant': { hex: '#4B0082', code: '19-2514 TCX', name: 'Italian Plum' },
      'green': { hex: '#009E60', code: '17-6153 TCX', name: 'Fern Green' },
      'mint': { hex: '#98FF98', code: '13-0117 TCX', name: 'Green Ash' },
      'blue': { hex: '#0F4C81', code: '19-4052 TCX', name: 'Classic Blue' },
      'navy': { hex: '#000080', code: '19-3832 TCX', name: 'Navy Blue' },
    };

    for (const key in library) {
      if (name.includes(key)) return library[key];
    }

    return { hex: '#888888', code: 'Unknown', name: colorName };
  };

  const getSourceInfo = (url) => {
    if (url.includes('youtube')) return { title: 'YouTube Analysis', type: 'video' };
    try { return { title: new URL(url).hostname.replace('www.', ''), type: 'web' }; }
    catch { return { title: 'Web Source', type: 'web' }; }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', count: 1 },
    { id: 'style', label: 'Style', count: trendAnalysis.style_trends?.length || 0 },
    { id: 'color', label: 'Colors', count: trendAnalysis.dominant_color_trends?.length || 0 },
    { id: 'print', label: 'Prints', count: (trendAnalysis.print_trends?.length || 0) + (trendAnalysis.pattern_trends?.length || 0) },
    { id: 'material', label: 'Materials', count: (trendAnalysis.material_trends?.length || 0) + (trendAnalysis.silhouette_trends?.length || 0) },
  ];

  const getCurrentData = () => {
    switch (activeTab) {
      case 'overview': return [{
        name: 'Executive Synthesis',
        description: data.final_processor?.analysis_summary || 'No synthesis available.',
        seasonal_insights: data.final_processor?.trend_analysis?.seasonal_insights,
        predicted_trends: data.final_processor?.trend_analysis?.predicted_next_season_trends,
        trend_direction: 'Strategic',
        confidence_score: data.final_processor?.overall_confidence_score || 1.0,
        isOverview: true
      }];
      case 'style': return trendAnalysis.style_trends || [];
      case 'color': return trendAnalysis.dominant_color_trends || [];
      case 'print': return [...(trendAnalysis.print_trends || []), ...(trendAnalysis.pattern_trends || [])];
      case 'material': return [...(trendAnalysis.material_trends || []), ...(trendAnalysis.silhouette_trends || [])];
      default: return [];
    }
  };

  const currentItems = getCurrentData();
  const selectedItem = currentItems[selectedIndex];

  // Resolve Pantone Data if Color Tab
  const pantoneData = activeTab === 'color' && selectedItem
    ? getPantoneData(selectedItem.name || selectedItem.trend_name)
    : null;

  // Use the resolved hex if available, otherwise fallback
  const displayColor = pantoneData ? pantoneData.hex : selectedItem?.pantone_code;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '600px',
      // Removed outer container styling (background, border, radius)
      fontFamily: 'Inter, sans-serif'
    }}>

      {/* 1. Top Bar */}
      <div style={{
        padding: '0 0 20px 0', // Removed horizontal padding
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: '12px', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
            >
              {tab.label} <span style={{ opacity: 0.5, marginLeft: 4 }}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '700' }}>Confidence</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#4ad295' }}>{(data.final_processor.overall_confidence_score * 100).toFixed(0)}%</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '700' }}>Sources</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>{trendAnalysis.total_sources_analyzed}</div>
          </div>
        </div>
      </div>

      {/* 2. Main Split View */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', marginTop: '20px' }}>

        {/* Left: Navigation List */}
        <div className="no-scrollbar" style={{
          width: '280px',
          overflowY: 'auto',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          paddingRight: '10px' // Add some spacing
        }}>
          {currentItems.map((item, i) => {
            const isSelected = i === selectedIndex;
            const isRising = item.trend_direction?.toLowerCase().includes('rising');
            const name = item.name || item.trend_name || item.pattern_name || item.print_name || item.material || item.silhouette;

            return (
              <div
                key={i}
                onClick={() => setSelectedIndex(i)}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(168, 136, 255, 0.08)' : 'transparent',
                  borderLeft: isSelected ? '3px solid #a888ff' : '3px solid transparent',
                  borderRadius: '8px', // Added radius for cleaner look
                  marginBottom: '4px', // Spacing between items
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: isSelected ? '600' : '500', color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                  {name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                    color: isRising ? '#4ad295' : 'rgba(255,255,255,0.4)'
                  }}>
                    {isRising ? '🚀 Rising' : 'Stable'}
                  </span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                    {(item.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Detail Canvas */}
        <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', position: 'relative', paddingLeft: '30px' }}>
          {selectedItem ? (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>

              {/* Compact Immersive Header */}
              <div style={{
                padding: '24px', // Reduced padding
                background: activeTab === 'color' && displayColor
                  ? displayColor
                  : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                borderRadius: '16px', // Rounded corners for the header itself
                marginBottom: '24px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Dark overlay for text readability if it's a color card */}
                {activeTab === 'color' && (
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />
                )}

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '6px',
                        background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
                        color: '#fff', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase'
                      }}>
                        {activeTab} Trend
                      </span>
                      {selectedItem.trend_direction?.toLowerCase().includes('rising') && (
                        <span style={{
                          padding: '4px 10px', borderRadius: '6px',
                          background: 'rgba(74, 210, 149, 0.9)',
                          color: '#000', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase'
                        }}>
                          Rising
                        </span>
                      )}
                    </div>

                    <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#fff', letterSpacing: '-0.02em', lineHeight: '1.2', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                      {selectedItem.name || selectedItem.trend_name || selectedItem.pattern_name || selectedItem.print_name || selectedItem.material || selectedItem.silhouette}
                    </h2>
                  </div>

                  {/* Pantone Info (Right Aligned) */}
                  {activeTab === 'color' && pantoneData && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', letterSpacing: '0.05em' }}>{pantoneData.code}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>{pantoneData.name}</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: '0 8px' }}>
                {/* Description */}
                <div style={{ marginBottom: '32px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Analysis</h4>
                  <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'rgba(255,255,255,0.8)' }}>
                    {selectedItem.description}
                  </p>
                </div>

                {/* Executive Synthesis Dashboard */}
                {activeTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Seasonal Insights Grid */}
                    {selectedItem.seasonal_insights && (
                      <div>
                        <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>Seasonal Insights</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          {['fall', 'winter', 'spring', 'summer'].map(season => (
                            <div key={season} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: season === 'fall' ? '#fbbf24' : season === 'winter' ? '#60a5fa' : season === 'spring' ? '#f472b6' : '#34d399' }} />
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff', textTransform: 'capitalize' }}>{season}</span>
                              </div>
                              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                                {selectedItem.seasonal_insights[season]?.map((insight, i) => (
                                  <li key={i}>{insight}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Future Outlook */}
                    {selectedItem.predicted_trends && (
                      <div style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(168, 136, 255, 0.1) 0%, rgba(168, 136, 255, 0.05) 100%)', borderRadius: '16px', border: '1px solid rgba(168, 136, 255, 0.2)' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#a888ff', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>Future Outlook: Next Season Predictions</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {selectedItem.predicted_trends.map((trend, i) => (
                            <span key={i} style={{
                              padding: '6px 12px', borderRadius: '20px',
                              background: 'rgba(168, 136, 255, 0.15)',
                              color: '#fff', fontSize: '13px', fontWeight: '500'
                            }}>
                              {trend}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Metrics (Hide for Overview) */}
                {activeTab !== 'overview' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Frequency</div>
                      <div style={{ fontSize: '20px', fontWeight: '600', color: '#fff' }}>{selectedItem.frequency} <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: '400' }}>sightings</span></div>
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Confidence</div>
                      <div style={{ fontSize: '20px', fontWeight: '600', color: '#fff' }}>{(selectedItem.confidence_score * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                )}

                {/* Evidence List (Hide for Overview) */}
                {activeTab !== 'overview' && (
                  <div>
                    <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>Source Evidence</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedItem.source_urls?.map((url, i) => {
                        const info = getSourceInfo(url);
                        return (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            style={{
                              display: 'flex', alignItems: 'center', gap: '12px',
                              padding: '10px 14px', borderRadius: '8px',
                              background: 'rgba(255,255,255,0.03)',
                              color: THEME.accentLink, fontSize: '12px', textDecoration: 'none',
                              transition: 'background 0.2s',
                              border: '1px solid transparent'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                              e.currentTarget.style.borderColor = 'transparent';
                            }}
                          >
                            {info.type === 'video' ? <FaYoutube color="#ff4444" size={14} /> : <FaGlobe color={THEME.accentLink} size={14} />}
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.title}</span>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>View Source</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
              Select a trend to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



const renderTrendProcessorEdit = (data, onChange) => {
  const trendAnalysis = data.final_processor?.trend_analysis;
  if (!trendAnalysis) return <div style={{ padding: 20 }}>No trend analysis data</div>;

  // We need to use a ref or simple variable for tab state if we want to avoid re-rendering the whole parent on tab switch?
  // Actually, since this is a render function called by parent, we can't easily use hooks *inside* it unless we extract it to a component.
  // The parent `TaskDataViewer` re-renders when `editedData` changes.
  // But `activeTab` state needs to persist.
  // Ideally, we should extract this to a component: `TrendProcessorEditor`.

  return <TrendProcessorEditor data={data} onChange={onChange} />;
};

const TrendProcessorEditor = ({ data, onChange }) => {
  const [activeTab, setActiveTab] = useState('style');
  const trendAnalysis = data.final_processor?.trend_analysis;

  const updateAnalysis = (field, value) => {
    const newProcessor = { ...data.final_processor };
    newProcessor.trend_analysis = { ...trendAnalysis, [field]: value };
    onChange({ ...data, final_processor: newProcessor });
  };

  const getListName = (tab) => {
    switch (tab) {
      case 'style': return 'style_trends';
      case 'color': return 'dominant_color_trends';
      case 'print': return 'print_trends'; // Note: print_trends and pattern_trends are separate in data but merged in view. For edit, let's keep them separate or just edit one? 
      // The view merged them. Let's just handle the main ones for now or add tabs for all.
      // Let's stick to the view's tabs but maybe split print/pattern if needed.
      // View tabs: Style, Color, Prints (print+pattern), Materials (material+silhouette).
      // For editing, it's safer to expose the actual underlying lists.
      // Let's use: Style, Color, Print, Pattern, Material, Silhouette.
      case 'pattern': return 'pattern_trends';
      case 'material': return 'material_trends';
      case 'silhouette': return 'silhouette_trends';
      default: return 'style_trends';
    }
  };

  const listName = getListName(activeTab);
  const currentList = trendAnalysis[listName] || [];

  const updateTrendItem = (index, field, value) => {
    const newList = [...currentList];
    newList[index] = { ...newList[index], [field]: value };
    updateAnalysis(listName, newList);
  };

  const removeTrendItem = (index) => {
    const newList = currentList.filter((_, i) => i !== index);
    updateAnalysis(listName, newList);
  };

  const addTrendItem = () => {
    const newItem = {
      name: 'New Trend',
      trend_direction: 'Stable',
      confidence_score: 0.5,
      frequency: 1,
      description: '',
      source_urls: []
    };
    updateAnalysis(listName, [...currentList, newItem]);
  };

  const tabs = [
    { id: 'style', label: 'Style' },
    { id: 'color', label: 'Color' },
    { id: 'print', label: 'Print' },
    { id: 'pattern', label: 'Pattern' },
    { id: 'material', label: 'Material' },
    { id: 'silhouette', label: 'Silhouette' },
  ];

  return (
    <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#fff' }}>Edit Trend Intelligence</h3>
      </div>

      {/* Executive Summary */}
      <div style={{ marginBottom: '32px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: THEME.textSecondary, marginBottom: '8px', fontWeight: '600' }}>EXECUTIVE SYNTHESIS</label>
        <textarea
          className="no-scrollbar"
          value={data.final_processor?.analysis_summary || ''}
          onChange={(e) => {
            const newProcessor = { ...data.final_processor, analysis_summary: e.target.value };
            onChange({ ...data, final_processor: newProcessor });
          }}
          style={{
            width: '100%', minHeight: '120px', padding: '16px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
            color: THEME.textPrimary, fontSize: '14px', lineHeight: '1.6', resize: 'vertical'
          }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id ? 'rgba(168, 136, 255, 0.2)' : 'rgba(255,255,255,0.05)',
              color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.6)',
              fontSize: '13px', fontWeight: '600',
              cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List Editor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {currentList.map((item, index) => (
          <div key={index} style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: THEME.textSecondary }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} #{index + 1}</span>
              <button onClick={() => removeTrendItem(index)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>Remove</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: THEME.textSecondary, marginBottom: '4px' }}>NAME</label>
                <input
                  value={item.name || item.trend_name || item.pattern_name || item.print_name || item.material || item.silhouette || ''}
                  onChange={(e) => updateTrendItem(index, activeTab === 'material' ? 'material' : activeTab === 'silhouette' ? 'silhouette' : activeTab === 'pattern' ? 'pattern_name' : activeTab === 'print' ? 'print_name' : 'name', e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: THEME.textSecondary, marginBottom: '4px' }}>DIRECTION</label>
                <select
                  value={item.trend_direction || 'Stable'}
                  onChange={(e) => updateTrendItem(index, 'trend_direction', e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                >
                  <option value="Rising">Rising</option>
                  <option value="Stable">Stable</option>
                  <option value="Declining">Declining</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: THEME.textSecondary, marginBottom: '4px' }}>CONFIDENCE</label>
                <input
                  type="number" step="0.1" min="0" max="1"
                  value={item.confidence_score || 0}
                  onChange={(e) => updateTrendItem(index, 'confidence_score', parseFloat(e.target.value))}
                  style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                />
              </div>
            </div>

            {activeTab === 'color' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: THEME.textSecondary, marginBottom: '4px' }}>PANTONE CODE / HEX</label>
                <input
                  value={item.pantone_code || ''}
                  onChange={(e) => updateTrendItem(index, 'pantone_code', e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                  placeholder="e.g. 19-4005 TCX or #000000"
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: THEME.textSecondary, marginBottom: '4px' }}>DESCRIPTION</label>
              <textarea
                className="no-scrollbar"
                value={item.description || ''}
                onChange={(e) => updateTrendItem(index, 'description', e.target.value)}
                style={{ width: '100%', minHeight: '80px', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', resize: 'vertical' }}
              />
            </div>
          </div>
        ))}

        <button
          onClick={addTrendItem}
          style={{
            padding: '12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px dashed rgba(255,255,255,0.2)',
            borderRadius: '12px',
            color: THEME.textSecondary,
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
        >
          + Add New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Trend
        </button>
      </div>
    </div>
  );
};

const TaskDataViewer = ({
  completedNodes,
  activeNode,
  taskData,
  onEditModeChange,
  onUpdateData,
  onSaveChanges,
  // new props:
  selectedTask: externalSelectedTask = "data_collector",
  onSelectTask = null,
  allowLocalSelection = true, // when false, sidebar items won't change selection
  threadId, // Add this prop
  onRerunFromNode, // Add this callback prop
}) => {
  // Use internal state but sync with external selectedTask if provided
  const [selectedTask, setSelectedTask] = useState(externalSelectedTask);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  // sync external selection changes into internal state
  useEffect(() => {
    if (externalSelectedTask !== undefined && externalSelectedTask !== selectedTask) {
      setSelectedTask(externalSelectedTask);
      setIsEditing(false);
      setEditedData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSelectedTask]);

  const isYouTubeUrl = (url) => /(?:youtube\.com\/|youtu\.be\/)/i.test(url);
  const isImageUrl = (url) => /\.(jpe?g|png|gif|webp|svg)(\?.*)?$/i.test(url);

  const renderSourceIcon = (url, size = 16) => {
    if (isYouTubeUrl(url)) {
      return <FaYoutube size={size} style={{ marginRight: 6 }} />;
    }
    if (isImageUrl(url)) {
      // show a small image thumbnail for direct image links
      return (
        <img
          src={url}
          alt="src thumb"
          style={{
            width: size + 4,
            height: size + 4,
            objectFit: 'cover',
            borderRadius: 4,
            marginRight: 6,
            border: `1px solid ${THEME.borderColor}`
          }}
        />
      );
    }
    // default: website / article
    return <FaGlobe size={size} style={{ marginRight: 6 }} />;
  };


  console.log("TaskDataViewer props:", { completedNodes, activeNode, taskData });
  const TASK_LABELS = {
    'data_collector': 'Data Collection',
    'video_analyzer': 'Video Analysis',
    'content_analyzer': 'Content Analysis',
    'trend_processor': 'Trend Processing',
    'outfit_designer': 'Outfit Design',
    'video_generation': 'Video Generation'
  };

  const handleTaskClick = (taskId) => {
    if (completedNodes.includes(taskId) || activeNode === taskId) {
      setSelectedTask(taskId);
      setIsEditing(false);
      setEditedData(null);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedData(JSON.parse(JSON.stringify(taskData[selectedTask] || {})));
    if (onEditModeChange) onEditModeChange(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData(null);
    if (onEditModeChange) onEditModeChange(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedTask || !editedData) return;
    // Call parent's onSaveChanges if provided (to update local state)
    if (onSaveChanges) {
      try {
        await onSaveChanges(selectedTask, editedData);
      } catch (err) {
        console.error("onSaveChanges failed:", err);
      }
    }
    // Use checkpoint-based rerun if threadId is available
    if (!threadId) {
      console.warn("No threadId provided. Cannot rerun from checkpoint.");
      setIsEditing(false);
      setEditedData(null);
      if (onEditModeChange) onEditModeChange(false);
      return;
    }
    try {
      console.log(`Updating node ${selectedTask} and rerunning from checkpoint`);
      // Use the new checkpoint-based approach
      const { reader, checkpoint } = await updateStateAndRerun(
        threadId,
        selectedTask,  // The node to update
        editedData     // The modified data
      );
      console.log("Re-running workflow from checkpoint:", checkpoint);
      // Notify parent to handle the stream
      if (onRerunFromNode) {
        onRerunFromNode(selectedTask, reader);
      }
      setIsEditing(false);
      setEditedData(null);
      if (onEditModeChange) onEditModeChange(false);
    } catch (err) {
      console.error("Error during checkpoint rerun:", err);
      alert(`Failed to rerun workflow: ${err.message || err}`);
    }
  };


  const handleJsonEdit = (newValue) => {
    try {
      const parsed = JSON.parse(newValue);
      setEditedData(parsed);
    } catch (e) {
      // Invalid JSON, keep the text but don't update state
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderTaskData = (taskId, data) => {
    if (!data) {
      return (
        <div style={{ padding: '20px', color: THEME.textSecondary, textAlign: 'center' }}>
          No data available yet
        </div>
      );
    }

    // Render based on task type
    switch (taskId) {
      case 'data_collector':
        return renderDataCollectorData(data);
      case 'video_analyzer':
        return renderVideoAnalyzerData(data);
      case 'content_analyzer':
        return renderContentAnalyzerData(data);
      case 'trend_processor':
        return renderTrendProcessorData(data);
      case 'outfit_designer':
        return renderOutfitDesignerData(data, taskData?.trend_processor);
      case 'video_generation':
        return renderVideoGenerationData(data);
      default:
        return renderGenericData(data);
    }
  };

  const itemCardStyle = {
    padding: '12px',
    marginBottom: '12px',
    background: THEME.cardBg,
    borderRadius: '8px',
    // border: `1px solid ${THEME.borderColor}`,
    color: THEME.textPrimary
  };

  const smallStatBoxStyle = {
    padding: '8px',
    background: THEME.subtleCardBg,
    // borderRadius: '6px',
    // border: `1px solid ${THEME.borderColor}`,
    color: THEME.textPrimary
  };

  const renderDataCollectorData = (data) => {
    const urls = data.data_collection.url_list || [];

    // --- Stats Calculation ---
    const uniqueDomains = new Set(urls.map(u => {
      try { return new URL(u.url).hostname.replace('www.', ''); } catch { return 'unknown'; }
    })).size;

    const mediaMix = urls.reduce((acc, item) => {
      if (isYouTubeUrl(item.url)) acc.video++;
      else if (isImageUrl(item.url)) acc.image++;
      else acc.text++;
      return acc;
    }, { video: 0, image: 0, text: 0 });

    const authors = urls.reduce((acc, item) => {
      const auth = item.author || 'Unknown';
      acc[auth] = (acc[auth] || 0) + 1;
      return acc;
    }, {});
    const topAuthor = Object.entries(authors).sort((a, b) => b[1] - a[1])[0] || ['None', 0];

    // --- STYLES ---

    const mainContainerStyle = {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '600px',
      maxHeight: '700px',
      background: "rgba(255, 255, 255, 0.02)",
      borderRadius: '20px',
      overflow: 'hidden',
      backdropFilter: 'blur(10px)',
      border: "1px solid rgba(255, 255, 255, 0.05)",
      margin: '0',
      position: 'relative' // Ensure positioning context
    };

    const headerStyle = {
      padding: '20px 24px',
      background: "rgba(255, 255, 255, 0.03)",
      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 20, // Higher z-index
      position: 'relative', // Ensure it sits on top
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)' // Subtle shadow to separate
    };

    const scrollableAreaStyle = {
      flex: 1,
      overflowY: 'auto',
      padding: '0',
      // Hide scrollbar for Chrome, Safari and Opera
      '::-webkit-scrollbar': {
        display: 'none'
      },
      // Hide scrollbar for IE, Edge and Firefox
      msOverflowStyle: 'none',  /* IE and Edge */
      scrollbarWidth: 'none',  /* Firefox */
    };

    const statItemStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flex: 1
    };

    const listItemStyle = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
      transition: 'background 0.2s ease',
      cursor: 'default'
    };

    const iconBoxStyle = {
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: "rgba(124, 92, 255, 0.1)",
      color: "#a888ff",
      flexShrink: 0
    };

    return (
      <div style={mainContainerStyle}>

        {/* FIXED HEADER: KPIs */}
        <div style={headerStyle}>
          {/* Volume */}
          <div style={statItemStyle}>
            <div style={{ ...iconBoxStyle, background: 'rgba(168, 136, 255, 0.1)', color: '#a888ff' }}><FaGlobe size={16} /></div>
            <div>
              <div style={{ fontSize: '10px', color: THEME.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Total Volume</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', lineHeight: '1.1' }}>
                {urls.length} <span style={{ fontSize: '13px', fontWeight: '400', color: 'rgba(255,255,255,0.4)' }}>resources</span>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Across {uniqueDomains} domains</div>
            </div>
          </div>

          {/* Media Mix */}
          <div style={statItemStyle}>
            <div style={{ ...iconBoxStyle, background: 'rgba(74, 210, 149, 0.1)', color: '#4ad295' }}><FaYoutube size={16} /></div>
            <div>
              <div style={{ fontSize: '10px', color: THEME.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Media Mix</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', lineHeight: '1.1' }}>
                {mediaMix.video} <span style={{ fontSize: '13px', fontWeight: '400', color: 'rgba(255,255,255,0.4)' }}>vids</span> • {mediaMix.image} <span style={{ fontSize: '13px', fontWeight: '400', color: 'rgba(255,255,255,0.4)' }}>imgs</span>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                {mediaMix.video > 0 ? `${Math.round((mediaMix.video / urls.length) * 100)}% Video` : 'Text Heavy'}
              </div>
            </div>
          </div>

          {/* Top Contributor */}
          <div style={statItemStyle}>
            <div style={{ ...iconBoxStyle, background: 'rgba(250, 204, 21, 0.1)', color: '#facc15' }}><Edit2 size={16} /></div>
            <div>
              <div style={{ fontSize: '10px', color: THEME.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Top Source</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', lineHeight: '1.1' }}>
                {topAuthor[0].length > 12 ? topAuthor[0].substring(0, 12) + '...' : topAuthor[0]}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{topAuthor[1]} resources</div>
            </div>
          </div>
        </div>

        {/* SCROLLABLE BODY: Data List */}
        <div style={scrollableAreaStyle} className="no-scrollbar">
          <style>
            {`
              .no-scrollbar::-webkit-scrollbar {
                display: none;
              }
              .no-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}
          </style>
          {urls.map((item, index) => (
            <div
              key={index}
              style={{
                ...listItemStyle,
                borderBottom: index === urls.length - 1 ? 'none' : listItemStyle.borderBottom
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              {/* Left: Icon + Text */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  {renderSourceIcon(item.url, 16)}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#fff', marginBottom: '2px' }}>
                    {item.title || 'Untitled Resource'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {new URL(item.url).hostname.replace('www.', '')}
                    <span>•</span>
                    {item.author || 'Unknown'}
                  </div>
                </div>
              </div>

              {/* Right: Category + Action */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: '16px' }}>
                <span style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.5)',
                  fontWeight: '500'
                }}>
                  {item.category || 'General'}
                </span>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: THEME.accentLink,
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '13px', fontWeight: '500', textDecoration: 'none',
                    padding: '6px 12px', borderRadius: '6px', background: 'rgba(124, 92, 255, 0.1)'
                  }}
                >
                  Visit <ChevronRight size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>
    );
  };

  const renderDataCollectorEdit = (data, onChange) => {
    // Access the correct nested structure
    const urls = data.data_collection?.url_list || [];

    const handleItemChange = (index, field, value) => {
      const newUrls = [...urls];
      newUrls[index] = { ...newUrls[index], [field]: value };

      // Preserve the nested structure when updating
      onChange({
        ...data,
        data_collection: {
          ...data.data_collection,
          url_list: newUrls
        }
      });
    };

    const handleRemove = (index) => {
      const newUrls = urls.filter((_, i) => i !== index);
      onChange({
        ...data,
        data_collection: {
          ...data.data_collection,
          url_list: newUrls
        }
      });
    };

    const handleAdd = () => {
      const newUrls = [...urls, { title: '', url: '', category: 'General', author: '', excerpt: '' }];
      onChange({
        ...data,
        data_collection: {
          ...data.data_collection,
          url_list: newUrls
        }
      });
    };

    // Modern "Filled" Input Style
    const inputStyle = {
      width: '100%',
      padding: '12px 16px',
      background: "rgba(0, 0, 0, 0.2)", // Darker filled background
      border: "1px solid rgba(255, 255, 255, 0.08)", // Very subtle border
      borderRadius: '8px', // Softer corners
      color: THEME.textPrimary,
      fontSize: '14px',
      marginBottom: '8px',
      outline: 'none',
      transition: 'all 0.2s ease',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' // Inner shadow for depth
    };

    const labelStyle = {
      display: 'block',
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: THEME.textSecondary,
      marginBottom: '6px',
      fontWeight: '600',
      opacity: 0.8
    };

    return (
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', letterSpacing: '-0.01em' }}>Edit Resources</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: THEME.textSecondary }}>
              Manage your data collection sources.
            </p>
          </div>
          <button
            onClick={handleAdd}
            style={{
              padding: '10px 20px',
              background: "linear-gradient(135deg, #7c5cff, #a888ff)", // Gradient button
              color: 'white',
              border: 'none',
              borderRadius: '99px', // Pill shape
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(124, 92, 255, 0.3)',
              transition: 'transform 0.2s'
            }}
          >
            + Add Resource
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {urls.map((item, index) => (
            <div key={index} style={{
              padding: '24px',
              background: "rgba(255, 255, 255, 0.03)", // Glassy background
              borderRadius: '16px', // Large radius
              border: "1px solid rgba(255, 255, 255, 0.05)", // Barely visible border
              position: 'relative',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' // Soft shadow
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)"
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    background: "rgba(124, 92, 255, 0.2)",
                    color: "#a888ff",
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {index + 1}
                  </span>
                  <span style={{ fontWeight: '600', fontSize: '15px' }}>Resource Details</span>
                </div>
                <button
                  onClick={() => handleRemove(index)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontWeight: '500'
                  }}
                >
                  <X size={14} /> Remove
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Title</label>
                  <input
                    type="text"
                    value={item.title || ''}
                    onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                    style={inputStyle}
                    placeholder="Enter resource title..."
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>URL</label>
                  <input
                    type="text"
                    value={item.url || ''}
                    onChange={(e) => handleItemChange(index, 'url', e.target.value)}
                    style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '13px' }}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label style={labelStyle}>Category</label>
                  <input
                    type="text"
                    value={item.category || ''}
                    onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. Trends"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Author</label>
                  <input
                    type="text"
                    value={item.author || ''}
                    onChange={(e) => handleItemChange(index, 'author', e.target.value)}
                    style={inputStyle}
                    placeholder="Author Name"
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Excerpt / Summary</label>
                  <textarea
                    value={item.excerpt || ''}
                    onChange={(e) => handleItemChange(index, 'excerpt', e.target.value)}
                    style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', lineHeight: '1.6' }}
                    placeholder="Brief description..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {urls.length === 0 && (
          <div style={{
            padding: '60px',
            textAlign: 'center',
            color: THEME.textSecondary,
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: '16px',
            border: "1px dashed rgba(255, 255, 255, 0.1)",
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ fontSize: '15px', fontWeight: '500' }}>No resources yet</div>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>Add a resource to start collecting data.</div>
          </div>
        )}
      </div>
    );
  };

  const renderVideoAnalyzerData = (data) => {
    const videos = data.video_analysis || [];

    // Helper for progress bars
    const renderProgressBar = (value, max, color) => (
      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
        <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: color, borderRadius: '2px' }} />
      </div>
    );

    return (
      <div style={{ padding: '20px', color: THEME.textPrimary }}>
        {videos.map((videoData, index) => {
          const results = videoData.per_video_results || [];

          return results.map((result, vIndex) => {
            const silhouettes = result.trend_identification?.silhouette_trends || [];
            const colors = result.trend_identification?.popular_colors || [];
            const fabrics = result.trend_identification?.trending_fabrics || [];
            const themes = result.collection_analysis?.dominant_themes || [];
            const lookCount = result.collection_analysis?.number_of_looks || 0;

            // Find max frequency for scaling bars
            const maxFreq = Math.max(
              ...silhouettes.map(s => s.frequency),
              ...colors.map(c => c.frequency),
              ...fabrics.map(f => f.frequency),
              1
            );

            return (
              <div key={`${index}-${vIndex}`} style={{ marginBottom: '32px' }}>

                {/* 1. Video Header Card */}
                <div style={{
                  padding: '20px',
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  borderRadius: '16px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '12px',
                      background: 'rgba(255, 0, 0, 0.1)', color: '#ff0000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <FaYoutube size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: THEME.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
                        Analyzed Video
                      </div>
                      <a
                        href={result.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '16px', fontWeight: '600', color: '#fff', textDecoration: 'none',
                          display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        {result.video_url.length > 40 ? result.video_url.substring(0, 40) + '...' : result.video_url}
                        <ChevronRight size={14} color={THEME.textSecondary} />
                      </a>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div style={{ display: 'flex', gap: '24px', textAlign: 'right' }}>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff', lineHeight: '1' }}>{lookCount}</div>
                      <div style={{ fontSize: '11px', color: THEME.textSecondary, marginTop: '4px' }}>LOOKS DETECTED</div>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff', lineHeight: '1' }}>{themes.length}</div>
                      <div style={{ fontSize: '11px', color: THEME.textSecondary, marginTop: '4px' }}>KEY THEMES</div>
                    </div>
                  </div>
                </div>

                {/* 2. Insights Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                  {/* Left Col: Trends */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Silhouettes */}
                    <div style={{ padding: '20px', background: "rgba(255, 255, 255, 0.02)", borderRadius: '16px', border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a888ff' }} />
                        Top Silhouettes
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {silhouettes.slice(0, 4).map((item, i) => (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '2px' }}>
                              <span style={{ color: THEME.textPrimary }}>{item.name}</span>
                              <span style={{ color: THEME.textSecondary }}>{item.frequency}</span>
                            </div>
                            {renderProgressBar(item.frequency, maxFreq, '#a888ff')}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Colors */}
                    <div style={{ padding: '20px', background: "rgba(255, 255, 255, 0.02)", borderRadius: '16px', border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ad295' }} />
                        Color Palette
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {colors.map((item, i) => (
                          <div key={i} style={{
                            padding: '6px 12px', borderRadius: '8px',
                            background: 'rgba(74, 210, 149, 0.1)', border: '1px solid rgba(74, 210, 149, 0.2)',
                            fontSize: '12px', color: '#4ad295', fontWeight: '500'
                          }}>
                            {item.name}
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Right Col: Themes & Fabrics */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Collection Themes */}
                    <div style={{ padding: '20px', background: "rgba(255, 255, 255, 0.02)", borderRadius: '16px', border: "1px solid rgba(255, 255, 255, 0.05)", flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#facc15' }} />
                        Dominant Themes
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {themes.map((theme, i) => (
                          <div key={i} style={{
                            padding: '12px', borderRadius: '10px',
                            background: 'rgba(255,255,255,0.03)',
                            fontSize: '13px', color: THEME.textPrimary,
                            borderLeft: '2px solid #facc15'
                          }}>
                            {theme}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Fabrics */}
                    <div style={{ padding: '20px', background: "rgba(255, 255, 255, 0.02)", borderRadius: '16px', border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fb7185' }} />
                        Key Fabrics
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {fabrics.map((item, i) => (
                          <div key={i} style={{
                            padding: '4px 10px', borderRadius: '6px',
                            background: 'rgba(255,255,255,0.05)',
                            fontSize: '12px', color: THEME.textSecondary
                          }}>
                            {item.name}
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            );
          });
        })}
      </div>
    );
  };

  const renderVideoAnalyzerEdit = (data, onChange) => {
    // Access nested structure safely
    const videos = data.video_analysis || [];

    if (videos.length === 0) return <div style={{ padding: 20 }}>No video data to edit</div>;

    const updateResult = (videoIndex, resultIndex, field, value) => {
      const newVideos = [...videos];
      const newResults = [...newVideos[videoIndex].per_video_results];
      newResults[resultIndex] = { ...newResults[resultIndex], [field]: value };
      newVideos[videoIndex] = { ...newVideos[videoIndex], per_video_results: newResults };

      onChange({ ...data, video_analysis: newVideos });
    };

    const updateNested = (videoIndex, resultIndex, parentField, field, value) => {
      const result = videos[videoIndex].per_video_results[resultIndex];
      const parentObj = result[parentField] || {};
      updateResult(videoIndex, resultIndex, parentField, { ...parentObj, [field]: value });
    };

    // Helper to edit list of objects {name, frequency}
    const renderListEditor = (title, list, fieldName, videoIndex, resultIndex) => (
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: THEME.textSecondary, marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
          {title}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {list.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px' }}>
              <input
                value={item.name}
                onChange={(e) => {
                  const newList = [...list];
                  newList[i] = { ...newList[i], name: e.target.value };
                  updateNested(videoIndex, resultIndex, 'trend_identification', fieldName, newList);
                }}
                style={{ flex: 1, padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
              />
              <input
                type="number"
                value={item.frequency}
                onChange={(e) => {
                  const newList = [...list];
                  newList[i] = { ...newList[i], frequency: parseInt(e.target.value) || 0 };
                  updateNested(videoIndex, resultIndex, 'trend_identification', fieldName, newList);
                }}
                style={{ width: '60px', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
              />
              <button
                onClick={() => {
                  const newList = list.filter((_, idx) => idx !== i);
                  updateNested(videoIndex, resultIndex, 'trend_identification', fieldName, newList);
                }}
                style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const newList = [...list, { name: '', frequency: 1 }];
              updateNested(videoIndex, resultIndex, 'trend_identification', fieldName, newList);
            }}
            style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', color: THEME.textSecondary, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
          >
            + Add Item
          </button>
        </div>
      </div>
    );

    return (
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Refine Analysis</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: THEME.textSecondary }}>Correct or enhance the AI's findings.</p>
        </div>

        {videos.map((videoData, videoIndex) => {
          const results = videoData.per_video_results || [];
          return results.map((result, resultIndex) => (
            <div key={`${videoIndex}-${resultIndex}`} style={{ marginBottom: '40px', borderBottom: `1px solid ${THEME.borderColor}`, paddingBottom: '20px' }}>

              {/* Video Header for Context */}
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaYoutube size={20} color="#ff0000" />
                <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {result.video_url}
                </div>
              </div>

              {/* Collection Stats */}
              <div style={{ padding: '20px', background: "rgba(255, 255, 255, 0.03)", borderRadius: '16px', marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: THEME.textSecondary, marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
                  Number of Looks
                </label>
                <input
                  type="number"
                  value={result.collection_analysis?.number_of_looks || 0}
                  onChange={(e) => updateNested(videoIndex, resultIndex, 'collection_analysis', 'number_of_looks', parseInt(e.target.value))}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              {/* Trends */}
              <div style={{ padding: '20px', background: "rgba(255, 255, 255, 0.03)", borderRadius: '16px', marginBottom: '20px' }}>
                {renderListEditor('Silhouettes', result.trend_identification?.silhouette_trends || [], 'silhouette_trends', videoIndex, resultIndex)}
                {renderListEditor('Colors', result.trend_identification?.popular_colors || [], 'popular_colors', videoIndex, resultIndex)}
              </div>

              {/* Themes */}
              <div style={{ padding: '20px', background: "rgba(255, 255, 255, 0.03)", borderRadius: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: THEME.textSecondary, marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
                  Dominant Themes
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(result.collection_analysis?.dominant_themes || []).map((theme, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px' }}>
                      <input
                        value={theme}
                        onChange={(e) => {
                          const newThemes = [...result.collection_analysis.dominant_themes];
                          newThemes[i] = e.target.value;
                          updateNested(videoIndex, resultIndex, 'collection_analysis', 'dominant_themes', newThemes);
                        }}
                        style={{ flex: 1, padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                      />
                      <button
                        onClick={() => {
                          const newThemes = result.collection_analysis.dominant_themes.filter((_, idx) => idx !== i);
                          updateNested(videoIndex, resultIndex, 'collection_analysis', 'dominant_themes', newThemes);
                        }}
                        style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newThemes = [...(result.collection_analysis?.dominant_themes || []), 'New Theme'];
                      updateNested(videoIndex, resultIndex, 'collection_analysis', 'dominant_themes', newThemes);
                    }}
                    style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', color: THEME.textSecondary, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    + Add Theme
                  </button>
                </div>
              </div>
            </div>
          ));
        })}
      </div>
    );
  };

  const renderContentAnalyzerData = (data) => {
    const analysis = data.content_analysis || [];

    return (
      <div style={{ padding: '20px', color: THEME.textPrimary }}>
        {analysis.map((contentData, index) => {
          const findings = contentData.per_url_findings || [];

          return (
            <div key={index}>
              {/* 1. Enhanced Thesis - Hero Card */}
              {contentData.enhanced_thesis && (
                <ThesisCard thesis={contentData.enhanced_thesis} />
              )}

              {/* 2. Findings Feed */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '8px' }}>
                  Source Insights ({findings.length})
                </div>

                {findings.map((finding, fIndex) => {
                  const strength = finding.evidence_strength || 0;
                  const strengthColor = strength > 0.7 ? '#4ad295' : strength > 0.4 ? '#facc15' : '#fb7185';

                  return (
                    <div key={fIndex} style={{
                      padding: '24px',
                      background: "rgba(255, 255, 255, 0.03)",
                      borderRadius: '16px',
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      transition: 'transform 0.2s',
                      hover: { transform: 'translateY(-2px)' }
                    }}>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#fff', flex: 1, paddingRight: '16px' }}>
                          {finding.title}
                        </h4>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '4px 10px', borderRadius: '6px',
                          background: `rgba(${strength > 0.7 ? '74, 210, 149' : strength > 0.4 ? '250, 204, 21' : '251, 113, 133'}, 0.1)`,
                          color: strengthColor,
                          fontSize: '12px', fontWeight: '600'
                        }}>
                          {(strength * 100).toFixed(0)}% Confidence
                        </div>
                      </div>

                      {/* Summary */}
                      <p style={{ margin: '0 0 20px 0', fontSize: '14px', lineHeight: '1.6', color: THEME.textSecondary }}>
                        {finding.summary}
                      </p>

                      {/* Tags Grid */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Micro Trends */}
                        {finding.micro_trends?.length > 0 && (
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: THEME.textSecondary, textTransform: 'uppercase', marginBottom: '8px' }}>Micro Trends</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {finding.micro_trends.map((trend, i) => (
                                <span key={i} style={{
                                  padding: '4px 10px', borderRadius: '6px',
                                  background: 'rgba(124, 92, 255, 0.1)', border: '1px solid rgba(124, 92, 255, 0.2)',
                                  color: '#a888ff', fontSize: '12px'
                                }}>
                                  {trend}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          {/* Colors */}
                          {finding.colors?.length > 0 && (
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: '600', color: THEME.textSecondary, textTransform: 'uppercase', marginBottom: '8px' }}>Palette</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {finding.colors.map((color, i) => (
                                  <span key={i} style={{
                                    padding: '4px 8px', borderRadius: '4px',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: THEME.textPrimary, fontSize: '12px'
                                  }}>
                                    {color}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Silhouettes */}
                          {finding.silhouettes?.length > 0 && (
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: '600', color: THEME.textSecondary, textTransform: 'uppercase', marginBottom: '8px' }}>Silhouettes</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {finding.silhouettes.map((item, i) => (
                                  <span key={i} style={{
                                    padding: '4px 8px', borderRadius: '4px',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: THEME.textPrimary, fontSize: '12px'
                                  }}>
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderContentAnalyzerEdit = (data, onChange) => {
    const analysis = data.content_analysis || [];
    // Assuming single analysis object for now
    const contentIndex = 0;
    const contentData = analysis[contentIndex];

    if (!contentData) return <div style={{ padding: 20 }}>No content analysis data</div>;

    const updateContent = (field, value) => {
      const newAnalysis = [...analysis];
      newAnalysis[contentIndex] = { ...newAnalysis[contentIndex], [field]: value };
      onChange({ ...data, content_analysis: newAnalysis });
    };

    const updateFinding = (findingIndex, field, value) => {
      const newFindings = [...contentData.per_url_findings];
      newFindings[findingIndex] = { ...newFindings[findingIndex], [field]: value };
      updateContent('per_url_findings', newFindings);
    };

    // Helper for tag inputs
    const TagInput = ({ label, tags, onUpdate }) => (
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: THEME.textSecondary, marginBottom: '6px', textTransform: 'uppercase', fontWeight: '600' }}>{label}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          {tags.map((tag, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 2px 2px 8px', fontSize: '12px' }}>
              {tag}
              <button
                onClick={() => onUpdate(tags.filter((_, idx) => idx !== i))}
                style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex' }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        <input
          placeholder={`Add ${label}... (Press Enter)`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              onUpdate([...tags, e.target.value.trim()]);
              e.target.value = '';
            }
          }}
          style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
        />
      </div>
    );

    return (
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Edit Content Analysis</h3>
        </div>

        {/* Thesis Edit */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: THEME.textSecondary, marginBottom: '8px', fontWeight: '600' }}>ENHANCED THESIS</label>
          <textarea
            className="no-scrollbar"
            value={contentData.enhanced_thesis || ''}
            onChange={(e) => updateContent('enhanced_thesis', e.target.value)}
            style={{
              width: '100%', minHeight: '200px', padding: '16px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
              color: THEME.textPrimary, fontSize: '14px', lineHeight: '1.6', resize: 'vertical'
            }}
          />
        </div>

        {/* Findings Edit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {contentData.per_url_findings?.map((finding, fIndex) => (
            <div key={fIndex} style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: THEME.textSecondary }}>Finding #{fIndex + 1}</span>
                <button
                  onClick={() => {
                    const newFindings = contentData.per_url_findings.filter((_, i) => i !== fIndex);
                    updateContent('per_url_findings', newFindings);
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}
                >
                  Remove
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: THEME.textSecondary, marginBottom: '4px' }}>TITLE</label>
                <input
                  value={finding.title}
                  onChange={(e) => updateFinding(fIndex, 'title', e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: THEME.textSecondary, marginBottom: '4px' }}>SUMMARY</label>
                <textarea
                  className="no-scrollbar"
                  value={finding.summary}
                  onChange={(e) => updateFinding(fIndex, 'summary', e.target.value)}
                  style={{ width: '100%', minHeight: '150px', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: THEME.textSecondary, marginBottom: '4px' }}>CONFIDENCE (0-1)</label>
                <input
                  type="number" step="0.1" min="0" max="1"
                  value={finding.evidence_strength}
                  onChange={(e) => updateFinding(fIndex, 'evidence_strength', parseFloat(e.target.value))}
                  style={{ width: '100px', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <TagInput
                label="Micro Trends"
                tags={finding.micro_trends || []}
                onUpdate={(newTags) => updateFinding(fIndex, 'micro_trends', newTags)}
              />
              <TagInput
                label="Colors"
                tags={finding.colors || []}
                onUpdate={(newTags) => updateFinding(fIndex, 'colors', newTags)}
              />
              <TagInput
                label="Silhouettes"
                tags={finding.silhouettes || []}
                onUpdate={(newTags) => updateFinding(fIndex, 'silhouettes', newTags)}
              />

            </div>
          ))}

          <button
            onClick={() => {
              const newFindings = [...(contentData.per_url_findings || []), { title: 'New Finding', summary: '', micro_trends: [], colors: [], silhouettes: [], evidence_strength: 0.5 }];
              updateContent('per_url_findings', newFindings);
            }}
            style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', color: THEME.textPrimary, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer' }}
          >
            + Add Finding
          </button>
        </div>
      </div>
    );
  };

  const renderTrendProcessorData = (data) => {
    // Just delegate to the new component
    return <TrendExplorer data={data} />;
  };

  const OutfitDesignerDisplay = ({ data, trendData }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Flatten outfits from all design groups
    const allOutfits = (data.outfit_designs || []).flatMap(group => group.Outfits || []);

    if (allOutfits.length === 0) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          No outfit designs available.
        </div>
      );
    }

    const selectedOutfit = allOutfits[selectedIndex];

    // Helper for metric bars
    const MetricBar = ({ label, value, color = THEME.accentLink }) => (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
          <span style={{ fontWeight: '600', color: '#fff' }}>{(value * 100).toFixed(0)}%</span>
        </div>
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${value * 100}%`, background: color, borderRadius: '3px' }} />
        </div>
      </div>
    );

    // Robust Image Component
    const RobustImage = ({ src, alt, isThumbnail = false }) => {
      const [error, setError] = useState(false);

      // Reset error state when src changes
      useEffect(() => {
        setError(false);
      }, [src]);

      if (error || !src) {
        return (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <span style={{ fontSize: isThumbnail ? '16px' : '48px', marginBottom: isThumbnail ? '0' : '16px' }}>👕</span>
            {!isThumbnail && <span style={{ fontSize: '14px' }}>No Preview</span>}
          </div>
        );
      }

      return (
        <img
          src={src}
          alt={alt}
          onError={() => setError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      );
    };
    // Helper: Structured Source Mapping with Deduplication
    const getLinkedSources = (outfit) => {
      // FIX: Handle nested structure
      const analysisData = trendData?.trend_analysis || trendData?.final_processor?.trend_analysis || trendData?.trend_processor?.trend_analysis;

      if (!analysisData || !outfit) return [];

      const linkedUrls = new Set();

      // Helper to match a list of items against a specific trend category
      const matchCategory = (items, trendCategory) => {
        if (!items || !trendCategory) return;

        items.forEach(item => {
          const cleanItem = item.toLowerCase();

          trendCategory.forEach(trend => {
            // FIX: Check for 'name' OR 'trend_name'
            const trendName = (trend.name || trend.trend_name || '').toLowerCase();

            if (!trendName) return; // Skip if no name found

            // Check for direct match or substring match
            if (trendName.includes(cleanItem) || cleanItem.includes(trendName)) {
              if (trend.source_urls) {
                trend.source_urls.forEach(url => linkedUrls.add(url));
              }
            }
          });
        });
      };

      // 1. Map Colors -> Color Trends
      matchCategory(outfit.dominant_colors, analysisData.dominant_color_trends);

      // 2. Map Style Tags -> Style Trends
      matchCategory(outfit.style_tags, analysisData.style_trends);

      // 3. Map "Trend Incorporation" -> Materials, Patterns, Silhouettes, Accessories
      const mixedCategories = [
        ...(analysisData.material_trends || []),
        ...(analysisData.pattern_trends || []),
        ...(analysisData.silhouette_trends || []),
        ...(analysisData.accessory_trends || [])
      ];
      matchCategory(outfit.trend_incorporation, mixedCategories);

      return Array.from(linkedUrls);
    };

    // Helper: Read More Section
    const ReadMoreSection = ({ description, targetMarket }) => {
      const [isExpanded, setIsExpanded] = useState(false);

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Description</h4>
            <p style={{
              margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'rgba(255,255,255,0.9)',
              display: '-webkit-box',
              WebkitLineClamp: isExpanded ? 'unset' : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {description}
            </p>
          </div>

          {isExpanded && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Target Market</h4>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'rgba(255,255,255,0.8)' }}>
                {targetMarket}
              </p>
            </div>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'transparent', border: 'none', padding: 0,
              color: THEME.accentLink, fontSize: '12px', fontWeight: '600',
              cursor: 'pointer', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            {isExpanded ? 'Read Less' : 'Read More'}
            <ChevronRight size={12} style={{ transform: isExpanded ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.2s' }} />
          </button>
        </div>
      );
    };
    const evidenceUrls = getLinkedSources(selectedOutfit);

    return (
      <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '650px', fontFamily: 'Inter, sans-serif' }}>

        {/* Top Stats Bar */}
        <div style={{
          padding: '6px 0px 6px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '12px'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase' }}>Total Designs</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>{allOutfits.length}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase' }}>Avg. Popularity</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.success }}>
              {(allOutfits.reduce((acc, curr) => acc + (curr.forecasted_popularity || 0), 0) / allOutfits.length * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left: Outfit List */}
          <div className="no-scrollbar" style={{
            width: '200px',
            overflowY: 'auto',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            paddingRight: '10px'
          }}>
            {allOutfits.map((outfit, i) => {
              const isSelected = i === selectedIndex;
              return (
                <div
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '12px',
                    background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: isSelected ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex', gap: '12px', alignItems: 'center'
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{
                    width: '48px', height: '64px', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)', overflow: 'hidden', flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <RobustImage src={outfit.saved_image_path} alt={outfit.outfit_name} isThumbnail={true} />
                  </div>

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '13px', fontWeight: isSelected ? '600' : '500', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {outfit.outfit_name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                      {outfit.season} • {outfit.occasion}
                    </div>
                  </div>

                  {isSelected && <ChevronRight size={16} color="rgba(255,255,255,0.5)" />}
                </div>
              );
            })}
          </div>

          {/* Right: Detail View */}
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingLeft: '15px' }}>
            {selectedOutfit && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>

                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#fff' }}>{selectedOutfit.outfit_name}</h2>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase' }}>Forecasted Popularity</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.success }}>
                      {(selectedOutfit.forecasted_popularity * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Studio View Layout (Vertical Stack) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                  height: '100%',
                  overflow: 'hidden'
                }}>

                  {/* Top Row: Visuals + Intel (Horizontal Split) */}
                  <div style={{ display: 'flex', paddingTop: '10px', gap: '24px', flexShrink: 0 }}>

                    {/* Left Panel: Visuals (Fixed Width) */}
                    <div style={{
                      flex: '0 0 162px',
                      width: '240px',
                      display: 'flex', flexDirection: 'column', gap: '16px'
                    }}>
                      {/* Image Box */}
                      <div style={{
                        height: '320px',
                        position: 'relative',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.2)'
                      }}>
                        <RobustImage src={selectedOutfit.saved_image_path} alt={selectedOutfit.outfit_name} />

                        {/* Floating Palette Overlay */}
                        <div style={{
                          position: 'absolute', bottom: '16px', left: '16px', right: '16px',
                          padding: '12px',
                          background: 'rgba(0, 0, 0, 0.6)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: '6px' }}>Palette</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {selectedOutfit.dominant_colors?.map((color, i) => (
                              <span key={i} style={{ padding: '3px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.15)', fontSize: '10px', color: '#fff' }}>
                                {color}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Style Tags (Moved to Left Panel) */}
                      <div style={{ marginTop: 'auto' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Style Tags</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {selectedOutfit.style_tags?.map((tag, i) => (
                            <span key={i} style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Panel: Intel Stack (Sources + Metrics) */}
                    <div style={{
                      flex: '1 1 0%',
                      minWidth: '0px',
                      display: 'flex', flexDirection: 'column', gap: '20px',
                      overflow: 'hidden'
                    }}>
                      {/* Source Evidence */}
                      <div style={{
                        padding: '12px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        flexShrink: 0
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: THEME.accentLink, fontSize: '12px' }}>🔗</span> Source Evidence
                          </h4>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{evidenceUrls.length} Sources</span>
                        </div>

                        {evidenceUrls.length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {evidenceUrls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                fontSize: '11px', color: 'rgba(255,255,255,0.9)', textDecoration: 'none',
                                padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                transition: 'all 0.2s'
                              }}>
                                {isYouTubeUrl(url) ? <FaYoutube size={12} color="#ff0000" /> : <FaGlobe size={12} color={THEME.accentLink} />}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                                </span>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div style={{
                            padding: '12px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '8px',
                            border: '1px dashed rgba(255,255,255,0.1)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                            color: 'rgba(255,255,255,0.4)'
                          }}>
                            <span style={{ fontSize: '14px' }}>🔍</span>
                            <span style={{ fontSize: '11px', fontStyle: 'italic' }}>
                              {!trendData ? "Trend data unavailable" : "No direct sources linked"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Metrics (Full Width) */}
                      <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Fashion Metrics</h4>
                        {selectedOutfit.fashion_metrics && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <MetricBar label="Formality" value={selectedOutfit.fashion_metrics.Formality} color="#60a5fa" />
                            <MetricBar label="Trendiness" value={selectedOutfit.fashion_metrics.Trendiness} color="#f472b6" />
                            <MetricBar label="Boldness" value={selectedOutfit.fashion_metrics.Boldness} color="#fbbf24" />
                            <MetricBar label="Wearability" value={selectedOutfit.fashion_metrics.Wearability} color="#34d399" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Description (Full Width) */}
                  <div style={{
                    flex: 1,
                    padding: '20px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    overflowY: 'auto'
                  }} className="no-scrollbar">
                    <ReadMoreSection
                      description={selectedOutfit.outfit_description}
                      targetMarket={selectedOutfit.target_market_alignment}
                    />
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderOutfitDesignerData = (data, trendData) => {
    return <OutfitDesignerDisplay data={data} trendData={trendData} />;
  };

  const VideoGenerationDisplay = ({ data }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showSource, setShowSource] = useState(false);

    // Flatten all video results
    const allVideos = (data.outfit_videos || []).flatMap(group =>
      (group.video_results || []).map(video => ({
        ...video,
        // Add group level stats if needed
      }))
    );

    if (allVideos.length === 0) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '24px' }}>🎬</span>
          </div>
          <div>No videos generated yet</div>
        </div>
      );
    }

    const selectedVideo = allVideos[selectedIndex];

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: '650px', fontFamily: 'Inter, sans-serif' }}>

        {/* Left Sidebar: Video List */}
        <div className="no-scrollbar" style={{
          borderRight: '1px solid rgba(255,255,255,0.05)',
          overflowY: 'auto',
          padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            Generated Content ({allVideos.length})
          </div>

          {allVideos.map((video, i) => {
            const isSelected = i === selectedIndex;
            return (
              <div
                key={i}
                onClick={() => setSelectedIndex(i)}
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: isSelected ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex', gap: '12px'
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: '60px', height: '60px', borderRadius: '8px',
                  overflow: 'hidden', flexShrink: 0, position: 'relative',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <RobustImage src={video.input_image_path} alt="Thumbnail" isThumbnail={true} />
                  {/* Status Indicator */}
                  <div style={{
                    position: 'absolute', bottom: '4px', right: '4px',
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: video.generation_success ? THEME.success : THEME.danger,
                    border: '1px solid rgba(0,0,0,0.5)'
                  }} />
                </div>

                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: isSelected ? '600' : '500', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {video.outfit_id}
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{video.video_duration}s</span>
                    <span>•</span>
                    <span>{video.video_format?.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Panel: Studio View */}
        <div className="no-scrollbar" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#fff' }}>{selectedVideo.outfit_id}</h2>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                Generated in {selectedVideo.generation_time?.toFixed(1)}s
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowSource(!showSource)}
                style={{
                  background: showSource ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  padding: '8px 16px', borderRadius: '8px',
                  fontSize: '12px', fontWeight: '600',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <FaRegImage size={14} /> {showSource ? 'Hide Source' : 'View Source'}
              </button>

              <div style={{
                padding: '8px 16px', borderRadius: '8px',
                background: selectedVideo.generation_success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${selectedVideo.generation_success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                color: selectedVideo.generation_success ? '#34d399' : '#f87171',
                fontSize: '12px', fontWeight: '600',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                {selectedVideo.generation_success ? 'Social Ready' : 'Generation Failed'}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Player Section */}
            <div style={{ display: 'flex', gap: '24px', height: '400px' }}>
              {/* Video Player */}
              <div style={{ flex: 1, background: '#000', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                {selectedVideo.generation_success && selectedVideo.output_video_path ? (
                  <video
                    key={selectedVideo.output_video_path} // Force reload on change
                    width="100%" height="100%" controls autoPlay muted loop
                    style={{ objectFit: 'contain' }}
                  >
                    <source src={selectedVideo.output_video_path} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: THEME.danger, gap: '12px' }}>
                    <span style={{ fontSize: '32px' }}>⚠️</span>
                    <div style={{ maxWidth: '300px', textAlign: 'center', fontSize: '13px', lineHeight: '1.5' }}>
                      {selectedVideo.error_message || "Video generation failed"}
                    </div>
                  </div>
                )}
              </div>

              {/* Source Image (Conditional) */}
              {showSource && (
                <div style={{ flex: '0 0 300px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.3s ease' }}>
                  <RobustImage src={selectedVideo.input_image_path} alt="Source" />
                  <div style={{ padding: '12px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', position: 'absolute', bottom: 0, width: '100%' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Input Source</div>
                  </div>
                </div>
              )}
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Engagement Potential</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#a888ff' }}>High</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>Based on trend alignment</div>
              </div>

              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Platform Fit</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Reels / TikTok</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>9:16 Aspect Ratio</div>
              </div>

              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Duration</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>{selectedVideo.video_duration}s</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>Optimal for retention</div>
              </div>

              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Format</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>{selectedVideo.video_format?.toUpperCase()}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>High Quality Export</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  const renderVideoGenerationData = (data) => {
    return <VideoGenerationDisplay data={data} />;
  };

  const renderOutfitDesignerEdit = (data, onChange) => {
    // Wrapper to hold selection state
    const EditWrapper = () => {
      const [selectedIndex, setSelectedIndex] = useState(0);
      const allOutfits = (data.outfit_designs || []).flatMap(group => group.Outfits || []);

      if (allOutfits.length === 0) return <div style={{ padding: 20 }}>No outfits to edit</div>;

      const selectedOutfit = allOutfits[selectedIndex];

      // Helper to update a specific outfit
      const updateOutfit = (field, value) => {
        const newData = { ...data };
        const newGroups = newData.outfit_designs.map(group => ({
          ...group,
          Outfits: group.Outfits.map(outfit => {
            // Match by reference or name
            if (outfit === selectedOutfit || outfit.outfit_name === selectedOutfit.outfit_name) {
              return { ...outfit, [field]: value };
            }
            return outfit;
          })
        }));

        onChange({ ...data, outfit_designs: newGroups });
      };

      const updateMetrics = (metric, value) => {
        const currentMetrics = selectedOutfit.fashion_metrics || {};
        updateOutfit('fashion_metrics', { ...currentMetrics, [metric]: value });
      };

      const handleTagAdd = (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
          const newTag = e.target.value.trim();
          const currentTags = selectedOutfit.style_tags || [];
          if (!currentTags.includes(newTag)) {
            updateOutfit('style_tags', [...currentTags, newTag]);
          }
          e.target.value = '';
        }
      };

      const removeTag = (tagToRemove) => {
        const currentTags = selectedOutfit.style_tags || [];
        updateOutfit('style_tags', currentTags.filter(tag => tag !== tagToRemove));
      };

      return (
        <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '650px', fontFamily: 'Inter, sans-serif' }}>
          {/* Top Stats Bar (Read Only) */}
          <div style={{
            padding: '6px 0px 6px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '12px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase' }}>Total Designs</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>{allOutfits.length}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase' }}>Avg. Popularity</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.success }}>
                {(allOutfits.reduce((acc, curr) => acc + (curr.forecasted_popularity || 0), 0) / allOutfits.length * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Left: Outfit List (Selection) */}
            <div className="no-scrollbar" style={{
              width: '200px',
              overflowY: 'auto',
              borderRight: '1px solid rgba(255,255,255,0.05)',
              paddingRight: '10px'
            }}>
              {allOutfits.map((outfit, i) => {
                const isSelected = i === selectedIndex;
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      borderRadius: '12px',
                      background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                      border: isSelected ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex', gap: '12px', alignItems: 'center'
                    }}
                  >
                    <div style={{
                      width: '40px', height: '50px', borderRadius: '6px',
                      background: 'rgba(0,0,0,0.3)', overflow: 'hidden', flexShrink: 0
                    }}>
                      <RobustImage src={outfit.saved_image_path} alt={outfit.outfit_name} isThumbnail={true} />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '12px', fontWeight: isSelected ? '600' : '500', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {outfit.outfit_name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Edit Form */}
            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingLeft: '15px' }}>
              {selectedOutfit && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* 1. Name & Popularity */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '600' }}>Outfit Name</label>
                      <input
                        type="text"
                        value={selectedOutfit.outfit_name}
                        onChange={(e) => updateOutfit('outfit_name', e.target.value)}
                        style={{
                          width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                          color: '#fff', fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '600' }}>Popularity ({(selectedOutfit.forecasted_popularity * 100).toFixed(0)}%)</label>
                      <input
                        type="range" min="0" max="1" step="0.01"
                        value={selectedOutfit.forecasted_popularity}
                        onChange={(e) => updateOutfit('forecasted_popularity', parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: THEME.success }}
                      />
                    </div>
                  </div>

                  {/* 2. Description & Target Market */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '600' }}>Description</label>
                    <textarea
                      className="no-scrollbar"
                      value={selectedOutfit.outfit_description}
                      onChange={(e) => updateOutfit('outfit_description', e.target.value)}
                      rows={3}
                      style={{
                        width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                        color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', resize: 'vertical'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '600' }}>Target Market</label>
                    <textarea
                      className="no-scrollbar"
                      value={selectedOutfit.target_market_alignment}
                      onChange={(e) => updateOutfit('target_market_alignment', e.target.value)}
                      rows={2}
                      style={{
                        width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                        color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* 3. Metrics & Tags */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Metrics */}
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Fashion Metrics</h4>
                      {['Formality', 'Trendiness', 'Boldness', 'Wearability'].map(metric => (
                        <div key={metric} style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{metric}</span>
                            <span style={{ color: '#fff' }}>{((selectedOutfit.fashion_metrics?.[metric] || 0) * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range" min="0" max="1" step="0.05"
                            value={selectedOutfit.fashion_metrics?.[metric] || 0}
                            onChange={(e) => updateMetrics(metric, parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: '#a888ff', height: '4px' }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Style Tags</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                        {selectedOutfit.style_tags?.map((tag, i) => (
                          <span key={i} style={{
                            padding: '4px 8px', borderRadius: '4px',
                            background: 'rgba(255,255,255,0.1)',
                            fontSize: '11px', color: '#fff',
                            display: 'flex', alignItems: 'center', gap: '6px'
                          }}>
                            {tag}
                            <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0, fontSize: '14px' }}>×</button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="+ Add tag (Enter)"
                        onKeyDown={handleTagAdd}
                        style={{
                          width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                          color: '#fff', fontSize: '12px'
                        }}
                      />
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      );
    };

    return <EditWrapper />;
  };

  const renderGenericData = (data) => {
    return (
      <div style={{ padding: '16px', color: THEME.textPrimary }}>
        <pre style={{
          background: THEME.subtleCardBg,
          padding: '16px',
          borderRadius: '8px',
          fontSize: '12px',
          overflow: 'auto',
          maxHeight: '500px',
          color: THEME.textPrimary
        }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  const availableTasks = completedNodes.length > 0
    ? completedNodes
    : (activeNode ? [activeNode] : []);

  return (
    <div style={{
      // display: 'flex',
      // height: '600px',
      // border: `1px solid ${THEME.borderColor}`,
      // borderRadius: '10px',
      overflow: 'hidden',
      // background: THEME.bgPrimary,
      backdropFilter: 'blur(6px)',
      color: THEME.textPrimary
    }}>
      {/* Data Display Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedTask ? (
          <>
            {/* Header */}
            <div style={{
              // padding: '16px',
              // borderBottom: `1px solid ${THEME.borderColor}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              // background : THEME.bgSecondary,
              color: THEME.textPrimary
            }}>
              <div style={{ fontWeight: '600', fontSize: '16px' }}>
                {TASK_LABELS[selectedTask] || selectedTask}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {!isEditing ? (
                  <button
                    onClick={handleEditClick}
                    style={{
                      padding: '8px 16px',
                      background: THEME.accentLink,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      style={{
                        padding: '8px 16px',
                        background: THEME.success,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Save size={14} />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      style={{
                        padding: '8px 16px',
                        background: THEME.textSecondary,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Data Content */}
            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
              {isEditing ? (
                selectedTask === 'data_collector' ? (
                  renderDataCollectorEdit(editedData, setEditedData)
                ) : selectedTask === 'video_analyzer' ? (
                  renderVideoAnalyzerEdit(editedData, setEditedData)
                ) : selectedTask === 'content_analyzer' ? (
                  renderContentAnalyzerEdit(editedData, setEditedData)
                ) : selectedTask === 'trend_processor' ? (
                  renderTrendProcessorEdit(editedData, setEditedData)
                ) : selectedTask === 'outfit_designer' ? (
                  renderOutfitDesignerEdit(editedData, setEditedData)
                ) : (
                  <textarea
                    value={JSON.stringify(editedData, null, 2)}
                    onChange={(e) => handleJsonEdit(e.target.value)}
                    style={{
                      width: '100%',
                      height: '100%',
                      padding: '16px',
                      border: 'none',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      resize: 'none',
                      background: THEME.subtleCardBg,
                      color: THEME.textPrimary
                    }}
                  />
                )
              ) : (
                renderTaskData(selectedTask, taskData[selectedTask])
              )}
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: THEME.textSecondary,
            fontSize: '14px'
          }}>
            Select a task to view its data
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDataViewer;
