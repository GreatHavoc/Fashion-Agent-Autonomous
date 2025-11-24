# Fashion Agent API Reference

This document describes the API integration between the Fashion Agent UI and the LangGraph server.

## Base URL
`http://localhost:2024`

## Endpoints

### Create Thread
Creates a new conversation thread.

- **URL:** `/threads`
- **Method:** `POST`
- **Body:** `{}` (Empty JSON object)
- **Response:**
  ```json
  {
    "thread_id": "uuid-string",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "metadata": {}
  }
  ```

### Stream Run
Starts a new run on a thread and streams the results via Server-Sent Events (SSE).

- **URL:** `/threads/{thread_id}/runs/stream`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "assistant_id": "agent",
    "input": {
      "input": { "query": "user query" }
    }
  }
  ```
- **Response:** SSE stream containing events like `values` (updates) and `end` (completion).

### Resume Run
Resumes a paused run (e.g., waiting for user input) by providing the requested data.

- **URL:** `/threads/{thread_id}/runs/stream`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "assistant_id": "agent",
    "checkpoint": {
      "checkpoint_id": "uuid",
      "checkpoint_ns": "",
      "thread_id": "uuid"
    },
    "checkpoint_during": true,
    "command": {
      "resume": {
        "interrupt_id": { ...user_data... }
      }
    },
    "config": {
      "configurable": {
        "thread_id": "uuid"
      }
    }
  }
  ```
- **Response:** SSE stream continuing the workflow.

### Get Thread State
Retrieves the current state of a thread, including the latest checkpoint. This is crucial for resuming runs.

- **URL:** `/threads/{thread_id}/state`
- **Method:** `GET`
- **Response:**
  ```json
  {
    "values": { ... },
    "next": [],
    "checkpoint": { ... },
    "metadata": { ... },
    "created_at": "timestamp",
    "parent_config": { ... }
  }
  ```

## Error Handling
The UI handles the following error status codes:

- **404 Not Found**: The thread or assistant does not exist.
- **409 Conflict**: Another run is already in progress on this thread.
- **422 Unprocessable Entity**: The request data is invalid (e.g., malformed JSON).
- **500 Internal Server Error**: The LangGraph server encountered an error.

## Client-Side Validation
The UI implements validation before sending data to the API:

### User Input Validation
- **Custom URLs**: Must be valid URL format.
- **Custom Images**: Must be valid URL format.
- **Custom Videos**: Must be valid URL format.

### Outfit Review Validation
- **Decision Type**: Must be one of `approve`, `reject`, `edit`.
- **Rejection Feedback**: Mandatory if decision is `reject`.
- **Edit Instructions**: Mandatory if decision is `edit`.
