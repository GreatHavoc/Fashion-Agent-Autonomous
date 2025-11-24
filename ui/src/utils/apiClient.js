const API_URL = "http://localhost:2024";

/**
 * Enhanced error class for API errors
 */
class APIError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Parse error response and create user-friendly error message
 */
function parseErrorResponse(statusCode, errorData) {
  let message = 'An error occurred';

  switch (statusCode) {
    case 404:
      message = 'Resource not found. The thread or assistant may not exist.';
      break;
    case 409:
      message = 'Conflict: Another run is already in progress on this thread. Please wait for it to complete.';
      break;
    case 422:
      message = 'Validation error: The request data is invalid.';
      if (errorData && typeof errorData === 'string') {
        message += ` Details: ${errorData}`;
      }
      break;
    case 500:
      message = 'Server error. Please try again later.';
      break;
    default:
      if (errorData && typeof errorData === 'string') {
        message = errorData;
      }
  }

  return message;
}

/**
 * Fetch from API with enhanced error handling
 */
async function fetchFromApi(path, options = {}) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response) {
      throw new APIError("No response from server", 0);
    }

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      let errorData;

      if (contentType && contentType.includes("application/json")) {
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = await response.text();
        }
      } else {
        errorData = await response.text();
      }

      const message = parseErrorResponse(response.status, errorData);
      throw new APIError(message, response.status, errorData);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }
    return response.text();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    // Network error or other fetch errors
    throw new APIError(
      `Network error: ${error.message}. Please check your connection and ensure the LangGraph server is running.`,
      0,
      error
    );
  }
}

/**
 * Validate URL format
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Validate user input data before sending
 */
function validateUserInput(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid user input data');
  }

  // Validate URLs if provided
  if (data.custom_urls && Array.isArray(data.custom_urls)) {
    const invalidUrls = data.custom_urls.filter(url => url && !isValidUrl(url));
    if (invalidUrls.length > 0) {
      throw new Error(`Invalid URLs: ${invalidUrls.join(', ')}`);
    }
  }

  // Validate image URLs if provided
  if (data.custom_images && Array.isArray(data.custom_images)) {
    const invalidImages = data.custom_images.filter(url => url && !isValidUrl(url));
    if (invalidImages.length > 0) {
      throw new Error(`Invalid image URLs: ${invalidImages.join(', ')}`);
    }
  }

  // Validate video URLs if provided
  if (data.custom_videos && Array.isArray(data.custom_videos)) {
    const invalidVideos = data.custom_videos.filter(url => url && !isValidUrl(url));
    if (invalidVideos.length > 0) {
      throw new Error(`Invalid video URLs: ${invalidVideos.join(', ')}`);
    }
  }

  return true;
}

/**
 * Validate outfit review data
 */
function validateReviewData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid review data');
  }

  if (!data.decision_type || !['approve', 'reject', 'edit'].includes(data.decision_type)) {
    throw new Error('Invalid decision type. Must be approve, reject, or edit.');
  }

  if (data.decision_type === 'reject' && (!data.rejection_feedback || !data.rejection_feedback.trim())) {
    throw new Error('Rejection feedback is required when rejecting outfits');
  }

  if (data.decision_type === 'edit' && (!data.edit_instructions || !data.edit_instructions.trim())) {
    throw new Error('Edit instructions are required when requesting changes');
  }

  return true;
}

/**
 * Create a new thread
 */
export async function createThread() {
  return fetchFromApi("/threads", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Stream a run on a thread
 */
export async function streamRun(threadId, input) {
  if (!threadId) {
    throw new Error('Thread ID is required');
  }

  try {
    const payload = {
      assistant_id: "agent",
    };

    if (input) {
      payload.input = { input };
    } else {
      payload.input = null;
    }

    const response = await fetch(`${API_URL}/threads/${threadId}/runs/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const message = parseErrorResponse(response.status, errorText);
      throw new APIError(message, response.status, errorText);
    }

    if (!response.body) {
      throw new APIError("Response body is null", 0);
    }

    return response.body.getReader();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    console.error("Stream run error:", error);
    throw new APIError(
      `Network error during stream: ${error.message}. Please check if the server is running.`,
      0,
      error
    );
  }
}

/**
 * Resume a run from an interrupt
 */
export async function resumeRun(threadId, checkpoint, resumeData) {
  if (!threadId) {
    throw new Error('Thread ID is required');
  }

  if (!checkpoint || !checkpoint.checkpoint_id) {
    throw new Error('Valid checkpoint is required');
  }

  console.log("Resuming run with checkpoint:", checkpoint, "and resumeData:", resumeData);

  const payload = {
    assistant_id: "agent",
    checkpoint: {
      checkpoint_id: checkpoint.checkpoint_id,
      checkpoint_ns: checkpoint.checkpoint_ns || "",
      thread_id: checkpoint.thread_id
    },
    checkpoint_during: true,
    command: {
      resume: resumeData
    },
    config: {
      configurable: {
        thread_id: checkpoint.thread_id
      }
    }
  };

  console.log("Sending resumeRun payload:", payload);

  try {
    const response = await fetch(`${API_URL}/threads/${threadId}/runs/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const message = parseErrorResponse(response.status, errorText);
      throw new APIError(message, response.status, errorText);
    }

    if (!response.body) {
      throw new APIError("Response body is null", 0);
    }

    return response.body.getReader();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    console.error("Resume run error:", error);
    throw new APIError(
      `Network error during resume: ${error.message}. Please check if the server is running.`,
      0,
      error
    );
  }
}

/**
 * Get the current state of a thread
 */
export async function getThreadState(threadId) {
  if (!threadId) {
    throw new Error('Thread ID is required');
  }

  return fetchFromApi(`/threads/${threadId}/state`);
}

/**
 * Update the state of a thread
 */
export async function updateState(threadId, values, checkpointId, asNode) {
  if (!threadId) {
    throw new Error('Thread ID is required');
  }

  const payload = {
    values,
    checkpoint: checkpointId ? { checkpoint_id: checkpointId } : undefined,
    as_node: asNode
  };

  return fetchFromApi(`/threads/${threadId}/state`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Cancel a running run
 */
export async function cancelRun(threadId, runId) {
  if (!threadId || !runId) {
    throw new Error('Thread ID and Run ID are required');
  }

  return fetchFromApi(`/threads/${threadId}/runs/${runId}/cancel`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * List runs for a thread
 */
export async function listRuns(threadId) {
  if (!threadId) {
    throw new Error('Thread ID is required');
  }

  return fetchFromApi(`/threads/${threadId}/runs`);
}

/**
 * Export error class and validation functions for use in components
 */
export { APIError, validateUserInput, validateReviewData, isValidUrl };