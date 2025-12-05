"""Outfit Designer Node - Creates outfit designs with reflection capabilities."""

import asyncio
import json
import os
import time
import traceback
from typing import Dict, Any

import aiofiles

from fashion_agent.config import file_logger, console_logger, MAX_RETRIES, BASE_DELAY
from fashion_agent.state import ListofOutfits
from fashion_agent.agents.builders import build_agent5_modern


# Async file I/O helpers to avoid pickling issues with lambda in asyncio.to_thread
async def save_json_async(filepath: str, data: dict) -> None:
    """Async helper to save JSON data to file."""
    async with aiofiles.open(filepath, "w") as f:
        await f.write(json.dumps(data, indent=4))


async def load_json_async(filepath: str) -> dict:
    """Async helper to load JSON data from file."""
    async with aiofiles.open(filepath, "r") as f:
        content = await f.read()
        return json.loads(content)


async def file_exists_async(filepath: str) -> bool:
    """Async helper to check if file exists."""
    return await asyncio.to_thread(os.path.exists, filepath)


async def outfit_designer_node(state: Dict[str, Any], config) -> Dict[str, Any]:
    """LangGraph node for outfit design - uses memory and reflection."""
    
    async def load_outfit_designer_output():
        """Check if cached outfit designer output exists."""
        output_file = "data/outfit_designer_output.json"
        if await file_exists_async(output_file):
            try:
                data = await load_json_async(output_file)
                structured_output = ListofOutfits(**data)
                
                file_logger.info("Loaded Outfit Designer output from file, skipping agent execution.")
                
                # Also ensure dashboard_data.json exists from cached output
                await asyncio.to_thread(_create_dashboard_from_cached, state, structured_output)
                
                return {
                    "outfit_designs": [structured_output.model_dump()],
                    "agent_memories": {
                        **state.get("agent_memories", {}),
                        "outfit_designer": {
                            "outfits_created": len(structured_output.Outfits)
                        }
                    },
                    "execution_status": {
                        **state.get("execution_status", {}),
                        "outfit_designer": "completed"
                    }
                }
            except Exception as e:
                file_logger.warning(f"Failed to load cached Outfit Designer output: {e}. Will rerun agent.")
        return None
    
    def _create_dashboard_from_cached(state: Dict[str, Any], outfits: ListofOutfits):
        """Create dashboard_data.json from cached outputs."""
        try:
            dashboard_file = "data/dashboard_data.json"
            if not os.path.exists(dashboard_file):
                # Load trend analysis from state or file
                final_processor = state.get("final_processor", {})
                trend_analysis = final_processor.get("trend_analysis", {})
                if not trend_analysis and os.path.exists("data/trend_processor_output.json"):
                    with open("data/trend_processor_output.json", "r") as f:
                        file_data = json.load(f)
                        trend_analysis = file_data.get("trend_analysis", {})
                
                dashboard_data = {
                    "trend_analysis": trend_analysis,
                    "outfit_designs": [outfits.model_dump()]
                }
                with open(dashboard_file, "w") as f:
                    json.dump(dashboard_data, f, indent=4)
                file_logger.info("Created data/dashboard_data.json from cached outfit output")
        except Exception as e:
            file_logger.warning(f"Failed to create dashboard from cached data: {e}")
    
    # Check if this is an edit request (revision from outfit_reviewer)
    outfit_review_decision = state.get("outfit_review_decision", {})
    is_edit_request = outfit_review_decision.get("decision_type") == "edit"
    edit_instructions = outfit_review_decision.get("edit_instructions", "")
    selected_outfit_ids = outfit_review_decision.get("selected_outfit_ids", [])
    
    # Only use cache if NOT an edit request
    if not is_edit_request:
        cached = await load_outfit_designer_output()
        if cached:
            from ..utils import storage
            await asyncio.to_thread(storage.update_outfit_generation,
                                   record_id=f"fashion_analysis_{config['configurable']['thread_id']}",
                                   data=cached)
            return cached
    else:
        file_logger.info(f"Edit request detected - skipping cache, will regenerate with instructions: {edit_instructions}")
        file_logger.info(f"Selected outfits to edit: {selected_outfit_ids}")
    
    console_logger.info("Starting Outfit Designer Agent...")
    
    try:
        # Get trend analysis from final processor output stored in final_processor
        final_processor = state.get("final_processor", {})
        trend_analysis = final_processor.get("trend_analysis", {})
        
        if not trend_analysis:
            file_logger.warning("No trend analysis found for outfit design")
            return {
                "outfit_designs": [],
                "errors": {**state.get("errors", {}), "outfit_designer": "No trend analysis available"},
                "execution_status": {
                    **state.get("execution_status", {}),
                    "outfit_designer": "skipped"
                }
            }
        
        # Get existing outfit designs if this is an edit request
        existing_outfits = state.get("outfit_designs", [])
        
        # Prepare input with trend analysis and edit instructions if applicable
        designer_input = {
            "trend_analysis": trend_analysis,
            "design_timestamp": state.get("analysis_timestamp", "")
        }
        
        # Add revision context if this is an edit request
        if is_edit_request:
            designer_input["revision_mode"] = True
            designer_input["edit_instructions"] = edit_instructions
            designer_input["selected_outfits"] = selected_outfit_ids  # Names of outfits to edit
            designer_input["existing_outfits"] = existing_outfits  # Current outfit designs to modify
            file_logger.info(f"Revision mode enabled - editing {len(selected_outfit_ids)} outfits: {selected_outfit_ids}")
        
        input_json = json.dumps(designer_input, indent=2)
        
        # Build and execute agent entirely within node to avoid pickling issues
        # Retry logic with exponential backoff
        output_data = None
        processing_time = 0
        
        for attempt in range(MAX_RETRIES):
            try:
                file_logger.info(f"Outfit Designer attempt {attempt + 1}/{MAX_RETRIES}")
                
                # Build agent fresh for each attempt to avoid stale state
                agent5 = await build_agent5_modern()
                
                start_time = time.time()
                # Pass full parent config to preserve checkpointer and thread_id
                # This avoids pickling issues by letting subgraph share parent's checkpointer
                result = await agent5.ainvoke(
                    {"messages": [("user", input_json)]},
                    config  # Pass parent config completely - preserves checkpointer
                )
                end_time = time.time()
                processing_time = end_time - start_time
                
                file_logger.info(f"Outfit Designer completed in {processing_time:.2f}s")
                file_logger.info(f"Outfit Designer result type: {type(result)}")
                
                # Extract structured output and convert to dict immediately
                if isinstance(result, dict) and "structured_response" in result:
                    structured_output = result["structured_response"]
                    file_logger.info(f"Got structured response: {type(structured_output)}")
                    
                    # Convert to dict immediately, don't keep Pydantic instances or agent references
                    if hasattr(structured_output, 'model_dump'):
                        output_data = structured_output.model_dump()
                    elif isinstance(structured_output, dict):
                        output_data = structured_output
                    else:
                        output_data = dict(structured_output)
                    
                elif isinstance(result, ListofOutfits):
                    output_data = result.model_dump()
                elif isinstance(result, dict):
                    # Fallback if result is already a dict
                    output_data = result
                else:
                    raise ValueError(f"Unexpected result structure: {type(result)}, missing structured_response key")
                
                # Explicitly delete agent and result to free references before returning
                del agent5
                del result
                break  # Success, exit retry loop
                    
            except Exception as e:
                file_logger.error(f"Outfit Designer attempt {attempt + 1} failed: {e}")
                if attempt < MAX_RETRIES - 1:
                    wait_time = BASE_DELAY * (2 ** attempt)
                    file_logger.info(f"Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                else:
                    raise
        
        if output_data is None:
            raise RuntimeError("Failed to get outfit designer output after all retries")
        
        # Convert back to Pydantic model for processing
        structured_output = ListofOutfits(**output_data)
        
        # Log raw output
        file_logger.info("="*80)
        file_logger.info("OUTFIT DESIGNER RAW OUTPUT:")
        file_logger.info(json.dumps(output_data, indent=2))
        file_logger.info("="*80)
        
        # Persist to disk using proper async file operations
        await save_json_async("data/outfit_designer_output.json", output_data)
        
        # Create dashboard data by combining trend analysis and outfit designs
        dashboard_data = {
            "trend_analysis": trend_analysis,
            "outfit_designs": [output_data]
        }
        await save_json_async("data/dashboard_data.json", dashboard_data)
        file_logger.info("Created data/dashboard_data.json with trend analysis and outfit designs")
        
        # Update storage
        from ..utils import storage
        await asyncio.to_thread(storage.update_outfit_generation,
                              record_id=f"fashion_analysis_{config['configurable']['thread_id']}",
                              data=output_data)
        
        # Prepare return with reset of review decision so outfit_reviewer can run again
        result = {
            "outfit_designs": [output_data],
            "agent_memories": {
                **state.get("agent_memories", {}),
                "outfit_designer": {
                    "outfits_created": len(structured_output.Outfits),
                    "processing_time": processing_time,
                    "was_revision": is_edit_request
                }
            },
            "execution_status": {
                **state.get("execution_status", {}),
                "outfit_designer": "completed",
                "outfit_reviewer": "pending"  # Reset so reviewer runs again
            }
        }
        
        # Reset the review decision so the reviewer node will present new outfits
        if is_edit_request:
            result["outfit_review_decision"] = {}  # Clear the edit decision
            file_logger.info("Reset outfit_review_decision after revision completion")
        
        return result
        
    except Exception as e:
        file_logger.error(f"ERROR: Outfit Designer error: {e}")
        file_logger.error(f"Outfit designer traceback: {traceback.format_exc()}")
        return {
            "outfit_designs": [],
            "errors": {**state.get("errors", {}), "outfit_designer": str(e)},
            "execution_status": {
                **state.get("execution_status", {}),
                "outfit_designer": "failed"
            }
        }
