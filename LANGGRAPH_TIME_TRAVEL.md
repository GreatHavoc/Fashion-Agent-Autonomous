# LangGraph Time Travel Guide

## Overview

**Time Travel** in LangGraph allows you to:
- 🔍 **Debug**: Examine decision-making process in detail
- 🔄 **Replay**: Resume execution from any prior checkpoint
- 🌿 **Fork**: Modify state and explore alternative execution paths
- 📊 **Analyze**: Review historical states and understand what led to results

## How It Works

LangGraph's checkpointer saves the state at **every superstep** (node execution). This creates a complete history of your graph execution that you can navigate like a time machine.

## Key Concepts

### 1. Checkpoints
- Automatically created after each node execution
- Identified by `checkpoint_id`
- Grouped into threads via `thread_id`

### 2. Threads
- A thread is a conversation/execution session
- Identified by `thread_id` in config
- Contains multiple checkpoints (execution history)

### 3. State History
- Complete record of all state changes
- Accessible via `graph.get_state_history(config)`
- Each entry contains state snapshot + checkpoint metadata

## Usage Patterns

### Pattern 1: Retrieve Execution History

```python
# Get all checkpoints for a thread
config = {"configurable": {"thread_id": "fashion_analysis_123"}}

for state_snapshot in graph.get_state_history(config):
    print(f"Checkpoint: {state_snapshot.config['configurable']['checkpoint_id']}")
    print(f"State: {state_snapshot.values}")
    print(f"Next nodes: {state_snapshot.next}")
```

### Pattern 2: Replay from Checkpoint

```python
# Resume execution from a specific checkpoint
config = {
    "configurable": {
        "thread_id": "fashion_analysis_123",
        "checkpoint_id": "1ef..."  # Specific checkpoint
    }
}

# Replay: re-plays prior steps, executes steps after checkpoint
result = graph.invoke(None, config)  # None = resume from checkpoint
```

### Pattern 3: Fork Execution (Modify & Explore)

```python
# 1. Update state at a checkpoint
graph.update_state(
    config={"configurable": {"thread_id": "fashion_analysis_123"}},
    values={"query": "Modified query for alternative path"},
    as_node="data_collector"  # Act as if this node produced the update
)

# 2. Resume with modified state (creates new fork)
result = graph.invoke(None, config)
```

### Pattern 4: Debug Specific Node

```python
# Find checkpoint right before a failing node
history = list(graph.get_state_history(config))

# Filter for checkpoint before "final_processor"
for snapshot in history:
    if "final_processor" in snapshot.next:
        print("State before final_processor:")
        print(snapshot.values)
        
        # Modify state to test alternative inputs
        graph.update_state(
            config=snapshot.config,
            values={"content_analysis": [modified_data]},
            as_node="content_analyzer"
        )
        break
```

## Real-World Use Cases for Fashion Agent

### Use Case 1: Debug Failed Trend Analysis

```python
# Find where final_processor failed
config = {"configurable": {"thread_id": "failed_run_456"}}

for state in graph.get_state_history(config):
    if state.next == ["final_processor"]:
        print("Inputs to final_processor:")
        print(f"Content Analysis: {state.values.get('content_analysis')}")
        print(f"Video Analysis: {state.values.get('video_analysis')}")
        
        # Test with modified data
        graph.update_state(
            config=state.config,
            values={"content_analysis": [test_data]},
            as_node="content_analyzer"
        )
```

### Use Case 2: Re-run Outfit Design with Different Trends

```python
# Get state before outfit_designer
config = {"configurable": {"thread_id": "fashion_analysis_789"}}

for state in graph.get_state_history(config):
    if "outfit_designer" in state.next:
        # Fork: try different trend analysis
        graph.update_state(
            config=state.config,
            values={"trend_analysis": alternative_trends},
            as_node="final_processor"
        )
        
        # Resume from modified checkpoint
        new_result = graph.invoke(None, state.config)
        break
```

### Use Case 3: Compare Parallel Branch Results

```python
# Examine what content_analyzer and video_analyzer produced
config = {"configurable": {"thread_id": "fashion_analysis_123"}}

for state in graph.get_state_history(config):
    if "coordination" in state.next:  # Right after both analyzers
        print("Content Analyzer Output:")
        print(state.values.get("content_analysis"))
        
        print("\nVideo Analyzer Output:")
        print(state.values.get("video_analysis"))
        
        # Both should be present due to operator.add reducer
```

## Advantages Over JSON Archiving

| Feature | Time Travel | JSON Archiving |
|---------|-------------|----------------|
| Automatic | ✅ Built-in | ❌ Manual code |
| Queryable | ✅ Filter by checkpoint | ❌ File-based |
| Replayable | ✅ Resume execution | ❌ Static data |
| Forkable | ✅ Modify & explore | ❌ Read-only |
| State-aware | ✅ Exact node boundaries | ❌ Custom logic |
| Memory efficient | ✅ Incremental diffs | ❌ Full copies |

## Important Notes

### Checkpoint Persistence
- **Local Dev**: SqliteSaver stores in `data/checkpoints.db`
- **Production**: PostgreSQL (auto-configured in LangSmith)
- **TTL**: Configure checkpoint retention via `langgraph.json`

### Replay Behavior
- **Before checkpoint**: Steps are re-played (not re-executed)
- **After checkpoint**: Steps are executed fresh (creates new fork)
- **Determinism**: Wrap non-deterministic ops in `@task` decorator

### Thread Isolation
- Each `thread_id` has independent checkpoint history
- Use meaningful IDs: `f"fashion_analysis_{user_id}_{timestamp}"`
- Query by thread to get session-specific history

## Migration from JSON Archiving

### Before (Redundant)
```python
# Manual archiving to olds/ folder
await archive_output_jsons()

# Later: manually load JSON to inspect
with open("olds/trend_processor_output_20241118.json") as f:
    old_data = json.load(f)
```

### After (Time Travel)
```python
# Automatic checkpointing (no code needed)
# Checkpointer saves at every superstep

# Later: query execution history
config = {"configurable": {"thread_id": "fashion_analysis_123"}}
for state in graph.get_state_history(config):
    if "final_processor" in state.values:
        trend_data = state.values["final_processor"]
        # Access any historical state!
```

## Summary

✅ **Removed**: `archive_output_jsons()` - redundant with built-in checkpointing
✅ **Use Instead**: `graph.get_state_history(config)` - query any historical state
✅ **Benefit**: Automatic, queryable, replayable execution history with zero manual code

LangGraph's time travel gives you a complete audit trail of every execution, with the ability to replay and fork at any point - far more powerful than static JSON archiving.
