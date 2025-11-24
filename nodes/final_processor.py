"""Final Processor Node - Synthesizes content and video analysis into unified trends."""

import asyncio
import json
import os
import time
import traceback
from typing import Dict, Any

from fashion_agent.config import file_logger, console_logger, MAX_RETRIES, BASE_DELAY
from fashion_agent.state import TrendAnalysisList
from fashion_agent.agents.builders import build_agent4_modern


async def final_processor_node(state: Dict[str, Any], config) -> Dict[str, Any]:
    """LangGraph node for final processing - synthesizes content and video analysis."""
    
    async def load_trend_processor_output():
        """Check if cached trend processor output exists."""
        output_file = "data/trend_processor_output.json"
        if await asyncio.to_thread(os.path.exists, output_file):
            try:
                with await asyncio.to_thread(open, output_file, "r") as f:
                    content = await asyncio.to_thread(f.read)
                    data = json.loads(content)
                    structured_output = TrendAnalysisList(**data)
                
                file_logger.info("Loaded Trend Processor output from file, skipping agent execution.")
                return {
                    "final_report": structured_output.model_dump(),  # Dict, not list
                    "agent_memories": {
                        "final_processor": {
                            "trends_analyzed": structured_output.total_trends,
                            "top_trends": len(structured_output.top_5_trends)
                        }
                    },
                    "execution_status": {
                        "final_processor": "completed"
                    }
                }
            except Exception as e:
                file_logger.warning(f"Failed to load cached Trend Processor output: {e}. Will rerun agent.")
        return None
    
    cached = await load_trend_processor_output()
    if cached:
        from ..utils import storage
        await asyncio.to_thread(storage.update_final_report, 
                               record_id=f"fashion_analysis_{config['configurable']['thread_id']}", 
                               data=cached)
        return cached
    
    console_logger.info("Starting Final Processor Agent...")
    
    try:
        # Get content analysis and video analysis from previous steps
        content_analysis = state.get("content_analysis", [])
        video_analysis = state.get("video_analysis", [])
        
        if not content_analysis:
            file_logger.warning("No content analysis found for final processing")
            return {
                "final_report": {},  # Empty dict, not empty list
                "errors": {"final_processor": "No content analysis available"},
                "execution_status": {"final_processor": "skipped"}
            }
        
        # Build agent for trend synthesis
        agent4 = await build_agent4_modern()
        
        # Prepare input for final processor
        # Format the analysis data clearly for the agent
        input_message = (
            "Synthesize the following fashion trend data from web content analysis and video analysis:\n\n"
            "## Content Analysis Data\n"
            f"{json.dumps(content_analysis, indent=2)}\n\n"
            "## Video Trend Data\n"
            f"{json.dumps(video_analysis, indent=2)}\n\n"
            "Please analyze this data and produce a comprehensive TrendAnalysisList with quantitative backing."
        )
        
        # Log the input message
        file_logger.info("="*80)
        file_logger.info("FINAL PROCESSOR INPUT MESSAGE:")
        file_logger.info(input_message)
        file_logger.info("="*80)
        
        # Retry logic with exponential backoff
        for attempt in range(MAX_RETRIES):
            try:
                file_logger.info(f"Final Processor attempt {attempt + 1}/{MAX_RETRIES}")
                
                start_time = time.time()
                result = await agent4.ainvoke(
                    {"messages": [("user", input_message)]},
                    config=config
                )
                end_time = time.time()
                
                file_logger.info(f"Final Processor completed in {end_time - start_time:.2f}s")
                file_logger.info(f"Final Processor result type: {type(result)}")
                
                # Log the raw agent result
                file_logger.info("="*80)
                file_logger.info("FINAL PROCESSOR RAW AGENT RESULT:")
                file_logger.info(json.dumps(result if isinstance(result, dict) else str(result), indent=2, default=str))
                file_logger.info("="*80)
                
                # Extract structured output from agent result (same pattern as content_analyzer)
                if isinstance(result, dict) and "structured_response" in result:
                    structured_output = result["structured_response"]
                    file_logger.info(f"Got structured response: {type(structured_output)}")
                    # Ensure it's a TrendAnalysisList instance
                    if not isinstance(structured_output, TrendAnalysisList):
                        structured_output = TrendAnalysisList(**structured_output)
                elif isinstance(result, TrendAnalysisList):
                    structured_output = result
                else:
                    raise ValueError(f"Unexpected result structure: {type(result)}, missing structured_response key")
                
                if structured_output:
                    # Log raw output
                    file_logger.info("="*80)
                    file_logger.info("FINAL PROCESSOR RAW OUTPUT:")
                    file_logger.info(json.dumps(structured_output.model_dump(), indent=2))
                    file_logger.info("="*80)
                    
                    # Persist to disk
                    output_data = structured_output.model_dump()
                    await asyncio.to_thread(
                        lambda: json.dump(output_data, open("data/trend_processor_output.json", "w"), indent=4)
                    )
                    
                    # Update storage
                    from ..utils import storage
                    await asyncio.to_thread(storage.update_final_report,
                                          record_id=f"fashion_analysis_{config['configurable']['thread_id']}",
                                          data=output_data)
                    
                    return {
                        "final_report": output_data,  # Dict, not list
                        "agent_memories": {
                            "final_processor": {
                                "trends_analyzed": structured_output.trend_analysis.total_outfits_analyzed,
                                "top_trends": len(structured_output.trend_analysis.style_trends),
                                "avg_confidence": structured_output.overall_confidence_score,
                                "processing_time": end_time - start_time
                            }
                        },
                        "execution_status": {"final_processor": "completed"}
                    }
                else:
                    raise ValueError("Failed to parse Final Processor output")
                    
            except Exception as e:
                file_logger.error(f"Final Processor attempt {attempt + 1} failed: {e}")
                if attempt < MAX_RETRIES - 1:
                    wait_time = BASE_DELAY * (2 ** attempt)
                    file_logger.info(f"Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                else:
                    raise
        
    except Exception as e:
        file_logger.error(f"ERROR: Final Processor error: {e}")
        file_logger.error(f"Final processor traceback: {traceback.format_exc()}")
        return {
            "final_report": {},  # Empty dict, not empty list
            "errors": {"final_processor": str(e)},
            "execution_status": {"final_processor": "failed"}
        }
