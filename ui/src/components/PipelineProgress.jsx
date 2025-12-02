import { useState } from 'react'; // <--- Add this
import { CheckCircle, Circle, Loader, XCircle, AlertCircle } from 'lucide-react';

const STAGES = [
  { id: 'data_collector', label: 'Anaya (Data Collector Agent)', index: 1 },
  { id: 'video_analyzer', label: 'Maya (Video Analyzer Agent)', index: 2 },
  { id: 'content_analyzer', label: 'Riya (Content Analyzer Agent)', index: 3 },
  { id: 'trend_processor', label: 'Kavya (Trend Processor Agent)', index: 4 },
  { id: 'outfit_designer', label: 'Priya (Outfit Designer Agent)', index: 5 },
  { id: 'video_generation', label: 'Zara (Video Generation Agent)', index: 6 },
];

const PipelineProgress = ({ activeNode, completedNodes = [], failedNodes = [], onStageClick, selectedTask }) => {
  const [hoveredStage, setHoveredStage] = useState(null); // <--- New State

  const getStageStatus = (stageId) => {
    if (failedNodes.includes(stageId)) return 'failed';
    if (completedNodes.includes(stageId)) return 'completed';
    if (activeNode === stageId) return 'active';
    return 'pending';
  };

  const getStageIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} style={{ color: '#4ad295', filter: 'drop-shadow(0 0 4px rgba(74, 210, 149, 0.5))' }} />;
      case 'active':
        return <Loader size={20} style={{ color: '#a888ff', animation: 'spin 1.5s linear infinite' }} />;
      case 'failed':
        return <XCircle size={20} style={{ color: '#ef4444' }} />;
      default:
        return <Circle size={20} style={{ color: 'rgba(255, 255, 255, 0.2)' }} />;
    }
  };

  const getStageStyle = (status, isHovered, isSelected) => { // <--- Add isSelected
    const baseStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px',
      borderRadius: '12px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      marginBottom: '12px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      background: 'rgba(255, 255, 255, 0.02)',
      backdropFilter: 'blur(10px)',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'pointer'
    };

    let style = { ...baseStyle };

    switch (status) {
      case 'completed':
        style = { 
          ...style, 
          background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)',
          borderColor: 'rgba(16, 185, 129, 0.3)',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)',
        };
        break;
      case 'active':
        style = { 
          ...style, 
          background: 'linear-gradient(90deg, rgba(124, 92, 255, 0.15) 0%, rgba(124, 92, 255, 0.05) 100%)',
          borderColor: '#7c5cff',
          boxShadow: '0 0 20px rgba(124, 92, 255, 0.25), inset 0 0 10px rgba(124, 92, 255, 0.1)',
          transform: 'scale(1.02)',
          zIndex: 1
        };
        break;
      case 'failed':
        style = { 
          ...style, 
          background: 'rgba(239, 68, 68, 0.1)',
          borderColor: '#ef4444',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
        };
        break;
      default:
        break;
    }

    // Hover Effects
    if (isHovered && status !== 'active') {
      style.transform = 'translateY(-2px)';
      style.background = 'rgba(255, 255, 255, 0.05)';
      style.borderColor = 'rgba(124, 92, 255, 0.5)';
      style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
    }

    // 3. Selected State (Highest Priority)
    if (isSelected) {
      style.borderColor = '#ffffff'; // White border
      style.background = 'rgba(255, 255, 255, 0.08)'; // Slightly lighter background
      style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.5), 0 8px 24px rgba(0,0,0,0.3)'; // Double border effect
      style.transform = 'scale(1.02)';
    }

    return style;
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
        Pipeline Progress
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {STAGES.map((stage) => {
          const status = getStageStatus(stage.id);
          const isHovered = hoveredStage === stage.id;
          const isSelected = selectedTask === stage.id; // <--- Check if selected

          return (
            <div key={stage.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => typeof onStageClick === 'function' && onStageClick(stage.id)}
                onMouseEnter={() => setHoveredStage(stage.id)}
                onMouseLeave={() => setHoveredStage(null)}
                style={getStageStyle(status, isHovered, isSelected)} // <--- Pass isSelected
              >
                {/* ... content ... */}
                <div style={{ flexShrink: 0 }}>
                  {getStageIcon(status)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', color: "#ecefffb8", fontWeight: (status === 'active' || isSelected) ? '600' : '500' }}> {/* Bold if selected */}
                    {stage.label}
                  </div>
                  {/* ... status text ... */}
                  {status === 'active' && <div style={{ fontSize: '12px', color: '#ecefffb8', marginTop: '4px' }}>Processing...</div>}
                  {status === 'failed' && <div style={{ fontSize: '12px', color: '#ecefffb8', marginTop: '4px' }}>Failed - Check errors below</div>}
                  {status === 'completed' && <div style={{ fontSize: '12px', color: '#ecefffb8', marginTop: '4px' }}>Completed</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineProgress;
