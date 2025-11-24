import React from 'react';
import { CheckCircle, Circle, Loader } from 'lucide-react';

const STAGES = [
    { id: 'data_collector', label: 'Anaya (Data Collector Agent)', index: 1 },
    { id: 'video_analyzer', label: 'Maya (Video Analyzer Agent)', index: 2 },
    { id: 'content_analyzer', label: 'Riya (Content Analyzer Agent)', index: 3 },
    { id: 'trend_processor', label: 'Kavya (Trend Processor Agent)', index: 4 },
    { id: 'outfit_designer', label: 'Priya (Outfit Designer Agent)', index: 5 },
    { id: 'video_generation', label: 'Zara (Video Generation Agent)', index: 6 },
    { id: 'final_report', label: 'Final Report & Video Showcase', index: 7 }
];

const PipelineProgress = ({ activeNode, completedNodes = [] }) => {
    return (
        <div className="stageboard__progress" id="progressBar">
            {STAGES.map((stage) => {
                const isActive = activeNode === stage.id;
                const isComplete = completedNodes.includes(stage.id);

                let statusClass = 'progress__chip';
                if (isActive) statusClass += ' active';
                if (isComplete) statusClass += ' complete';

                return (
                    <div key={stage.id} className={statusClass}>
                        <span className="progress__index">
                            {isComplete ? <CheckCircle size={14} /> : isActive ? <Loader size={14} className="spin" /> : stage.index}
                        </span>
                        <span className="progress__label">{stage.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default PipelineProgress;
