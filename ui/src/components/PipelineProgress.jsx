import React from 'react';
import { CheckCircle, Circle, Loader, XCircle, AlertCircle } from 'lucide-react';

const STAGES = [
  { id: 'data_collector', label: 'Anaya (Data Collector Agent)', index: 1 },
  { id: 'video_analyzer', label: 'Maya (Video Analyzer Agent)', index: 2 },
  { id: 'content_analyzer', label: 'Riya (Content Analyzer Agent)', index: 3 },
  { id: 'trend_processor', label: 'Kavya (Trend Processor Agent)', index: 4 },
  { id: 'outfit_designer', label: 'Priya (Outfit Designer Agent)', index: 5 },
  { id: 'video_generation', label: 'Zara (Video Generation Agent)', index: 6 },
];

const PipelineProgress = ({ activeNode, completedNodes = [], failedNodes = [], onStageClick }) => {
  const getStageStatus = (stageId) => {
    if (failedNodes.includes(stageId)) return 'failed';
    if (completedNodes.includes(stageId)) return 'completed';
    if (activeNode === stageId) return 'active';
    return 'pending';
  };

  const getStageIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} style={{ color: '#ecefffb8' }} />;
      case 'active':
        return <Loader size={20} style={{ color: '#ecefffb8', animation: 'spin 1s linear infinite' }} />;
      case 'failed':
        return <XCircle size={20} style={{ color: '#ecefffb8' }} />;
      default:
        return <Circle size={20} style={{ color: '#ecefffb8' }} />;
    }
  };

  const getStageStyle = (status) => {
    const baseStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: '8px',
      transition: 'all 0.3s ease',
      marginBottom: '8px',
      border: '2px solid transparent',
    };

    switch (status) {
      case 'completed':
        return { ...baseStyle, backgroundColor: 'rgb(5 63 32)', borderColor: 'rgb(7 107 74)' };
      case 'active':
        return { ...baseStyle, backgroundColor: 'rgb(12 33 63)', borderColor: 'rgb(0 42 109)', fontWeight: '600' };
      case 'failed':
        return { ...baseStyle, backgroundColor: '#cca0a0ff', borderColor: '#ef4444' };
      default:
        return { ...baseStyle, backgroundColor: '#1a1d3499' };
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
        Pipeline Progress
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column' }}>
{STAGES.map((stage, index) => {
  const status = getStageStatus(stage.id);

  return (
    <div key={stage.id}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => typeof onStageClick === 'function' && onStageClick(stage.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') typeof onStageClick === 'function' && onStageClick(stage.id); }}
        style={{
          ...getStageStyle(status),
          cursor: typeof onStageClick === 'function' ? 'pointer' : 'default',
        }}
        aria-pressed={false}
        aria-label={`${stage.label} - ${status}`}
      >
        <div style={{ flexShrink: 0 }}>
          {getStageIcon(status)}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', color: "#ecefffb8", fontWeight: status === 'active' ? '600' : '500' }}>
            {stage.label}
          </div>

          {status === 'active' && (
            <div style={{ fontSize: '12px', color: '#ecefffb8', marginTop: '4px' }}>
              Processing...
            </div>
          )}

          {status === 'failed' && (
            <div style={{ fontSize: '12px', color: '#ecefffb8', marginTop: '4px' }}>
              Failed - Check errors below
            </div>
          )}

          {status === 'completed' && (
            <div style={{ fontSize: '12px', color: '#ecefffb8', marginTop: '4px' }}>
              Completed
            </div>
          )}
        </div>

        {/* <div style={{
          fontSize: '12px',
          color: '#ecefffb8',
          fontWeight: '500',
          minWidth: '30px',
          textAlign: 'right'
        }}>
          {stage.index}/6
        </div> */}
      </div>

      {/* Connector line */}
      {/* {index < STAGES.length - 1 && (
        <div style={{
          width: '2px',
          height: '12px',
          backgroundColor: completedNodes.includes(stage.id) ? '#10b981' : '#b1b8c5ff',
          marginLeft: '26px',
          transition: 'background-color 0.3s ease'
        }} />
      )} */}
    </div>
  );
})}

      </div>

      {/* Progress Summary */}
      {/* <div style={{ 
        marginTop: '20px', 
        padding: '12px', 
        backgroundColor: 'rgb(107, 114, 128)', 
        borderRadius: '8px',
        fontSize: '13px',
        color: '#000000ff'
      }}>
        <strong>{completedNodes.length}</strong> of {STAGES.length} agents completed
        {failedNodes.length > 0 && (
          <span style={{ color: '#ef4444', marginLeft: '8px' }}>
            • <strong>{failedNodes.length}</strong> failed
          </span>
        )}
      </div> */}
    </div>
  );
};

export default PipelineProgress;
