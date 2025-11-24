# Human-in-the-Loop (HITL) Guide

This guide explains how to use the human-in-the-loop features in the Fashion Analysis workflow.

## Overview

The workflow now includes **two human review points**:

1. **Initial Input Collection** - Provide custom URLs, images, and videos before analysis starts
2. **Outfit Review** - Approve, reject, or request edits to outfit designs before video generation

## Workflow with HITL

```
START
  ↓
[User Input Collector] ← HITL PAUSE 1: Provide URLs/images
  ↓
[Data Collector + Video Analyzer] (parallel)
  ↓
[Content Analyzer + Video Analyzer] → [Coordination]
  ↓
[Final Processor] → [Outfit Designer]
  ↓
[Outfit Reviewer] ← HITL PAUSE 2: Approve/Reject/Edit outfits
  ↓
[Video Generator] (only if approved)
  ↓
END
```

## 1. Initial Input Collection

### Purpose
Customize the analysis by providing your own data sources before the workflow starts.

### What You Can Provide

```json
{
  "custom_urls": [
    "https://vogue.com/fashion-week-2025",
    "https://elle.com/sustainable-fashion"
  ],
  "custom_images": [
    "path/to/runway/image1.jpg",
    "path/to/lookbook/image2.png"
  ],
  "custom_videos": [
    "https://youtube.com/watch?v=fashion-show-2025",
    "https://vimeo.com/sustainable-fashion-trends"
  ],
  "query": "Analyze summer 2025 sustainable fashion trends with focus on minimalism"
}
```

### Usage Example

```python
from langgraph.types import Command

# Start the workflow
result = graph.invoke(
    {"query": "Fashion trend analysis"},
    config={"configurable": {"thread_id": "session_123"}}
)

# Workflow pauses at user_input_collector
if "__interrupt__" in result:
    print(result["__interrupt__"][0].value["message"])
    # "Provide custom URLs, images, and videos for fashion analysis"

# Resume with your custom data
result = graph.invoke(
    Command(resume={
        "custom_urls": ["https://vogue.com/..."],
        "custom_images": ["path/to/image.jpg"],
        "custom_videos": ["https://youtube.com/..."],
        "query": "Analyze sustainable fashion trends"
    }),
    config={"configurable": {"thread_id": "session_123"}}
)
```

### Notes
- All fields are **optional** - you can provide only URLs, only images, or any combination
- If you provide nothing, the workflow uses default sources
- Images should be local file paths or publicly accessible URLs
- Videos should be YouTube, Vimeo, or other video platform URLs

## 2. Outfit Review

### Purpose
Review and approve outfit designs before expensive video generation starts.

### Decision Types

#### **Approve** ✅
Continue to video generation with the current designs.

```json
{
  "decision_type": "approve"
}
```

#### **Reject** ❌
Stop the workflow. **Mandatory feedback required**.

```json
{
  "decision_type": "reject",
  "rejection_feedback": "The color palette doesn't match summer trends. Too dark and heavy for the season.",
  "selected_outfit_ids": ["outfit_1", "outfit_3"]
}
```

**Requirements:**
- `rejection_feedback` is **mandatory** - explain why you're rejecting
- Workflow **stops** at outfit_reviewer
- No video generation occurs

#### **Edit** ✏️
Request changes and regenerate outfits. **Mandatory instructions required**.

```json
{
  "decision_type": "edit",
  "edit_instructions": "Make the color palette lighter and add more pastels. Focus on flowing fabrics instead of structured pieces.",
  "selected_outfit_ids": []
}
```

**Requirements:**
- `edit_instructions` is **mandatory** - specify what changes you want
- Outfit designer will regenerate with your instructions
- You'll get another review after regeneration
- Empty `selected_outfit_ids` means edit all outfits

### Usage Example

```python
# Workflow continues from user input and pauses at outfit_reviewer
result = graph.invoke(
    None,  # Continue from last checkpoint
    config={"configurable": {"thread_id": "session_123"}}
)

# Check if paused for outfit review
if "__interrupt__" in result:
    interrupt_data = result["__interrupt__"][0].value
    print(f"Review {interrupt_data['total_outfits']} outfits:")
    
    for outfit in interrupt_data["outfits"]:
        print(f"- {outfit['name']}: {outfit['description']}")
        print(f"  Image: {outfit['image_path']}")

# Option 1: Approve all outfits
result = graph.invoke(
    Command(resume={"decision_type": "approve"}),
    config={"configurable": {"thread_id": "session_123"}}
)

# Option 2: Reject specific outfits
result = graph.invoke(
    Command(resume={
        "decision_type": "reject",
        "rejection_feedback": "Colors don't match the sustainable theme",
        "selected_outfit_ids": ["outfit_1"]
    }),
    config={"configurable": {"thread_id": "session_123"}}
)

# Option 3: Request edits
result = graph.invoke(
    Command(resume={
        "decision_type": "edit",
        "edit_instructions": "Use more earth tones and natural fabrics. Add accessories made from recycled materials."
    }),
    config={"configurable": {"thread_id": "session_123"}}
)
```

