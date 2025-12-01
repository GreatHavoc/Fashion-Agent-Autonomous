// TaskDataViewer.jsx
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Edit2, Save, X } from 'lucide-react';
import { saveStateThenStream } from '../utils/apiClient';
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

const TaskDataViewer = ({
  completedNodes,
  activeNode,
  taskData,
  onUpdateData,
  onSaveChanges,
  // new props:
  selectedTask: externalSelectedTask = "data_collector",
  onSelectTask = null,
  allowLocalSelection = true, // when false, sidebar items won't change selection
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
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData(null);
  };

  // inside TaskDataViewer component (replace existing handleSaveEdit)
  const handleSaveEdit = async () => {
    if (!selectedTask || !editedData) return;

    // If parent passed onSaveChanges, call it (keeps UI state consistent)
    if (onSaveChanges) {
      try {
        // parent can persist locally first
        await onSaveChanges(selectedTask, editedData);
      } catch (err) {
        console.error("onSaveChanges failed:", err);
      }
    }

    // Prepare values array the state API expects.
    const valuesPayload = [[editedData]];

    // Determine threadId: prefer prop, fallback env var
    const effectiveThreadId = (typeof props !== 'undefined' && props?.threadId) || process.env.REACT_APP_THREAD_ID;
    if (!effectiveThreadId) {
      console.warn("No threadId available. Provide threadId prop to TaskDataViewer to call LangGraph APIs.");
      setIsEditing(false);
      setEditedData(null);
      return;
    }

    try {
      const { reader, checkpoint } = await saveStateThenStream({
        threadId: effectiveThreadId,
        values: valuesPayload,
        as_node: "__copy__",
        assistant_id: "fe096781-5601-53d2-b2f6-0d3403f7e9ca",
      });

      console.log("Checkpoint received:", checkpoint);

      const streamDecoder = new TextDecoder();
      const readLoop = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          try {
            const text = streamDecoder.decode(value, { stream: true });
            console.log("stream chunk:", text);
          } catch (e) {
            console.error("Error decoding stream chunk", e);
          }
        }
        console.log("Stream finished");
      };

      readLoop().catch(e => console.error("Stream read error", e));

      setIsEditing(false);
      setEditedData(null);
    } catch (err) {
      console.error("Error saving state and streaming:", err);
      alert(`Save failed: ${err.message || err}`);
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
        return renderOutfitDesignerData(data);
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
    const urls = data.data_urls || [];

    return (
      <div style={{ padding: '16px', color: THEME.textPrimary }}>
        <div style={{ marginBottom: '16px' }}>
          <strong>Total URLs Collected: {urls.length}</strong>
        </div>

        {urls.map((item, index) => (
          <div key={index} style={{ ...itemCardStyle }}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: THEME.textPrimary }}>
              {item.title}
            </div>
            <div style={{ fontSize: '13px', color: THEME.textSecondary, marginBottom: '4px' }}>
              <strong>URL:</strong>{' '}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: THEME.accentLink, textDecoration: 'underline' }}
              >
                {item.url}
              </a>
            </div>
            <div style={{ fontSize: '13px', color: THEME.textSecondary, marginBottom: '4px' }}>
              <strong>Author:</strong> {item.author} | <strong>Date:</strong> {item.date}
            </div>
            <div style={{ fontSize: '13px', color: THEME.textSecondary, marginBottom: '8px' }}>
              <strong>Category:</strong> {item.category}
            </div>
            <div style={{ fontSize: '13px', marginTop: '8px', color: THEME.textPrimary }}>
              {item.excerpt}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderVideoAnalyzerData = (data) => {
    const videos = data.video_analysis || [];

    return (
      <div style={{ padding: '16px', color: THEME.textPrimary }}>
        {videos.map((videoData, index) => {
          const results = videoData.per_video_results || [];

          return results.map((result, vIndex) => (
            <div key={`${index}-${vIndex}`}>
              <div style={{ marginBottom: '16px' }}>
                <strong>Video URL:</strong>{' '}
                <a href={result.video_url} target="_blank" rel="noopener noreferrer" style={{ color: THEME.accentLink }}>
                  {result.video_url}
                </a>
              </div>

              {/* Trend Identification */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    cursor: 'pointer',
                    fontWeight: '600',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: THEME.textPrimary
                  }}
                  onClick={() => toggleSection(`trends-${index}-${vIndex}`)}
                >
                  {expandedSections[`trends-${index}-${vIndex}`] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  Trend Identification
                </div>

                {expandedSections[`trends-${index}-${vIndex}`] && result.trend_identification && (
                  <div style={{ paddingLeft: '24px' }}>
                    {/* Silhouettes */}
                    {result.trend_identification.silhouette_trends && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>Top Silhouettes:</div>
                        {result.trend_identification.silhouette_trends.slice(0, 5).map((item, i) => (
                          <div key={i} style={{ fontSize: '13px', marginLeft: '12px', color: THEME.textPrimary }}>
                            • {item.name} (frequency: {item.frequency})
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Colors */}
                    {result.trend_identification.popular_colors && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>Popular Colors:</div>
                        {result.trend_identification.popular_colors.slice(0, 5).map((item, i) => (
                          <div key={i} style={{ fontSize: '13px', marginLeft: '12px', color: THEME.textPrimary }}>
                            • {item.name} (frequency: {item.frequency})
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Fabrics */}
                    {result.trend_identification.trending_fabrics && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>Trending Fabrics:</div>
                        {result.trend_identification.trending_fabrics.slice(0, 5).map((item, i) => (
                          <div key={i} style={{ fontSize: '13px', marginLeft: '12px', color: THEME.textPrimary }}>
                            • {item.name} (frequency: {item.frequency})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Collection Analysis */}
              {result.collection_analysis && (
                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      cursor: 'pointer',
                      fontWeight: '600',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: THEME.textPrimary
                    }}
                    onClick={() => toggleSection(`collection-${index}-${vIndex}`)}
                  >
                    {expandedSections[`collection-${index}-${vIndex}`] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    Collection Analysis
                  </div>

                  {expandedSections[`collection-${index}-${vIndex}`] && (
                    <div style={{ paddingLeft: '24px', fontSize: '13px', color: THEME.textPrimary }}>
                      <div><strong>Number of Looks:</strong> {result.collection_analysis.number_of_looks}</div>
                      <div style={{ marginTop: '8px' }}>
                        <strong>Dominant Themes:</strong>
                        <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                          {result.collection_analysis.dominant_themes?.map((theme, i) => (
                            <li key={i}>{theme}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ));
        })}
      </div>
    );
  };

  const renderContentAnalyzerData = (data) => {
    const analysis = data.content_analysis || [];

    return (
      <div style={{ padding: '16px', color: THEME.textPrimary }}>
        {analysis.map((contentData, index) => {
          const findings = contentData.per_url_findings || [];

          return (
            <div key={index}>
              {/* Enhanced Thesis */}
              {contentData.enhanced_thesis && (
                <div style={{
                  padding: '16px',
                  background: THEME.subtleCardBg,
                  borderRadius: '8px',
                  marginBottom: '16px',
                  // border: `1px solid ${THEME.borderColor}`,
                  color: THEME.textPrimary
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px' }}>Enhanced Thesis</div>
                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                    {contentData.enhanced_thesis}
                  </div>
                </div>
              )}

              {/* Per URL Findings */}
              {findings.map((finding, fIndex) => (
                <div key={fIndex} style={{ ...itemCardStyle }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                    {finding.title}
                  </div>

                  <div style={{ fontSize: '13px', marginBottom: '12px', color: THEME.textPrimary }}>
                    {finding.summary}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', color: THEME.textPrimary }}>
                    <div>
                      <strong>Micro Trends:</strong>
                      <div style={{ marginLeft: '12px', marginTop: '4px', color: THEME.textSecondary }}>
                        {finding.micro_trends?.join(', ')}
                      </div>
                    </div>

                    <div>
                      <strong>Colors:</strong>
                      <div style={{ marginLeft: '12px', marginTop: '4px', color: THEME.textSecondary }}>
                        {finding.colors?.join(', ')}
                      </div>
                    </div>

                    <div>
                      <strong>Silhouettes:</strong>
                      <div style={{ marginLeft: '12px', marginTop: '4px', color: THEME.textSecondary }}>
                        {finding.silhouettes?.join(', ')}
                      </div>
                    </div>

                    <div>
                      <strong>Evidence Strength:</strong>
                      <div style={{ marginLeft: '12px', marginTop: '4px', color: THEME.textSecondary }}>
                        {(finding.evidence_strength * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTrendProcessorData = (data) => {
    const trendAnalysis = data.final_processor?.trend_analysis;

    if (!trendAnalysis) {
      return (
        <div style={{ padding: '20px', color: THEME.textSecondary, textAlign: 'center' }}>
          No trend analysis available yet
        </div>
      );
    }

    return (
      <div style={{ padding: '16px', color: THEME.textPrimary }}>
        {/* Summary Card */}
        <div style={{
          padding: '16px',
          background: THEME.subtleCardBg,
          borderRadius: '8px',
          marginBottom: '16px',
          // border: `1px solid ${THEME.borderColor}`,
          color: THEME.textPrimary
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '16px' }}>
            Analysis Summary
          </div>
          <div style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '12px' }}>
            {data.final_processor.analysis_summary}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <div style={smallStatBoxStyle}>
              <div style={{ fontSize: '12px', color: THEME.textSecondary }}>Sources Analyzed</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: THEME.accentLink }}>
                {trendAnalysis.total_sources_analyzed}
              </div>
            </div>
            <div style={smallStatBoxStyle}>
              <div style={{ fontSize: '12px', color: THEME.textSecondary }}>Analysis Date</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: THEME.accentLink }}>
                {trendAnalysis.analysis_date}
              </div>
            </div>
            <div style={smallStatBoxStyle}>
              <div style={{ fontSize: '12px', color: THEME.textSecondary }}>Confidence Score</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: THEME.accentLink }}>
                {(data.final_processor.overall_confidence_score * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        {/* Color Trends */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              cursor: 'pointer',
              fontWeight: '600',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: THEME.textPrimary
            }}
            onClick={() => toggleSection('color-trends')}
          >
            {expandedSections['color-trends'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Dominant Color Trends ({trendAnalysis.dominant_color_trends?.length || 0})
          </div>

          {expandedSections['color-trends'] && trendAnalysis.dominant_color_trends && (
  <div style={{ paddingLeft: '24px' }}>
    {trendAnalysis.dominant_color_trends.slice(0, 10).map((color, i) => (
      <div key={i} style={{
        padding: '12px',
        marginBottom: '8px',
        background: THEME.cardBg,
        borderRadius: '6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: `1px solid ${THEME.borderColor}`,
        color: THEME.textPrimary
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600' }}>{color.name}</div>
          <div style={{ fontSize: '12px', color: THEME.textSecondary }}>
            Pantone: {color.pantone_code} | Frequency: {color.frequency}
          </div>

          {/* Sources list (small chips) */}
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Array.isArray(color.source_urls) && color.source_urls.slice(0, 6).map((url, sidx) => (
              <a
                key={sidx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title={url}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 8px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  border: `1px solid ${THEME.borderColor}`,
                  background: THEME.subtleCardBg,
                  color: THEME.textSecondary,
                  fontSize: 12,
                  minWidth: 36,
                  maxWidth: 280,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {renderSourceIcon(url, 14)}
                <span style={{ display: 'inline-block', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {/* short label for readability */}
                  {isYouTubeUrl(url) ? 'YouTube' : isImageUrl(url) ? 'Image' : new URL(url).hostname}
                </span>
              </a>
            ))}

            {/* if there are more sources, show a compact "+N" chip */}
            {Array.isArray(color.source_urls) && color.source_urls.length > 6 && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 8px',
                borderRadius: 6,
                border: `1px dashed ${THEME.borderColor}`,
                background: THEME.mutedBg,
                color: THEME.textSecondary,
                fontSize: 12
              }}>
                +{color.source_urls.length - 6} more
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 12 }}>
          <span style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500',
            backgroundColor: color.trend_direction === 'rising' ? THEME.okBg : THEME.mutedBg,
            color: color.trend_direction === 'rising' ? THEME.success : THEME.textSecondary
          }}>
            {color.trend_direction}
          </span>
          <span style={{ fontSize: '14px', fontWeight: '600' }}>
            {(color.confidence_score * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    ))}
  </div>
)}
        </div>

        {/* Style Trends */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              cursor: 'pointer',
              fontWeight: '600',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: THEME.textPrimary
            }}
            onClick={() => toggleSection('style-trends')}
          >
            {expandedSections['style-trends'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Style Trends ({trendAnalysis.style_trends?.length || 0})
          </div>

          {expandedSections['style-trends'] && trendAnalysis.style_trends && (
            <div style={{ paddingLeft: '24px' }}>
              {trendAnalysis.style_trends.map((style, i) => (
                <div key={i} style={{
                  padding: '12px',
                  marginBottom: '12px',
                  background: THEME.cardBg,
                  borderRadius: '6px',
                  border: `1px solid ${THEME.borderColor}`,
                  color: THEME.textPrimary
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>{style.trend_name}</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: style.trend_direction === 'rising' ? THEME.okBg : THEME.mutedBg,
                        color: style.trend_direction === 'rising' ? THEME.success : THEME.textSecondary
                      }}>
                        {style.trend_direction}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>
                        {(style.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: THEME.textSecondary, marginBottom: '8px' }}>
                    {style.description}
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    <strong>Key Pieces:</strong> {style.key_pieces?.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Material Trends */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              cursor: 'pointer',
              fontWeight: '600',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: THEME.textPrimary
            }}
            onClick={() => toggleSection('material-trends')}
          >
            {expandedSections['material-trends'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Material Trends ({trendAnalysis.material_trends?.length || 0})
          </div>

          {expandedSections['material-trends'] && trendAnalysis.material_trends && (
            <div style={{ paddingLeft: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {trendAnalysis.material_trends.map((material, i) => (
                <div key={i} style={{
                  padding: '10px',
                  background: THEME.cardBg,
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: THEME.textPrimary
                }}>
                  <div style={{ fontWeight: '600' }}>{material.material}</div>
                  <div style={{ color: THEME.textSecondary }}>
                    Frequency: {material.frequency} | {material.trend_direction}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Silhouette Trends */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              cursor: 'pointer',
              fontWeight: '600',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: THEME.textPrimary
            }}
            onClick={() => toggleSection('silhouette-trends')}
          >
            {expandedSections['silhouette-trends'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Silhouette Trends ({trendAnalysis.silhouette_trends?.length || 0})
          </div>

          {expandedSections['silhouette-trends'] && trendAnalysis.silhouette_trends && (
            <div style={{ paddingLeft: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {trendAnalysis.silhouette_trends.map((silhouette, i) => (
                <div key={i} style={{
                  padding: '10px',
                  background: THEME.cardBg,
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: THEME.textPrimary
                }}>
                  <div style={{ fontWeight: '600' }}>{silhouette.silhouette}</div>
                  <div style={{ color: THEME.textSecondary }}>
                    Frequency: {silhouette.frequency} | {silhouette.trend_direction}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Predicted Next Season Trends */}
        {trendAnalysis.predicted_next_season_trends && (
          <div style={{
            padding: '16px',
            background: THEME.mutedBg,
            borderRadius: '8px',
            // border: `1px solid ${THEME.borderColor}`,
            color: THEME.textPrimary
          }}>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>
              Predicted Next Season Trends
            </div>
            <ul style={{ marginLeft: '20px', fontSize: '13px', lineHeight: '1.8', color: THEME.textPrimary }}>
              {trendAnalysis.predicted_next_season_trends.map((trend, i) => (
                <li key={i}>{trend}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderOutfitDesignerData = (data) => {
    const outfits = data.outfit_designs || [];

    if (outfits.length === 0) {
      return (
        <div style={{ padding: '20px', color: THEME.textSecondary, textAlign: 'center' }}>
          No outfit designs available yet
        </div>
      );
    }

    return (
      <div style={{ padding: '16px', color: THEME.textPrimary }}>
        {outfits.map((designGroup, index) => {
          const designs = designGroup.Outfits || [];

          return designs.map((outfit, oIndex) => (
            <div key={`${index}-${oIndex}`} style={{
              padding: '16px',
              marginBottom: '16px',
              background: THEME.cardBg,
              // borderRadius: '8px',
              // border: `1px solid ${THEME.borderColor}`,
              color: THEME.textPrimary
            }}>
              <div style={{ fontWeight: '600', fontSize: '18px', marginBottom: '12px', color: THEME.accentLink }}>
                {outfit.outfit_name}
              </div>

              {outfit.saved_image_path && (
                <div style={{ marginBottom: '16px' }}>
                  <img
                    src={outfit.saved_image_path}
                    alt={outfit.outfit_name}
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      borderRadius: '8px',
                      border: `2px solid ${THEME.borderColor}`
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div style={{ fontSize: '14px', marginBottom: '16px', lineHeight: '1.6', color: THEME.textPrimary }}>
                {outfit.outfit_description}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '10px', background: THEME.subtleCardBg, borderRadius: '6px', color: THEME.textPrimary }}>
                  <div style={{ fontSize: '12px', color: THEME.textSecondary, marginBottom: '4px' }}>Season</div>
                  <div style={{ fontWeight: '600' }}>{outfit.season}</div>
                </div>
                <div style={{ padding: '10px', background: THEME.subtleCardBg, borderRadius: '6px', color: THEME.textPrimary }}>
                  <div style={{ fontSize: '12px', color: THEME.textSecondary, marginBottom: '4px' }}>Occasion</div>
                  <div style={{ fontWeight: '600' }}>{outfit.occasion}</div>
                </div>
                <div style={{ padding: '10px', background: THEME.subtleCardBg, borderRadius: '6px', color: THEME.textPrimary }}>
                  <div style={{ fontSize: '12px', color: THEME.textSecondary, marginBottom: '4px' }}>Popularity</div>
                  <div style={{ fontWeight: '600', color: THEME.success }}>
                    {(outfit.forecasted_popularity * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Fashion Metrics */}
              {outfit.fashion_metrics && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
                    Fashion Metrics
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {Object.entries(outfit.fashion_metrics).map(([key, value]) => (
                      <div key={key} style={{ fontSize: '13px', color: THEME.textPrimary }}>
                        <div style={{ color: THEME.textSecondary }}>{key}</div>
                        <div style={{
                          height: '8px',
                          background: THEME.mutedBg,
                          borderRadius: '4px',
                          overflow: 'hidden',
                          marginTop: '4px'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${value * 100}%`,
                            background: THEME.accentLink
                          }} />
                        </div>
                        <div style={{ fontWeight: '600', marginTop: '2px' }}>
                          {(value * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Colors */}
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '14px' }}>Colors:</strong>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {outfit.dominant_colors?.map((color, i) => (
                    <span key={i} style={{
                      padding: '6px 12px',
                      background: THEME.mutedBg,
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: THEME.textSecondary
                    }}>
                      {color}
                    </span>
                  ))}
                </div>
              </div>

              {/* Style Tags */}
              {outfit.style_tags && (
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ fontSize: '14px' }}>Style Tags:</strong>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {outfit.style_tags.map((tag, i) => (
                      <span key={i} style={{
                        padding: '4px 10px',
                        background: THEME.subtleCardBg,
                        // borderRadius: '4px',
                        fontSize: '12px',
                        // border: `1px solid ${THEME.borderColor}`,
                        color: THEME.textPrimary
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Trend Incorporation */}
              {outfit.trend_incorporation && (
                <div>
                  <strong style={{ fontSize: '14px' }}>Trend Incorporation:</strong>
                  <ul style={{ marginLeft: '20px', marginTop: '8px', fontSize: '13px', lineHeight: '1.6', color: THEME.textPrimary }}>
                    {outfit.trend_incorporation.map((trend, i) => (
                      <li key={i}>{trend}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Target Market Alignment */}
              {outfit.target_market_alignment && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: THEME.okBg,
                  borderRadius: '6px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: THEME.textPrimary
                }}>
                  <strong>Target Market:</strong> {outfit.target_market_alignment}
                </div>
              )}
            </div>
          ));
        })}
      </div>
    );
  };

  const renderVideoGenerationData = (data) => {
    const outfitVideos = data.outfit_videos || [];

    if (outfitVideos.length === 0) {
      return (
        <div style={{ padding: '20px', color: THEME.textSecondary, textAlign: 'center' }}>
          No video generation data available yet
        </div>
      );
    }

    return (
      <div style={{ padding: '16px', color: THEME.textPrimary }}>
        {outfitVideos.map((videoGroup, groupIndex) => (
          <div key={groupIndex}>
            {/* Summary Stats */}
            <div style={{
              padding: '16px',
              background: THEME.subtleCardBg,
              // borderRadius: '8px',
              marginBottom: '16px',
              // border: `1px solid ${THEME.borderColor}`,
              color: THEME.textPrimary
            }}>
              <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '16px' }}>
                Video Generation Summary
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                <div style={smallStatBoxStyle}>
                  <div style={{ fontSize: '12px', color: THEME.textSecondary }}>Total Processed</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: THEME.accentLink }}>
                    {videoGroup.total_outfits_processed}
                  </div>
                </div>
                <div style={smallStatBoxStyle}>
                  <div style={{ fontSize: '12px', color: THEME.textSecondary }}>Successful</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: THEME.success }}>
                    {videoGroup.successful_videos}
                  </div>
                </div>
                <div style={smallStatBoxStyle}>
                  <div style={{ fontSize: '12px', color: THEME.textSecondary }}>Failed</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: videoGroup.failed_videos > 0 ? THEME.danger : THEME.success }}>
                    {videoGroup.failed_videos}
                  </div>
                </div>
                <div style={smallStatBoxStyle}>
                  <div style={{ fontSize: '12px', color: THEME.textSecondary }}>Total Time</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: THEME.accentLink }}>
                    {(videoGroup.total_processing_time / 60).toFixed(1)}m
                  </div>
                </div>
              </div>
            </div>

            {/* Video Results */}
            <div>
              <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '14px' }}>
                Video Results ({videoGroup.video_results?.length || 0})
              </div>

              {videoGroup.video_results?.map((video, videoIndex) => (
                <div key={videoIndex} style={{
                  padding: '16px',
                  marginBottom: '16px',
                  background: THEME.cardBg,
                  // borderRadius: '8px',
                  // border: `1px solid ${THEME.borderColor}`,
                  color: THEME.textPrimary
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '15px', color: THEME.accentLink }}>
                        {video.outfit_id}
                      </div>
                      <div style={{ fontSize: '12px', color: THEME.textSecondary, marginTop: '4px' }}>
                        Generation: {video.generation_time?.toFixed(1)}s | Duration: {video.video_duration}s
                      </div>
                    </div>
                    <div style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: video.generation_success ? THEME.okBg : "rgba(255,228,228,0.06)",
                      color: video.generation_success ? THEME.success : THEME.danger
                    }}>
                      {video.generation_success ? '✓ Success' : '✗ Failed'}
                    </div>
                  </div>

                  {/* Video Player */}
                  {video.generation_success && video.output_video_path && (
                    <div style={{ marginBottom: '12px' }}>
                      <video
                        width="100%"
                        height="auto"
                        controls
                        style={{
                          borderRadius: '6px',
                          border: `2px solid ${THEME.borderColor}`,
                          backgroundColor: '#000'
                        }}
                      >
                        <source src={video.output_video_path} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}

                  {/* Error Message */}
                  {!video.generation_success && video.error_message && (
                    <div style={{
                      padding: '12px',
                      background: "rgba(255,230,230,0.04)",
                      borderRadius: '6px',
                      border: `1px solid rgba(252,165,165,0.18)`,
                      fontSize: '13px',
                      color: THEME.danger,
                      marginBottom: '12px'
                    }}>
                      <strong>Error:</strong> {video.error_message}
                    </div>
                  )}

                  {/* Video Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '13px', color: THEME.textPrimary }}>
                    <div style={{ padding: '8px', background: THEME.subtleCardBg, borderRadius: '4px' }}>
                      <div style={{ color: THEME.textSecondary }}>Format</div>
                      <div style={{ fontWeight: '600' }}>{video.video_format?.toUpperCase()}</div>
                    </div>
                    <div style={{ padding: '8px', background: THEME.subtleCardBg, borderRadius: '4px' }}>
                      <div style={{ color: THEME.textSecondary }}>Duration</div>
                      <div style={{ fontWeight: '600' }}>{video.video_duration}s</div>
                    </div>
                    <div style={{ padding: '8px', background: THEME.subtleCardBg, borderRadius: '4px' }}>
                      <div style={{ color: THEME.textSecondary }}>Input Image</div>
                      <div style={{ fontWeight: '600', fontSize: '11px', wordBreak: 'break-word' }}>
                        {video.input_image_path?.split('\\').pop()}
                      </div>
                    </div>
                  </div>

                  {/* Video Path */}
                  {video.output_video_path && (
                    <div style={{ marginTop: '12px', fontSize: '12px' }}>
                      <div style={{ color: THEME.textSecondary, marginBottom: '4px' }}>Video Path:</div>
                      <div style={{
                        padding: '8px',
                        background: THEME.subtleCardBg,
                        borderRadius: '4px',
                        wordBreak: 'break-all',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        color: THEME.textPrimary
                      }}>
                        {video.output_video_path}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Output Directory */}
            {videoGroup.output_directory && (
              <div style={{
                padding: '12px',
                background: THEME.warnBg,
                borderRadius: '6px',
                border: `1px solid rgba(251,191,36,0.24)`,
                fontSize: '13px',
                color: THEME.textPrimary
              }}>
                <strong>Output Directory:</strong> {videoGroup.output_directory}
              </div>
            )}
          </div>
        ))}
      </div>
    );
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
      display: 'flex',
      height: '600px',
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
              padding: '16px',
              // borderBottom: `1px solid ${THEME.borderColor}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              // background: THEME.bgSecondary,
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
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {isEditing ? (
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
