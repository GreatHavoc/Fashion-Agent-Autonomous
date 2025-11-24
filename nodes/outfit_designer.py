"""Outfit Designer Node - Creates outfit designs with reflection capabilities."""

import asyncio
import json
import os
import time
import traceback
from typing import Dict, Any

from fashion_agent.config import file_logger, console_logger, MAX_RETRIES, BASE_DELAY
from fashion_agent.state import ListofOutfits
from fashion_agent.agents.builders import build_agent5_modern


async def outfit_designer_node(state: Dict[str, Any], config) -> Dict[str, Any]:
    """LangGraph node for outfit design - uses memory and reflection."""
    
    async def load_outfit_designer_output():
        """Check if cached outfit designer output exists."""
        output_file = "data/outfit_designer_output.json"
        if await asyncio.to_thread(os.path.exists, output_file):
            try:
                with await asyncio.to_thread(open, output_file, "r") as f:
                    content = await asyncio.to_thread(f.read)
                    data = json.loads(content)
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
                final_report = state.get("final_report", {})
                trend_analysis = final_report.get("trend_analysis", {})
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
    
    cached = await load_outfit_designer_output()
    if cached:
        from ..utils import storage
        await asyncio.to_thread(storage.update_outfit_generation,
                               record_id=f"fashion_analysis_{config['configurable']['thread_id']}",
                               data=cached)
        return cached
    
    console_logger.info("Starting Outfit Designer Agent...")
    
    try:
        # Get trend analysis from final processor output stored in final_report
        final_report = state.get("final_report", {})
        trend_analysis = final_report.get("trend_analysis", {})
        
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
        
        # Prepare input with trend analysis
        designer_input = {
            "trend_analysis": trend_analysis,
            "design_timestamp": state.get("analysis_timestamp", "")
        }
        
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
                # Invoke agent WITHOUT checkpointer config to prevent MCP tool pickling errors
                result = await agent5.ainvoke(
                    {"messages": [("user", input_json)]},
                    config={"configurable": {"checkpoint_ns": ""}}  # Disable checkpointing for subgraph
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
        
        # Persist to disk
        await asyncio.to_thread(
            lambda: json.dump(output_data, open("data/outfit_designer_output.json", "w"), indent=4)
        )
        
        # Create dashboard data by combining trend analysis and outfit designs
        dashboard_data = {
            "trend_analysis": trend_analysis,
            "outfit_designs": [output_data]
        }
        await asyncio.to_thread(
            lambda: json.dump(dashboard_data, open("data/dashboard_data.json", "w"), indent=4)
        )
        file_logger.info("Created data/dashboard_data.json with trend analysis and outfit designs")
        
        # Update storage
        from ..utils import storage
        await asyncio.to_thread(storage.update_outfit_generation,
                              record_id=f"fashion_analysis_{config['configurable']['thread_id']}",
                              data=output_data)
        
        return {
            "outfit_designs": [output_data],
            "agent_memories": {
                **state.get("agent_memories", {}),
                "outfit_designer": {
                    "outfits_created": len(structured_output.Outfits),
                    "processing_time": processing_time
                }
            },
            "execution_status": {
                **state.get("execution_status", {}),
                "outfit_designer": "completed"
            }
        }
        
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
