import React, { useState, useEffect, useRef } from 'react';
import { Play, Sparkles, AlertCircle, Loader, StopCircle } from 'lucide-react';
import UserInputForm from './UserInputForm';
import OutfitReviewForm from './OutfitReviewForm';
import MessageList from './MessageList';
import './FashionAgentUI.css';
import { createThread, streamRun, resumeRun, getThreadState, updateState, cancelRun, listRuns, APIError } from '../utils/apiClient';
import ThoughtProcess from './ThoughtProcess';
import OutfitCard from './OutfitCard';
import DynamicForm from './DynamicForm';
import PipelineProgress from './PipelineProgress';

const FashionAgentUI = () => {
  const [threadId, setThreadId] = useState(null);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentInterrupt, setCurrentInterrupt] = useState(null);
  const [interruptType, setInterruptType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [interruptHistory, setInterruptHistory] = useState([]);
  const [resumeAttempts, setResumeAttempts] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamMessages, setStreamMessages] = useState([]);
  const [currentState, setCurrentState] = useState('idle');
  const [lastNode, setLastNode] = useState(null);
  const [activeNode, setActiveNode] = useState(null);
  const [completedNodes, setCompletedNodes] = useState([]);

  const streamReaderRef = useRef(null);

  useEffect(() => {
    return () => {
      if (streamReaderRef.current) {
        streamReaderRef.current.cancel();
      }
    };
  }, []);

  const addMessage = (type, content, details = null) => {
    setMessages(prev => [...prev, {
      type,
      content,
      details,
      timestamp: new Date().toISOString()
    }]);
  };

  const addStreamMessage = (event, data) => {
    setStreamMessages(prev => [...prev, {
      event,
      data,
      timestamp: new Date().toISOString()
    }]);
  };

  const handleStreamEvent = (event) => {
    if (event.event === 'on_chain_start') {
      if (event.name && event.name !== 'LangGraph') {
        setActiveNode(event.name);
      }
    } else if (event.event === 'on_chain_end') {
      if (event.name && event.name !== 'LangGraph') {
        console.log('Node completed:', event.name);
        setCompletedNodes(prev => [...new Set([...prev, event.name])]);
      }
    }

    // Capture specific events for the thought process
    if (['on_chain_start', 'on_chain_end', 'on_tool_start', 'on_tool_end'].includes(event.event)) {
      addStreamMessage(event.name || event.event, event.data?.input || event.data?.output);
    }

    // Check for explicit interrupt event or __interrupt__ key
    if (event.event === 'interrupt' || event.__interrupt__) {
      console.log('Interrupt detected:', event);

      let interruptValue;
      let interruptId = null;

      if (event.__interrupt__ && Array.isArray(event.__interrupt__) && event.__interrupt__.length > 0) {
        interruptValue = event.__interrupt__[0].value;
        interruptId = event.__interrupt__[0].id;
      } else {
        interruptValue = event.value;
      }

      // Determine interrupt type
      let type = 'generic';

      // Check node name if available
      const nodeName = event.name || '';

      if (nodeName.includes('human') || nodeName.includes('input')) {
        type = 'user_input';
      } else if (nodeName.includes('review') || nodeName.includes('critique')) {
        type = 'outfit_review';
      }

      if (interruptValue && typeof interruptValue === 'object') {
        if (interruptValue.type === 'human_review_node') {
          type = 'outfit_review';
        } else if (interruptValue.hasOwnProperty('query') || (interruptValue.message && typeof interruptValue.message === 'string' && interruptValue.message.toLowerCase().includes('query'))) {
          type = 'user_input';
        }
        // Fallback for the specific payload structure seen in logs
        if (interruptValue.instructions && interruptValue.instructions.custom_urls) {
          type = 'user_input';
        }
      }

      setInterruptType(type);
      setCurrentInterrupt({
        value: interruptValue,
        id: interruptId
      });
      setCurrentState('interrupted');
      setLoading(false);
      setIsStreaming(false);
    } else if (event.event === 'values') {
      // Check for execution_status in the state
      if (event.data && event.data.execution_status) {
        const status = event.data.execution_status;
        let newCompleted = [];

        // Handle both array and object formats for execution_status
        const statusKeys = Array.isArray(status) ? status : Object.keys(status);

        newCompleted = statusKeys.map(key => {
          // Normalize node names to match STAGES ids
          // e.g. "data_collector_node" -> "data_collector"
          // "Data Collector" -> "data_collector"
          let normalized = key.toLowerCase().replace(/ /g, '_').replace(/_node$/, '').replace(/_agent$/, '');
          return normalized;
        });

        setCompletedNodes(prev => [...new Set([...prev, ...newCompleted])]);
      }

      // Check for final output or intermediate updates
      if (event.data && event.data.final_output) {
        addMessage('success', 'Workflow Completed', event.data);
        setCurrentState('complete');
        setIsStreaming(false);
      }
    }
  };

  const processStream = async (reader) => {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.trim() && line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              handleStreamEvent(eventData);
            } catch (e) {
              console.warn('Failed to parse stream line:', line);
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer && buffer.trim() && buffer.startsWith('data: ')) {
        try {
          const eventData = JSON.parse(buffer.slice(6));
          handleStreamEvent(eventData);
        } catch (e) {
          console.warn('Failed to parse final stream line:', buffer);
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Stream processing error:', error);
        throw error;
      }
    }
  };

  const startAnalysis = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setMessages([]);
    setStreamMessages([]);
    setCompletedNodes([]);
    setActiveNode(null);
    setCurrentState('running');

    try {
      addMessage('info', 'Initializing Fashion Agent Pipeline...');
      const { thread_id } = await createThread();
      setThreadId(thread_id);
      addMessage('success', `Thread created: ${thread_id}`);

      setIsStreaming(true);
      streamReaderRef.current = await streamRun(thread_id, query);
      await processStream(streamReaderRef.current);

    } catch (error) {
      console.error('Analysis failed:', error);
      addMessage('error', `Analysis failed: ${error.message}`);
      setCurrentState('error');
      setIsStreaming(false);
    } finally {
      setLoading(false);
    }
  };

  const resumeWithUserInput = async (inputData) => {
    setLoading(true);
    try {
      addMessage('info', 'Resuming with user input...', inputData);

      const threadState = await getThreadState(threadId);
      const checkpoint = threadState.checkpoint;

      // If we have a specific interrupt ID, use it (not common in this simple setup but good practice)
      // For now, we just pass the input as the resume payload
      const resumeData = inputData;

      streamReaderRef.current = await resumeRun(threadId, checkpoint, resumeData);

      setIsStreaming(true);
      setCurrentInterrupt(null);
      setInterruptType(null);
      setCurrentState('running');

      await processStream(streamReaderRef.current);

    } catch (error) {
      console.error('Error resuming with user input:', error);
      addMessage('error', `Resume failed: ${error.message}`);
      setCurrentState('error');
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const resumeWithReview = async (reviewData, isRetry = false) => {
    setLoading(true);
    const currentAttempt = resumeAttempts + 1;
    setResumeAttempts(currentAttempt);
    try {
      const attemptLabel = isRetry ? ` (retry ${currentAttempt})` : '';
      addMessage('info', `Submitting outfit review${attemptLabel}...`, reviewData);

      const threadState = await getThreadState(threadId);
      const checkpoint = threadState.checkpoint;
      // const interruptId = currentInterrupt.id; 
      // For this agent, we typically resume with the data directly
      const resumeData = reviewData;

      streamReaderRef.current = await resumeRun(threadId, checkpoint, resumeData);

      setIsStreaming(true);
      setCurrentInterrupt(null);
      setInterruptType(null);
      setResumeAttempts(0);
      setCurrentState('running');

      await processStream(streamReaderRef.current);

    } catch (error) {
      console.error('Error resuming with review:', error);
      if (currentAttempt < 3) {
        addMessage('warning', `Resume attempt ${currentAttempt} failed: ${error.message}.`, error);
        setCurrentState('interrupted');
      } else {
        addMessage('error', `Resume failed: ${error.message}.`, error);
        setCurrentState('error');
      }
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const handleStop = async () => {
    if (!threadId) return;
    setLoading(true);
    try {
      addMessage('info', 'Stopping workflow...');
      const runs = await listRuns(threadId);
      const activeRun = runs.find(r => r.status === 'pending' || r.status === 'running');

      if (activeRun) {
        await cancelRun(threadId, activeRun.run_id);
        addMessage('warning', 'Workflow stopped by user.');
      } else {
        addMessage('info', 'No active run found to stop.');
      }

      if (streamReaderRef.current) {
        streamReaderRef.current.cancel();
      }
      setIsStreaming(false);

      const threadState = await getThreadState(threadId);
      setCurrentInterrupt({
        value: threadState.values,
        id: null
      });

      const nextNode = threadState.next && threadState.next.length > 0 ? threadState.next[0] : 'agent';
      setLastNode(nextNode);

      setInterruptType('manual_stop');
      setCurrentState('stopped');

    } catch (error) {
      console.error('Error stopping workflow:', error);
      addMessage('error', `Failed to stop workflow: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAndResume = async (updatedData) => {
    setLoading(true);
    try {
      addMessage('info', 'Updating state and resuming...');
      const threadState = await getThreadState(threadId);

      // Determine as_node from next steps or use lastNode
      const asNode = lastNode || threadState.next?.[0] || 'agent';

      // Update state with correct signature: (threadId, values, asNode)
      await updateState(threadId, updatedData, asNode);
      addMessage('success', 'State updated successfully.');

      // Clear interrupt state and set to running
      setCurrentInterrupt(null);
      setInterruptType(null);
      setCurrentState('running');
      setIsStreaming(true);

      // Resume workflow with null input
      streamReaderRef.current = await streamRun(threadId, null);
      await processStream(streamReaderRef.current);

    } catch (error) {
      console.error('Error updating and resuming:', error);
      const errorMessage = error instanceof APIError
        ? error.message
        : `Failed to resume: ${error.message}`;
      addMessage('error', errorMessage);
      setCurrentState('stopped');
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const getOutfitsToDisplay = () => {
    if (currentInterrupt?.value?.outfits) {
      return currentInterrupt.value.outfits;
    }
    const successMsg = messages.find(m => m.type === 'success' && m.details?.outfits);
    if (successMsg) {
      return successMsg.details.outfits;
    }
    return [];
  };

  const outfits = getOutfitsToDisplay();

  return (
    <div className="page">
      <div className="page__logos">
        <a className="page__logo" href="#" aria-label="Trent Digital Fashion House">
          <img src="assets/logo1.png" alt="Trent Digital Fashion House" />
        </a>
        <a className="page__logo page__logo--secondary" href="#" aria-label="Trent Digital Fashion House Partner">
          <img src="assets/logo2.png" alt="Trent Digital Fashion House Partner" />
        </a>
      </div>

      <header className="hero">
        <div className="hero__content">
          <h1>Trent Digital Fashion House</h1>
          <p>Design studio in the cloud powered by Agentic AI.</p>

          {currentState === 'idle' ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe your fashion trend..."
                className="input-text"
                style={{ maxWidth: '400px' }}
              />
              <button onClick={startAnalysis} className="btn btn--primary" disabled={loading || !query.trim()}>
                {loading ? 'Starting...' : 'Launch Pipeline'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span className="hero__status">
                Status: {currentState.replace('_', ' ').toUpperCase()}
              </span>
              {currentState === 'running' && (
                <button onClick={handleStop} className="btn btn--outline" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                  <StopCircle size={16} style={{ marginRight: '8px' }} /> Stop & Edit
                </button>
              )}
              {currentState === 'complete' && (
                <button onClick={() => setCurrentState('idle')} className="btn btn--outline">
                  New Analysis
                </button>
              )}
            </div>
          )}
        </div>
        <div className="hero__visual">
          <div className="pulse"></div>
          <div className="grid">
            <div className="grid__item"></div>
            <div className="grid__item"></div>
            <div className="grid__item"></div>
            <div className="grid__item"></div>
            <div className="grid__item"></div>
            <div className="grid__item"></div>
          </div>
        </div>
      </header>

      <main className="stageboard" aria-label="Agent Pipeline Dashboard">
        <section className="stageboard__panel stageboard__panel--info">
          <PipelineProgress activeNode={activeNode} completedNodes={completedNodes} />
        </section>

        <section className="stageboard__panel stageboard__panel--visual">
          {currentState === 'idle' && (
            <div className="visual-card">
              <h4>Ready State</h4>
              <div className="visual-grid">
                <div className="visual-grid__item"><span>Agents armed</span><span>7</span></div>
                <div className="visual-grid__item"><span>Pipeline modes</span><span>Data · Video</span></div>
                <div className="visual-grid__item"><span>Asset slots</span><span>Gallery + Reel</span></div>
              </div>
              <div className="detail-note">Press launch to see the panels update as each specialist works.</div>
            </div>
          )}

          {(isStreaming || streamMessages.length > 0) && (
            <ThoughtProcess
              messages={streamMessages}
              isActive={isStreaming}
              activeNode={activeNode}
            />
          )}

          {currentState === 'interrupted' && interruptType === 'user_input' && (
            <UserInputForm
              onSubmit={resumeWithUserInput}
              loading={loading}
              query={query}
              interruptPayload={currentInterrupt?.value}
            />
          )}

          {currentState === 'interrupted' && interruptType === 'outfit_review' && (
            <OutfitReviewForm
              onSubmit={resumeWithReview}
              loading={loading}
              interruptPayload={currentInterrupt?.value}
            />
          )}

          {currentState === 'interrupted' && interruptType === 'generic' && (
            <div className="visual-card">
              <h4>Input Required</h4>
              <p>{currentInterrupt?.value?.message || 'Workflow paused for input.'}</p>
              <DynamicForm
                data={currentInterrupt?.value}
                onChange={(newData) => setCurrentInterrupt(prev => ({ ...prev, value: newData }))}
                readOnly={false}
                collapsedByDefault={true}
              />
              <button onClick={() => resumeWithUserInput(currentInterrupt?.value)} className="btn btn--primary" style={{ marginTop: '16px' }}>
                Resume Workflow
              </button>
            </div>
          )}

          {currentState === 'stopped' && interruptType === 'manual_stop' && (
            <div className="visual-card">
              <h4>Workflow Stopped</h4>
              <p>Modify the current state data below and then resume.</p>
              <DynamicForm
                data={currentInterrupt?.value}
                onChange={(newData) => setCurrentInterrupt(prev => ({ ...prev, value: newData }))}
                readOnly={false}
                collapsedByDefault={true}
              />
              <button onClick={() => handleUpdateAndResume(currentInterrupt?.value)} className="btn btn--primary" style={{ marginTop: '16px' }}>
                Update & Resume
              </button>
            </div>
          )}

          {outfits.length > 0 && (
            <div className="outfit-showcase">
              {outfits.map((outfit, idx) => (
                <OutfitCard key={idx} outfit={outfit} />
              ))}
            </div>
          )}
        </section>

        <section className="stageboard__panel stageboard__panel--recap">
          <div className="stageboard__header stageboard__header--compact">
            <h2>Live Output Console</h2>
            <p>Snapshots of what the pipeline has delivered so far.</p>
          </div>
          <MessageList messages={messages} />
        </section>
      </main>

      <section className="dataflow" aria-label="Detailed Data Flow Insights">
        <div className="dataflow__intro">
          <h2>Agent Data Flow Intelligence</h2>
          <p>A closer look at how LangGraph routes context, artifacts, and retries across the six-agent relay.</p>
        </div>
        <div className="dataflow__grid">
          <article className="dataflow-card">
            <header className="dataflow-card__header">
              <span className="dataflow-card__badge">Flow Logic</span>
              <h3>StateGraph Sequencing</h3>
            </header>
            <ul className="dataflow-list">
              <li><strong>Parallel</strong> &mdash; Data Collector Agent and Video Analyzer Agent fire together; LangGraph waits for both before merging.</li>
              <li><strong>Gates</strong> &mdash; <code>should_continue_to_content_analyzer</code> and <code>should_continue_to_final_processor</code> guard downstream work.</li>
              <li><strong>Reducer state</strong> &mdash; <code>FashionAnalysisState</code> uses additive reducers so evidence accumulates instead of overwriting.</li>
              <li><strong>Status memory</strong> &mdash; <code>execution_status</code> flags completed, failed, or skipped nodes for smart branching.</li>
            </ul>
          </article>
          <article className="dataflow-card">
            <header className="dataflow-card__header">
              <span className="dataflow-card__badge">Artifacts</span>
              <h3>Persistent Outputs</h3>
            </header>
            <ul className="dataflow-list">
              <li><strong>Source harvest queue</strong> &middot; curated article metadata with provenance.</li>
              <li><strong>Insight digest</strong> &middot; enriched findings and confidence bands ready for ranking.</li>
              <li><strong>Runway telemetry</strong> &middot; video trend frequencies and commercial scores.</li>
              <li><strong>Trend blueprint bundle</strong> &middot; fuels dashboards, merch briefs, and downstream prompts.</li>
              <li><strong>Creative capsule</strong> &middot; tracks outfit iterations, approvals, and reel assembly queues.</li>
            </ul>
          </article>
          <article className="dataflow-card">
            <header className="dataflow-card__header">
              <span className="dataflow-card__badge">MCP Mesh</span>
              <h3>Service Surface</h3>
            </header>
            <ul className="dataflow-list">
              <li><strong>8000</strong> &mdash; Scraper MCP catalog (Elle, Vogue, TOI, Instagram hashtags).</li>
              <li><strong>8100</strong> &mdash; Web capture + DOM extraction powering the Content Analyzer.</li>
              <li><strong>8001</strong> &mdash; Runway video analyzer producing <code>VideoTrendOutput</code>.</li>
              <li><strong>8002</strong> &mdash; Outfit generator and verifier loop owned by Reflection.</li>
              <li><strong>Gemini Veo</strong> &amp; <strong>MoviePy</strong> finalize videos via <code>video_generation.py</code>.</li>
            </ul>
          </article>
          <article className="dataflow-card">
            <header className="dataflow-card__header">
              <span className="dataflow-card__badge">Resilience</span>
              <h3>Memory &amp; Retry Strategy</h3>
            </header>
            <ul className="dataflow-list">
              <li><strong>MultiAgentMemoryManager</strong> isolates context per agent with <code>thread_id</code> scoping.</li>
              <li>Exponential backoff (base 22s) parses retry-after hints on Gemini 429s.</li>
              <li>Structured parsers recover when raw text responses slip past format guards.</li>
              <li>Pipeline memory enables skip-ahead execution on reruns until the state is cleared.</li>
            </ul>
          </article>
        </div>
      </section>

      <footer className="footer">
        <p>Multi-agent orchestration for fashion intelligence</p>
      </footer>
    </div>
  );
};

export default FashionAgentUI;