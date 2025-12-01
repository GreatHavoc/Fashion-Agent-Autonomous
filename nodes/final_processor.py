"""Final Processor Node - Synthesizes content and video analysis into unified trends."""

import asyncio
import json
import os
import time
import traceback
from typing import Dict, Any
from langgraph.func import task

from fashion_agent.config import file_logger, console_logger, MAX_RETRIES, BASE_DELAY
from fashion_agent.state import TrendAnalysisList
from fashion_agent.agents.builders import build_agent4_modern
from fashion_agent.utils import storage


async def final_processor_node(state: Dict[str, Any], config) -> Dict[str, Any]:
    """LangGraph node for final processing - synthesizes content and video analysis."""
    
    # Check for cached output from previous run
    def load_cached_output():
        output_file = "data/trend_processor_output.json"
        if os.path.exists(output_file):
            try:
                with open(output_file, "r") as f:
                    structured_output = TrendAnalysisList(**json.load(f))
                file_logger.info("Loaded Trend Processor output from file, skipping agent execution.")
                return {
                    "final_processor": structured_output.model_dump(),
                    "agent_memories": {
                        **state.get("agent_memories", {}),
                        "final_processor": {
                            "trends_analyzed": structured_output.trend_analysis.total_sources_analyzed,
                            "top_trends": len(structured_output.trend_analysis.style_trends),
                            "avg_confidence": structured_output.overall_confidence_score,
                            "processing_time": 0
                        }
                    },
                    "execution_status": {
                        **state.get("execution_status", {}),
                        "final_processor": "completed"
                    }
                }
            except Exception as e:
                file_logger.warning(f"Failed to load cached Trend Processor output: {e}. Will rerun agent.")
        return None
    
    cached = load_cached_output()
    if cached:
        await asyncio.to_thread(
            storage.update_final_report,
            record_id=f"fashion_analysis_{config['configurable']['thread_id']}",
            data=cached
        )
        return cached
    
    console_logger.info("Starting Final Processor Agent...")
    
    try:
        # Get content analysis and video analysis from previous steps
        content_analysis = state.get("content_analysis", [])
        video_analysis = state.get("video_analysis", [])
        data_urls = state.get("data_urls", [])
        
        if not content_analysis:
            file_logger.warning("No content analysis found for final processing")
            return {
                "final_processor": {},
                "errors": {"final_processor": "No content analysis available"},
                "execution_status": {"final_processor": "skipped"}
            }
        
        # Build agent for trend synthesis
        agent4 = await build_agent4_modern()
        
        # Extract video URLs from video analysis for source tracking
        video_urls = []
        for analysis in video_analysis:
            if isinstance(analysis, dict):
                for video_result in analysis.get("per_video_results", []):
                    if video_result.get("video_url"):
                        video_urls.append(video_result["video_url"])
        
        file_logger.info(f"Source tracking: {len(data_urls)} web URLs, {len(video_urls)} video URLs")
        
        # Prepare input for final processor with source URL tracking
        input_message = (
            "Synthesize the following fashion trend data from web content analysis and video analysis:\n\n"
            "## Web Article Sources\n"
            f"{json.dumps([{'url': u.get('url', ''), 'title': u.get('title', '')} for u in data_urls], indent=2)}\n\n"
            "## Video Sources\n"
            f"{json.dumps([{'video_url': url} for url in video_urls], indent=2)}\n\n"
            "## Content Analysis Data\n"
            f"{json.dumps(content_analysis, indent=2)}\n\n"
            "## Video Trend Data\n"
            f"{json.dumps(video_analysis, indent=2)}\n\n"
            "IMPORTANT SOURCE TRACKING:\n"
            "For EVERY trend you identify (color, style, pattern, print, material, silhouette):\n"
            "1. Track which source URLs (BOTH web articles and videos) mentioned this trend\n"
            "2. Populate the source_urls field with those URLs\n"
            "3. If a trend appears in content_analysis from a specific URL, include that article URL\n"
            "4. If a trend appears in video_analysis from a specific video, include that video_url\n"
            "5. Each trend's source_urls array should contain a mix of web article URLs and video URLs\n"
            "6. Ensure EVERY trend has at least one source_url for complete traceability\n\n"
            "Please analyze this data and produce a comprehensive TrendAnalysisList with quantitative backing and complete source attribution."
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
                    
                    # Use @task for blocking file write to avoid blocking async event loop
                    @task
                    def save_output_to_disk():
                        with open("data/trend_processor_output.json", "w") as f:
                            json.dump(structured_output.model_dump(), f, indent=4)
                    
                    await save_output_to_disk()
                    file_logger.info("Final processor output saved")
                    
                    # Update storage
                    await asyncio.to_thread(
                        storage.update_final_report,
                        record_id=f"fashion_analysis_{config['configurable']['thread_id']}",
                        data=structured_output.model_dump()
                    )
                    
                    return {
                        "final_processor": structured_output.model_dump(),
                        "agent_memories": {
                            **state.get("agent_memories", {}),
                            "final_processor": {
                                "trends_analyzed": structured_output.trend_analysis.total_sources_analyzed,
                                "top_trends": len(structured_output.trend_analysis.style_trends),
                                "avg_confidence": structured_output.overall_confidence_score,
                                "processing_time": end_time - start_time
                            }
                        },
                        "execution_status": {
                            **state.get("execution_status", {}),
                            "final_processor": "completed"
                        }
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
            "final_processor": {},
            "errors": {"final_processor": str(e)},
            "execution_status": {"final_processor": "failed"}
        }