## Validation Rules

### User Input
- No validation - all fields are optional
- Invalid URLs/paths won't break the workflow (gracefully handled)

### Outfit Review
- `decision_type` must be one of: `"approve"`, `"reject"`, `"edit"`
- If `decision_type == "reject"`: `rejection_feedback` is **mandatory** (non-empty string)
- If `decision_type == "edit"`: `edit_instructions` is **mandatory** (non-empty string)
- `selected_outfit_ids` is always optional (empty list means all outfits)

## Error Handling

### Invalid User Input
If user input validation fails, the workflow continues with empty user input (default sources).

### Invalid Review Decision
If outfit review validation fails:
- Error is logged to `state["errors"]["outfit_reviewer"]`
- `awaiting_outfit_review` flag is set to `False`
- Workflow may stop or continue based on error severity

### Missing Feedback
If you try to reject/edit without providing mandatory feedback:
```
ValueError: rejection_feedback is mandatory when decision is 'reject'
ValueError: edit_instructions is mandatory when decision is 'edit'
```

## State Fields

### Added to FashionAnalysisState

```python
user_input: Dict[str, Any]  # UserInput.model_dump()
awaiting_outfit_review: bool  # True when paused for review
outfit_review_decision: Dict[str, Any]  # OutfitReviewDecision.model_dump()
```

### Accessing Review Data

```python
# Check if waiting for review
if state.get("awaiting_outfit_review"):
    print("Workflow is paused for outfit review")

# Get the review decision
decision = state.get("outfit_review_decision", {})
if decision.get("decision_type") == "reject":
    print(f"Rejected: {decision['rejection_feedback']}")
```

## Best Practices

1. **Provide Specific Feedback**: When rejecting/editing, be specific about what you want changed
2. **Use Selected IDs**: If only some outfits need changes, specify their IDs
3. **Descriptive Queries**: Provide detailed queries in user input for better results
4. **Review All Outfits**: Check each outfit's description, colors, and image before approving
5. **Save Thread IDs**: Keep track of your `thread_id` to resume interrupted sessions

## Example: Complete HITL Session

```python
from langgraph.types import Command

config = {"configurable": {"thread_id": "my_session_001"}}

# Step 1: Start workflow
result = graph.invoke({"query": "Analyze trends"}, config)

# Step 2: Provide custom input
result = graph.invoke(
    Command(resume={
        "custom_urls": ["https://vogue.com/trends-2025"],
        "custom_images": ["runway_look_1.jpg"],
        "query": "Focus on minimalist sustainable fashion"
    }),
    config
)

# Step 3: Wait for outfit review (workflow runs data collection, analysis, etc.)
# ... (workflow processing) ...

# Step 4: Review outfits
if "__interrupt__" in result:
    outfits = result["__interrupt__"][0].value["outfits"]
    # Display outfits to user for review

# Step 5: Request edits
result = graph.invoke(
    Command(resume={
        "decision_type": "edit",
        "edit_instructions": "Make outfit_2 more colorful, use brighter pastels"
    }),
    config
)

# Step 6: Review regenerated outfits
# ... (outfit designer regenerates) ...

# Step 7: Approve
result = graph.invoke(
    Command(resume={"decision_type": "approve"}),
    config
)

# Step 8: Videos are generated
print("Workflow complete! Videos generated.")
```

## Debugging

### Check Interrupt Points
```python
result = graph.invoke(input, config)
if "__interrupt__" in result:
    print("Paused at:", result["__interrupt__"][0].value["message"])
```

### View State at Interrupt
```python
state = graph.get_state(config)
print("Current state:", state.values)
print("Awaiting review:", state.values.get("awaiting_outfit_review"))
```

### Resume from Any Point
```python
# Get all checkpoints for a thread
history = list(graph.get_state_history(config))
print(f"Found {len(history)} checkpoints")

# Resume from specific checkpoint
specific_config = {
    "configurable": {
        "thread_id": "my_session",
        "checkpoint_id": history[2].config["configurable"]["checkpoint_id"]
    }
}
result = graph.invoke(Command(resume=data), specific_config)
```
