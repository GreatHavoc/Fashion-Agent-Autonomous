import React, { useState, useEffect, useRef } from 'react';
import { Play, Sparkles, AlertCircle, Loader, StopCircle } from 'lucide-react';
import UserInputForm from './UserInputForm';
import OutfitReviewForm from './OutfitReviewForm';
import './FashionAgentUI.css';
import { createThread, streamRun, resumeRun, getThreadState, updateState, cancelRun, listRuns, APIError } from '../utils/apiClient';
import DynamicForm from './DynamicForm';
import TaskDataViewer from './TaskDataViewer';
import PipelineProgress from './PipelineProgress';
import InputRequiredModal from './InputRequiredModal';

const FashionAgentUI = () => {
  const [threadId, setThreadId] = useState(null);
  const [query, setQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskEditing, setIsTaskEditing] = useState(false);
  // Add this state at the top of your component
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [failedNodes, setFailedNodes] = useState([]);
  const [graphData, setGraphData] = useState({});
  const [messages, setMessages] = useState([]);
  const [currentInterrupt, setCurrentInterrupt] = useState(null);
  const [interruptType, setInterruptType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [interruptHistory, setInterruptHistory] = useState([]);
  const [resumeAttempts, setResumeAttempts] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamMessages, setStreamMessages] = useState([]);
  const [workflowState, setWorkflowState] = useState('idle');
  const [lastNode, setLastNode] = useState(null);
  const [activeNode, setActiveNode] = useState(null);
  const [completedNodes, setCompletedNodes] = useState([]);
  const [taskData, setTaskData] = useState({
    data_collector: null,
    video_analyzer: null,
    content_analyzer: null,
    trend_processor: null,
    outfit_designer: null,
    video_generation: null
  });
  const streamReaderRef = useRef(null);
  // Add this useEffect to log state changes after they've actually updated
  useEffect(() => {
    console.log('STATE UPDATED:', { workflowState, interruptType, currentInterrupt });
  }, [workflowState, interruptType, currentInterrupt]);

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
    console.log('Stream event received:', event);

    // Map backend agent names to frontend stage IDs
    const AGENT_NAME_MAP = {
      'data_collector': 'data_collector',
      'video_analyzer': 'video_analyzer',
      'content_analyzer': 'content_analyzer',
      'final_processor': 'trend_processor',  // Backend uses final_processor, frontend uses trend_processor
      'outfit_designer': 'outfit_designer',
      'video_generator': 'video_generation'   // Backend uses video_generator, frontend uses video_generation
    };



    // Don't process events if already interrupted
    // if (isInterrupted) {
    //   console.log('Ignoring event - workflow is interrupted');
    //   return;
    // }
    // Handle execution_status updates (primary method)
    if (event.execution_status) {
      const status = event.execution_status;
      console.log('Execution status received:', status);

      // Track completed nodes
      const completedBackendNodes = Object.keys(status).filter(
        key => status[key] === 'completed'
      );
      const completedFrontendNodes = completedBackendNodes
        .map(backendName => AGENT_NAME_MAP[backendName])
        .filter(Boolean);

      setCompletedNodes(prev => [...new Set([...prev, ...completedFrontendNodes])]);

      // Determine active node
      const runningNode = Object.keys(status).find(key => status[key] === 'running');
      const failedNode = Object.keys(status).find(key => status[key] === 'failed');

      if (runningNode) {
        const frontendNode = AGENT_NAME_MAP[runningNode];
        setActiveNode(frontendNode || null);
        console.log('Active node (running):', frontendNode);
      } else if (failedNode) {
        const frontendNode = AGENT_NAME_MAP[failedNode];
        setActiveNode(frontendNode || null);
        console.log('Active node (failed):', frontendNode);
      } 
      else {
      // All nodes completed or waiting - determine next node
        const pipelineOrder = ['data_collector', 'video_analyzer', 'content_analyzer',
          'final_processor', 'outfit_designer', 'video_generator'];
        
        // Check if all nodes are either in execution_status as 'completed' OR already in completedNodes
        const allNodesComplete = pipelineOrder.every(backendNode => {
          const frontendNode = AGENT_NAME_MAP[backendNode];
          return status[backendNode] === 'completed' || completedNodes.includes(frontendNode);
        });
        
        if (allNodesComplete) {
          setActiveNode(null); // All completed
          setWorkflowState('complete');
          console.log('All nodes complete - workflow finished');
        } else {
          const nextBackendNode = pipelineOrder.find(node => 
            status[node] !== 'completed' && !completedNodes.includes(AGENT_NAME_MAP[node])
          );
          
          if (nextBackendNode) {
            const frontendNode = AGENT_NAME_MAP[nextBackendNode];
            setActiveNode(frontendNode || null);
            console.log('Active node (next):', frontendNode);
          }
        }
      }
    }

    // Fallback: Infer completion from data presence (secondary indicators)
    // In handleStreamEvent, update each data section to also store in taskData:

    // For data_urls
    console.log('event', event);
    if (event.data_collection && Array.isArray(event.data_collection.url_list) && event.data_collection.url_list.length > 0) {
      console.log('data_urls received');
      setCompletedNodes(prev => {
        if (!prev.includes('data_collector')) {
          return [...prev, 'data_collector'];
        }
        return prev;
      });

      // Store the data
      setTaskData(prev => ({
        ...prev,
        data_collector: { data_collection: event.data_collection }
      }));
    }

    // For content_analysis
    if (event.content_analysis && Array.isArray(event.content_analysis) && event.content_analysis.length > 0) {
      console.log('content_analysis received');
      setCompletedNodes(prev => {
        const newNodes = new Set(prev);
        newNodes.add('content_analyzer');
        return [...newNodes];
      });

      // Store the data
      setTaskData(prev => ({
        ...prev,
        content_analyzer: { content_analysis: event.content_analysis }
      }));
    }

    // For video_analysis
    if (event.video_analysis && Array.isArray(event.video_analysis) && event.video_analysis.length > 0) {
      console.log('video_analysis received');
      setCompletedNodes(prev => {
        const newNodes = new Set(prev);
        newNodes.add('video_analyzer');
        return [...newNodes];
      });

      // Store the data
      setTaskData(prev => ({
        ...prev,
        video_analyzer: { video_analysis: event.video_analysis }
      }));
    }

    // For outfit_designs
    if (event.outfit_designs && Array.isArray(event.outfit_designs) && event.outfit_designs.length > 0) {
      console.log('outfit_designs received');
      setCompletedNodes(prev => {
        const newNodes = new Set(prev);
        newNodes.add('outfit_designer');
        return [...newNodes];
      });

      // Store the data
      setTaskData(prev => ({
        ...prev,
        outfit_designer: { outfit_designs: event.outfit_designs }
      }));
    }

    // For final_report
    if (event.final_processor && Object.keys(event.final_processor).length > 0) {
      console.log('final_report received');
      setCompletedNodes(prev => {
        const newNodes = new Set(prev);
        newNodes.add('trend_processor');
        return [...newNodes];
      });

      // Store the data
      setTaskData(prev => ({
        ...prev,
        trend_processor: { final_processor: event.final_processor }
      }));
    }

    // For outfit_videos
    if (event.outfit_videos && Array.isArray(event.outfit_videos) && event.outfit_videos.length > 0) {
      console.log('outfit_videos received');
      setCompletedNodes(prev => {
        const newNodes = new Set(prev);
        newNodes.add('video_generation');
        return [...newNodes];
      });

      // Store the data
      setTaskData(prev => ({
        ...prev,
        video_generation: { outfit_videos: event.outfit_videos }
      }));
    }


    if (event.content_analysis && Array.isArray(event.content_analysis) && event.content_analysis.length > 0) {
      console.log('content_analysis received, marking content_analyzer as completed');
      setCompletedNodes(prev => {
        const newNodes = new Set(prev);
        newNodes.add('content_analyzer');
        return [...newNodes];
      });
    }

    if (event.video_analysis && Array.isArray(event.video_analysis) && event.video_analysis.length > 0) {
      console.log('video_analysis received, marking video_analyzer as completed');
      setCompletedNodes(prev => {
        const newNodes = new Set(prev);
        newNodes.add('video_analyzer');
        return [...newNodes];
      });
    }

    if (event.outfit_designs && Array.isArray(event.outfit_designs) && event.outfit_designs.length > 0) {
      console.log('outfit_designs received, marking outfit_designer as completed');
      setCompletedNodes(prev => {
        const newNodes = new Set(prev);
        newNodes.add('outfit_designer');
        return [...newNodes];
      });
    }

    if (event.outfit_videos && Array.isArray(event.outfit_videos) && event.outfit_videos.length > 0) {
      console.log('outfit_videos received, marking video_generation as completed');
      setCompletedNodes(prev => {
        const newNodes = new Set(prev);
        newNodes.add('video_generation');
        return [...newNodes];
      });
    }

    if (event.final_report && Object.keys(event.final_report).length > 0) {
      console.log('final_report received, marking trend_processor as completed');
      setCompletedNodes(prev => {
        const newNodes = new Set(prev);
        newNodes.add('trend_processor');
        return [...newNodes];
      });
    }

    // Handle errors
    if (event.errors && Object.keys(event.errors).length > 0) {
      console.log('Errors detected:', event.errors);

      // Mark failed nodes
      Object.keys(event.errors).forEach(backendNode => {
        const frontendNode = AGENT_NAME_MAP[backendNode];
        if (frontendNode) {
          setActiveNode(frontendNode);
          setFailedNodes(prev => [...new Set([...prev, frontendNode])]);  // Add this line
        }
      });

      addMessage('error', 'Agent Error', event.errors);
    }


    // Handle agent memories
    // In handleStreamEvent, when storing graph memories:
    if (event.agent_memories) {
      setGraphData(prev => ({
        ...prev,
        memories: event.agent_memories
      }));
    }


    // Capture specific events for the thought process (keep existing logic)
    if (['onchainstart', 'onchainend', 'ontoolstart', 'ontoolend'].includes(event.event)) {
      addStreamMessage(event.name || event.event, event.data?.input || event.data?.output);
    }

    // Handle interrupts (keep existing logic)
    // Handle interrupts
    if (event.__interrupt__ || (event.interrupt && Array.isArray(event.interrupt))) {
      console.log('Interrupt detected:', event);

      let interruptData = event.__interrupt__ || event.interrupt;
      let firstInterrupt;

      if (Array.isArray(interruptData) && interruptData.length > 0) {
        firstInterrupt = interruptData[0];
      } else if (interruptData && !Array.isArray(interruptData)) {
        firstInterrupt = interruptData;
      }

      if (firstInterrupt) {
        const interruptValue = firstInterrupt.value;
        const interruptId = firstInterrupt.id;

        console.log('Processing interrupt:', { interruptValue, interruptId });

        // Determine interrupt type based on the value structure
        let type = 'generic';

        // Check if it's a user input request (has instructions for custom_urls, custom_images, etc.)
        if (interruptValue?.instructions) {
          const hasCustomInputs =
            interruptValue.instructions.custom_urls ||
            interruptValue.instructions.custom_images ||
            interruptValue.instructions.custom_videos ||
            interruptValue.instructions.query;

          if (hasCustomInputs) {
            type = 'userinput';
          }
        }

        // Check if it's an outfit review request
        if (interruptValue?.type === 'human_review_node' ||
          interruptValue?.outfits ||
          interruptValue?.designs_to_review) {
          type = 'review_outfit';
          console.log(' render Identified as outfit review interrupt');
        }

        // Check message content for hints
        if (interruptValue?.message) {
          const msg = interruptValue.message.toLowerCase();
          if (msg.includes('review') || msg.includes('critique') || msg.includes('outfit')) {
            type = 'review_outfit';
          } else if (msg.includes('url') || msg.includes('image') || msg.includes('video') || msg.includes('custom')) {
            type = 'userinput';
          }
        }

        console.log('Interrupt type determined:', type);

        setInterruptType(type);
        setCurrentInterrupt({
          value: interruptValue,
          id: interruptId
        });
        setWorkflowState('interrupted');
        setLoading(false);
        setIsStreaming(false);

        // Don't clear activeNode, just show it's waiting for input
      }
    }


    // Check for final output
    if (event.data && event.data.final_output) {
      addMessage('success', 'Workflow Completed', event.data);
      setWorkflowState('complete');
      setIsStreaming(false);
      setActiveNode(null); // Clear active node on completion
    }
  };

  const handleTaskDataUpdate = (taskId, newData) => {
    setTaskData(prev => ({
      ...prev,
      [taskId]: newData
    }));
  };

  const handleSaveTaskChanges = async (taskId, newData) => {
    console.log('Saving changes for task:', taskId, newData);

    try {
      // Update local state
      setTaskData(prev => ({
        ...prev,
        [taskId]: newData
      }));

      // Optionally, send to backend to update the thread state
      if (threadId) {
        await updateState(threadId, {
          [taskId]: newData
        });

        addMessage('success', 'Changes Saved', {
          message: `Updated ${taskId} data successfully`
        });
      }
    } catch (error) {
      console.error('Error saving task data:', error);
      addMessage('error', 'Save Failed', {
        message: error.message || 'Failed to save changes'
      });
    }
  };
  const handleRerunFromNode = async (nodeName, reader) => {
    console.log(`Re-running workflow from node: ${nodeName}`);
    
    // Reset workflow to running state
    setWorkflowState('running');
    
    // Define which nodes will actually re-execute based on dependencies
    const affectedNodesMap = {
      'data_collector': ['content_analyzer', 'trend_processor', 'outfit_designer', 'video_generation'],
      'video_analyzer': ['content_analyzer', 'trend_processor', 'outfit_designer', 'video_generation'],
      'content_analyzer': ['trend_processor', 'outfit_designer', 'video_generation'],
      'trend_processor': ['outfit_designer', 'video_generation'],
      'outfit_designer': ['video_generation'],
      'video_generation': []
    };
    
    var affectedNodes = affectedNodesMap[nodeName] || [];
    
    if (affectedNodes.length > 0) {
      // Only clear nodes that will actually re-execute
      setCompletedNodes(prev => prev.filter(node => !affectedNodes.includes(node)));
      console.log(`Cleared downstream nodes that will re-execute: ${affectedNodes.join(', ')}`);
    }
    
    addMessage('info', `Rerunning workflow from ${nodeName}...`);
    
    // Process the stream
    try {
      await processStream(reader);
      addMessage('success', 'Workflow rerun completed successfully');
    } 
    catch (error) {
      console.error('Error during rerun stream:', error);
      addMessage('error', `Rerun failed: ${error.message}`);
      setWorkflowState('error');
    }
  };
  const handleStageClick = (taskId) => {
    // Update parent selection which will be forwarded to TaskDataViewer
    console.log('🔵 Pipeline clicked:', taskId);
    setSelectedTask(taskId);
    // Also ensure TaskData is visible (if you have logic to open/show the TaskDataViewer container)
    // For example, if you want to ensure the Task Dashboard is visible when clicking pipeline:
    // setWorkflowState('running'); // <- optional, depending on UX
  };

  const processStream = async (reader) => {
    const decoder = new TextDecoder();
    let buffer = '';
    // console.log("streams",reader.read())
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
              console.log("stream", eventData)
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
    setFailedNodes([]);
    setActiveNode(null);
    setWorkflowState('running');
    // Reset task data
    setTaskData({
      data_collector: null,
      video_analyzer: null,
      content_analyzer: null,
      trend_processor: null,
      outfit_designer: null,
      video_generation: null
    });

    try {
      // Create thread - extract the thread_id from the response
      const threadResponse = await createThread();
      console.log('Thread response:', threadResponse);

      // Extract thread ID from response object
      const newThreadId = threadResponse.thread_id || threadResponse.id || threadResponse;

      if (!newThreadId || typeof newThreadId !== 'string') {
        throw new Error('Invalid thread ID received: ' + JSON.stringify(threadResponse));
      }

      setThreadId(newThreadId);
      console.log('Thread ID set:', newThreadId);

      // Start streaming run with the string thread ID
      const reader = await streamRun(newThreadId, { query: query });
      streamReaderRef.current = reader;

      // Process stream with buffering
      const decoder = new TextDecoder();
      let buffer = '';
      setIsStreaming(true);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream completed');
            setIsStreaming(false);
            setLoading(false);
            break;
          }

          // Decode chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Split by newlines
          const lines = buffer.split('\n');

          // Keep last incomplete line in buffer
          buffer = lines.pop() || '';

          // Process complete lines
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data) {
                try {
                  const event = JSON.parse(data);
                  console.log('Stream event:', event);
                  handleStreamEvent(event);
                } catch (parseError) {
                  console.error('Error parsing event:', parseError);
                  console.error('Problematic data:', data);
                }
              }
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          if (buffer.startsWith('data: ')) {
            const data = buffer.slice(6).trim();
            if (data) {
              try {
                const event = JSON.parse(data);
                handleStreamEvent(event);
              } catch (parseError) {
                console.error('Error parsing final buffer:', parseError);
              }
            }
          }
        }

      } catch (streamError) {
        if (streamError.name === 'AbortError') {
          console.log('Stream cancelled by user');
        } else {
          throw streamError;
        }
      }

    } catch (error) {
      console.error('Error in analysis:', error);
      setWorkflowState('error');
      addMessage('error', 'Analysis Failed', {
        message: error.message || 'Failed to complete analysis'
      });
      setLoading(false);
      setIsStreaming(false);
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

      streamReaderRef.current = await resumeRun(threadId, checkpoint, resumeData, currentInterrupt?.id);

      setIsStreaming(true);
      // Don't clear interrupt state here - let handleStreamEvent set the next interrupt
      setWorkflowState('running');

      await processStream(streamReaderRef.current);

    } catch (error) {
      console.error('Error resuming with user input:', error);
      addMessage('error', `Resume failed: ${error.message}`);
      setWorkflowState('error');
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const resumeWithReview = async (reviewData) => {
    console.log('Outfit review submitted:', reviewData);

    if (!currentInterrupt) {
      console.error('No current interrupt found');
      return;
    }

    if (!currentInterrupt.id) {
      console.error('No interrupt ID found');
      return;
    }

    if (!threadId || typeof threadId !== 'string') {
      console.error('Invalid thread ID:', threadId);
      return;
    }

    try {
      setLoading(true);
      setWorkflowState('running');
      setIsInterrupted(false);
      console.log('Getting current state to retrieve checkpoint...');

      // Get the current state which contains the checkpoint
      const stateData = await getThreadState(threadId);
      console.log('State data retrieved:', stateData);

      if (!stateData.checkpoint || !stateData.checkpoint.checkpoint_id) {
        throw new Error('No valid checkpoint found in state');
      }

      const checkpoint = {
        checkpoint_id: stateData.checkpoint.checkpoint_id,
        checkpoint_ns: stateData.checkpoint.checkpoint_ns || "",
        thread_id: threadId
      };

      // Format the review response based on decision type
      let reviewResponse;
      const decisionType = reviewData.decision_type || (reviewData.approved ? 'approve' : 'reject');

      if (decisionType === 'approve') {
        reviewResponse = {
          decision_type: 'approve'
        };
      } else if (decisionType === 'edit') {
        reviewResponse = {
          decision_type: 'edit',
          edit_instructions: reviewData.feedback || ''
        };
      } else if (decisionType === 'reject') {
        reviewResponse = {
          decision_type: 'reject',
          rejection_feedback: reviewData.feedback || '',
          selected_outfit_ids: reviewData.selected_outfit || []
        };
      } else {
        // Fallback
        reviewResponse = {
          decision_type: decisionType
        };
      }

      console.log('Resuming with:');
      console.log('- Checkpoint:', checkpoint);
      console.log('- Interrupt ID:', currentInterrupt.id);
      console.log('- Review response:', reviewResponse);

      // Resume the run with checkpoint, review data, and interrupt ID
      const reader = await resumeRun(
        threadId,
        checkpoint,
        reviewResponse,
        currentInterrupt.id  // Pass the interrupt ID from the interrupt data
      );

      // Store reader reference for cancellation
      streamReaderRef.current = reader;

      // Process the stream with proper buffering
      const decoder = new TextDecoder();
      let buffer = '';
      setIsStreaming(true);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream completed');
            setIsStreaming(false);
            setLoading(false);
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data) {
                try {
                  const event = JSON.parse(data);
                  console.log('Stream event:', event);
                  handleStreamEvent(event);
                } catch (parseError) {
                  console.error('Error parsing event:', parseError);
                }
              }
            }
          }
        }

        if (buffer.trim() && buffer.startsWith('data: ')) {
          const data = buffer.slice(6).trim();
          if (data) {
            try {
              const event = JSON.parse(data);
              handleStreamEvent(event);
            } catch (parseError) {
              console.error('Error parsing final buffer:', parseError);
            }
          }
        }

      } catch (streamError) {
        if (streamError.name === 'AbortError') {
          console.log('Stream cancelled by user');
        } else {
          throw streamError;
        }
      }
      //     setInterruptType(null);
      // setCurrentInterrupt(null);
      // setWorkflowState('running');
      // Add to interrupt history
      setInterruptHistory(prev => [
        ...prev,
        {
          type: 'outfitreview',
          data: reviewResponse,
          interruptId: currentInterrupt.id,
          timestamp: new Date().toISOString()
        }
      ]);

      // Don't clear interrupt state here - let handleStreamEvent set the next interrupt
      // The stream will automatically detect and set the new interrupt
      setLoading(false);

    } catch (error) {
      console.error('Error resuming with review:', error);
      setWorkflowState('interrupted');
      addMessage('error', 'Resume Failed', {
        message: error.message || 'Failed to resume workflow with review'
      });
      setLoading(false);
      setIsStreaming(false);
    }
  };


  const handleStop = async () => {
    if (!threadId) return;

    console.log('=== STOP WORKFLOW INITIATED ===');
    console.log('Current state before stop:', workflowState);

    setLoading(true);

    try {
      addMessage('info', 'Stopping workflow...');

      const runs = await listRuns(threadId);
      console.log('Active runs:', runs);

      const activeRun = runs.find(r => r.status === 'pending' || r.status === 'running');

      if (activeRun) {
        console.log('Cancelling active run:', activeRun.run_id);
        await cancelRun(threadId, activeRun.run_id);
        addMessage('warning', 'Workflow stopped by user.');
      } else {
        console.log('No active run found');
        addMessage('info', 'No active run found to stop.');
      }

      // Cancel the stream reader
      if (streamReaderRef.current) {
        console.log('Cancelling stream reader');
        streamReaderRef.current.cancel();
        streamReaderRef.current = null;
      }
      setIsStreaming(false);

      // Get current thread state
      const threadState = await getThreadState(threadId);
      console.log('Thread state after stop:', threadState);

      setCurrentInterrupt({
        value: threadState.values,
        id: null
      });

      const nextNode = threadState.next && threadState.next.length > 0 ? threadState.next[0] : 'agent';
      console.log('Next node to execute:', nextNode);
      setLastNode(nextNode);

      // Set the workflow state to stopped
      setInterruptType('manual_stop');
      setWorkflowState('stopped');

      console.log('Workflow state set to: stopped');
      console.log('=== STOP WORKFLOW COMPLETED ===');

    } catch (error) {
      console.error('Error stopping workflow:', error);
      addMessage('error', `Failed to stop workflow: ${error.message}`);
      setWorkflowState('error');
    } finally {
      setLoading(false);
    }
  };

  const handleUserInputSubmit = async (userInput) => {
    console.log('User input submitted:', userInput);

    if (!currentInterrupt) {
      console.error('No current interrupt found');
      return;
    }

    if (!currentInterrupt.id) {
      console.error('No interrupt ID found');
      return;
    }

    if (!threadId || typeof threadId !== 'string') {
      console.error('Invalid thread ID:', threadId);
      return;
    }

    try {
      setLoading(true);
      setWorkflowState('running');
      setIsInterrupted(false);
      // Prepare the input in the exact format expected
      const updateData = {
        custom_urls: userInput.custom_urls || [],
        custom_images: userInput.custom_images || [],
        custom_videos: userInput.custom_videos || [],
        query: userInput.query || ''
      };

      console.log('Getting current state to retrieve checkpoint...');

      // Get the current state which contains the checkpoint
      const stateData = await getThreadState(threadId);
      console.log('State data retrieved:', stateData);

      if (!stateData.checkpoint || !stateData.checkpoint.checkpoint_id) {
        throw new Error('No valid checkpoint found in state');
      }

      const checkpoint = {
        checkpoint_id: stateData.checkpoint.checkpoint_id,
        checkpoint_ns: stateData.checkpoint.checkpoint_ns || "",
        thread_id: threadId
      };

      console.log('Resuming with:');
      console.log('- Checkpoint:', checkpoint);
      console.log('- Interrupt ID:', currentInterrupt.id);
      console.log('- User data:', updateData);

      // Resume the run with checkpoint, user input, and interrupt ID
      const reader = await resumeRun(
        threadId,
        checkpoint,
        updateData,
        currentInterrupt.id  // Pass the interrupt ID from the interrupt data
      );

      // Store reader reference for cancellation
      streamReaderRef.current = reader;

      // Process the stream with proper buffering
      const decoder = new TextDecoder();
      let buffer = '';
      setIsStreaming(true);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream completed');
            setIsStreaming(false);
            setLoading(false);
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data) {
                try {
                  const event = JSON.parse(data);
                  console.log('Stream event:', event);
                  handleStreamEvent(event);
                } catch (parseError) {
                  console.error('Error parsing event:', parseError);
                }
              }
            }
          }
        }

        if (buffer.trim() && buffer.startsWith('data: ')) {
          const data = buffer.slice(6).trim();
          if (data) {
            try {
              const event = JSON.parse(data);
              handleStreamEvent(event);
            } catch (parseError) {
              console.error('Error parsing final buffer:', parseError);
            }
          }
        }

      } catch (streamError) {
        if (streamError.name === 'AbortError') {
          console.log('Stream cancelled by user');
        } else {
          throw streamError;
        }
      }

      // Add to interrupt history
      setInterruptHistory(prev => [
        ...prev,
        {
          type: 'userinput',
          data: updateData,
          interruptId: currentInterrupt.id,
          timestamp: new Date().toISOString()
        }
      ]);

      // Don't clear interrupt state here - let handleStreamEvent set the next interrupt
      // The stream will automatically detect and set the new interrupt
      setLoading(false);

    } catch (error) {
      console.error('Error resuming with user input:', error);
      setWorkflowState('interrupted');
      addMessage('error', 'Resume Failed', {
        message: error.message || 'Failed to resume workflow with user input'
      });
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


      <header className="hero">
        <div className="hero__content">
          <h1>Trent Digital Fashion House</h1>
          <p>Design studio in the cloud powered by Agentic AI.</p>

          {workflowState === 'idle' ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe your fashion trend..."
                className="input-text"
                style={{ maxWidth: '400px'}}
              />
              <button onClick={startAnalysis} className="btn btn--primary" disabled={loading || !query.trim()}>
                {loading ? 'Starting...' : 'Launch Pipeline'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span className="hero__status">
                Status: {workflowState.replace('_', ' ').toUpperCase()}
              </span>
              {workflowState === 'running' && (
                <button onClick={handleStop} className="btn btn--outline" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                  <StopCircle size={16} style={{ marginRight: '8px' }} /> Stop & Edit
                </button>
              )}
              {workflowState === 'complete' && (
                <button onClick={() => setWorkflowState('idle')} className="btn btn--outline">
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

      {/* Update the main class to include 'stageboard--editing' if editing Data Collector */}
      <main
        className={`stageboard ${isTaskEditing && selectedTask === 'data_collector' ? 'stageboard--editing' : ''}`}
        aria-label="Agent Pipeline Dashboard"
      >

        {/* Conditionally render the sidebar panel */}
        {!(isTaskEditing && selectedTask === 'data_collector') && (
          <section className="stageboard__panel stageboard__panel--info">
            <PipelineProgress
              activeNode={activeNode}
              completedNodes={completedNodes}
              failedNodes={failedNodes}
              onStageClick={handleStageClick}
              selectedTask={selectedTask}
            />
          </section>
        )}

        <section className="stageboard__panel stageboard__panel--visual">
          {/* PRIORITY 1: IDLE STATE */}
          {workflowState === 'idle' && (
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
          {/* PRIORITY 4: OUTFIT REVIEW INTERRUPT */}
          {workflowState === 'interrupted' && interruptType === 'outfitreview' && currentInterrupt && (
            <>
              {<OutfitReviewForm
                onSubmit={resumeWithReview}
                loading={loading}
                interruptPayload={currentInterrupt?.value}
              />}


            </>
          )}

          {/* PRIORITY 2: STOPPED STATE */}
          {workflowState === 'stopped' && (
            <>
              <div className="visual-card" style={{ backgroundColor: '#fff3cd', border: '2px solid #ffc107', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <StopCircle size={24} style={{ color: '#856404' }} />
                  <h4 style={{ margin: 0, color: '#856404' }}>Workflow Stopped</h4>
                </div>
                <p style={{ color: '#856404', margin: 0 }}>
                  The workflow has been manually stopped. Review and edit the data below before resuming.
                </p>
              </div>

              {completedNodes.length > 0 && (
                <div className="visual-card" style={{ marginBottom: '20px' }}>
                  <h4>Task Data (Editable)</h4>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                    Review and edit the data from completed tasks before resuming.
                  </p>
                  <TaskDataViewer
                    completedNodes={completedNodes}
                    activeNode={null}
                    taskData={taskData}
                    onUpdateData={handleTaskDataUpdate}
                    onSaveChanges={handleSaveTaskChanges}
                  />
                </div>
              )}
            </>
          )}

          {/* PRIORITY 3: USER INPUT INTERRUPT (Only show once!) */}
          {false && workflowState === 'interrupted' && interruptType === 'userinput' && currentInterrupt && (
            <div className="interrupt-container" style={{
              padding: '20px',
              // backgroundColor: '#1a1d3499',
              borderRadius: '8px',
              // border: '2px solid rgb(159, 166, 179)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '0px'
              }}>
                <AlertCircle size={24} style={{ color: '#ecefffb8' }} />
                <h3 style={{ margin: 0, color: '#ecefffb8' }}>Input Required</h3>
              </div>

              {/* Show Task Data of Last Completed Task */}
              {completedNodes.length > 0 && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: 'linear-gradient(135deg, rgba(10, 13, 30, 0.85), rgba(17, 21, 40, 0.65)) !important',
                  borderRadius: '6px',
                  border: '1px solid #dee2e6'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '14px' }}>
                    Current Progress
                  </div>
                  <TaskDataViewer
                    completedNodes={completedNodes}
                    activeNode={null}
                    taskData={taskData}
                    onUpdateData={handleTaskDataUpdate}
                    onSaveChanges={handleSaveTaskChanges}
                  />
                </div>
              )}

              <div style={{
                marginBottom: '16px',
                padding: '12px',
                // backgroundColor: 'rgb(3 15 26)', 
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#ede4e4' }}>
                  {currentInterrupt.value?.message || 'Additional input required'}
                </p>

                {currentInterrupt.value?.instructions && (
                  <div style={{ fontSize: '13px', color: '#c0b9b9ff' }}>
                    <p style={{ marginTop: '8px', fontWeight: '500' }}>You can provide:</p>
                    <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                      {currentInterrupt.value.instructions.custom_urls && (
                        <li>Custom URLs to analyze</li>
                      )}
                      {currentInterrupt.value.instructions.custom_images && (
                        <li>Image files or URLs</li>
                      )}
                      {currentInterrupt.value.instructions.custom_videos && (
                        <li>Video URLs</li>
                      )}
                      {currentInterrupt.value.instructions.query && (
                        <li>Specific query or focus area</li>
                      )}
                    </ul>
                  </div>
                )}

                {currentInterrupt.value?.example && (
                  <details style={{ marginTop: '12px' }}>
                    <summary style={{ cursor: 'pointer', color: '#ede4e4', fontSize: '13px' }}>
                      Show example
                    </summary>
                    <pre style={{
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: 'rgb(3 15 26)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(currentInterrupt.value.example, null, 2)}
                    </pre>
                  </details>
                )}
              </div>

              <UserInputForm
                onSubmit={handleUserInputSubmit}
                initialValues={{
                  custom_urls: [],
                  custom_images: [],
                  custom_videos: [],
                  query: ''
                }}
              />
            </div>
          )}



          {/* PRIORITY 5: GENERIC INTERRUPT */}
          {false && workflowState === 'interrupted' && interruptType === 'generic' && currentInterrupt && (
            <>
              {completedNodes.length > 0 && (
                <div className="visual-card" style={{ marginBottom: '20px' }}>
                  <h4>Current Progress</h4>
                  <TaskDataViewer
                    completedNodes={completedNodes}
                    activeNode={null}
                    taskData={taskData}
                    onUpdateData={handleTaskDataUpdate}
                    onSaveChanges={handleSaveTaskChanges}
                  />
                </div>
              )}

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
            </>
          )}

          {/* PRIORITY 6: RUNNING/COMPLETE STATE - Task Dashboard */}
          {(workflowState === 'running' || workflowState === 'complete') && completedNodes.length > 0 && (
            <TaskDataViewer
              completedNodes={completedNodes}
              activeNode={activeNode}
              onEditModeChange={setIsTaskEditing}
              taskData={taskData}
              onUpdateData={handleTaskDataUpdate}
              onSaveChanges={handleSaveTaskChanges}
              selectedTask={selectedTask}        // ✅ HAS THIS
              onSelectTask={setSelectedTask}     // ✅ HAS THIS
              allowLocalSelection={false}
              threadId={threadId}
              onRerunFromNode={handleRerunFromNode}
            />
          )}










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
      {/* PRIORITY 3: INTERRUPT MODAL (User Input & Outfit Review) */}
      {workflowState === 'interrupted' && currentInterrupt && (
        <InputRequiredModal
          isOpen={true}
          title={
            interruptType === 'userinput' ? "Input Required" :
              interruptType === 'review_outfit' ? "Review Outfits" :
                "Action Required"
          }
        >
          {/* Context: Show last completed task data if available */}
          {completedNodes.length > 0 && interruptType !== 'review_outfit' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                Context from previous step:
              </div>
              <TaskDataViewer
                completedNodes={completedNodes}
                activeNode={null}
                taskData={taskData}
                onUpdateData={handleTaskDataUpdate}
                onSaveChanges={handleSaveTaskChanges}
              />
            </div>
          )}

          {/* 1. USER INPUT FORM */}
          {interruptType === 'userinput' && (
            <>
              <div style={{ marginBottom: '16px', color: '#ecefffb8', fontSize: '0.95rem' }}>
                {currentInterrupt.value?.message || 'Please provide the requested information below.'}
              </div>
              <UserInputForm
                onSubmit={handleUserInputSubmit}
                initialValues={{
                  custom_urls: [],
                  custom_images: [],
                  custom_videos: [],
                  query: ''
                }}
              />
            </>
          )}

          {/* 2. OUTFIT REVIEW FORM */}
          {interruptType === 'review_outfit' && (
            <OutfitReviewForm
              onSubmit={resumeWithReview}
              loading={loading}
              interruptPayload={currentInterrupt.value}
            />
          )}

          {/* 3. GENERIC / DYNAMIC FORM */}
          {interruptType === 'generic' && (
            <>
              <div style={{ marginBottom: '16px', color: '#ecefffb8', fontSize: '0.95rem' }}>
                {currentInterrupt.value?.message || 'Workflow paused for input.'}
              </div>
              <DynamicForm
                data={currentInterrupt?.value}
                onChange={(newData) => setCurrentInterrupt(prev => ({ ...prev, value: newData }))}
                readOnly={false}
                collapsedByDefault={false}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  onClick={() => resumeWithUserInput(currentInterrupt?.value)}
                  className="btn btn--primary"
                >
                  Resume Workflow
                </button>
              </div>
            </>
          )}
        </InputRequiredModal>
      )}
    </div>
  );

};

export default FashionAgentUI;