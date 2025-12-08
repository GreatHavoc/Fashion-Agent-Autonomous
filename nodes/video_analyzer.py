"""
Video Analyzer Node - Analyzes fashion videos for trends.

Processes fashion show videos to identify silhouettes, colors, fabrics, and patterns.

VIDEO URL CONFIGURATION:
- Add VIDEO_URLS list to config.py: VIDEO_URLS = ["url1", "url2", ...]
- If no URLs configured, video analysis is skipped (returns empty results)
"""

import os
import json
import asyncio
import re
import traceback
from typing import Dict, Any
from langgraph.func import task
from langchain_core.messages import HumanMessage

from fashion_agent.utils import storage
from fashion_agent.config import file_logger, console_logger, MAX_RETRIES, BASE_DELAY, token_tracker
from fashion_agent.state import VideoTrendOutput
from fashion_agent.agents import build_agent3_modern
from fashion_agent.tools import load_video_urls
from langchain_core.messages import AIMessage


async def video_analyzer_node(state: Dict[str, Any], config) -> Dict[str, Any]:
    """
    LangGraph node for video analysis.
    
    Analyzes fashion videos in parallel to the data collector chain.
    """
    # CACHE DISABLED - Always run agent fresh
    # # Check for cached output from previous run
    # def load_cached_output():
    #     output_file = "data/video_analyzer_output.json"
    #     if os.path.exists(output_file):
    #         try:
    #             with open(output_file, "r") as f:
    #                 structured_output = VideoTrendOutput(**json.load(f))
    #             
    #             # Inject video URLs into cached per-video results if missing
    #             video_urls = load_video_urls()
    #             if structured_output.per_video_results:
    #                 urls_injected = 0
    #                 for idx, video_result in enumerate(structured_output.per_video_results):
    #                     if idx < len(video_urls):
    #                         # Check if video_url is missing or None
    #                         if not video_result.video_url:
    #                             video_result.video_url = video_urls[idx]
    #                             urls_injected += 1
    #                 if urls_injected > 0:
    #                     file_logger.info(f"Injected {urls_injected} missing video URLs into cached results")
    #             
    #             return {
    #                 "video_analysis": [structured_output.model_dump()],
    #                 "agent_memories": {
    #                     **state.get("agent_memories", {}),
    #                     "video_analyzer": {"processed_videos": len(structured_output.per_video_results)}
    #                 },
    #                 "execution_status": {
    #                     **state.get("execution_status", {}),
    #                     "video_analyzer": "completed"
    #                 }
    #             }
    #         except Exception as e:
    #             file_logger.warning(f"Failed to load cached Video Analyzer output: {e}. Will rerun agent.")
    #     return None
    # 
    # cached = load_cached_output()
    # if cached:
    #     await asyncio.to_thread(
    #         storage.update_video_analyzer,
    #         record_id=f"fashion_analysis_{config['configurable']['thread_id']}",
    #         data=cached
    #     )
    #     return cached
    
    console_logger.info("Starting Video Analyzer Agent...")
    file_logger.debug(f"Input state keys: {list(state.keys())}")
    
    try:
        session_id = f"fashion_analysis_{config['configurable']['thread_id']}"
        file_logger.info(f"Video analyzer session ID: {session_id}")
        
        # Load default video URLs from config
        video_urls = load_video_urls()
        console_logger.info(f"Loaded {len(video_urls)} video URLs from config")
        
        # Also check for user-provided video URLs
        user_input = state.get("user_input", {})
        custom_videos = user_input.get("custom_videos", [])
        if custom_videos:
            video_urls.extend(custom_videos)
            console_logger.info(f"Added {len(custom_videos)} custom video URLs from user input")
        
        console_logger.info(f"Total video URLs to analyze: {len(video_urls)}")
        
        # If no video URLs configured, return early with empty analysis
        if len(video_urls) == 0:
            console_logger.warning("Skipping video analysis - no video URLs configured")
            return {
                "video_analysis": [{}],  # Return list with empty dict to match state schema
                "execution_status": {
                    **state.get("execution_status", {}),
                    "video_analyzer": "skipped"
                }
            }
        
        user_input = f"""
        Analyze fashion videos for trend identification.
        Query: {state.get('query', '')}
        Video URLs: {json.dumps(video_urls)}
        Use your MCP video processing tools to analyze trends and extract insights.
        """
        
        # Use @task to isolate agent execution from checkpointing
        @task
        async def run_video_analyzer_agent():
            agent = await build_agent3_modern()
            
            # Retry logic with exponential backoff
            for attempt in range(MAX_RETRIES + 1):
                try:
                    file_logger.info(f"Video analyzer attempt {attempt + 1}/{MAX_RETRIES + 1}")
                    # Add timeout to prevent indefinite hanging
                    # Invoke agent WITHOUT checkpointer config to prevent MCP tool pickling errors
                    result = await asyncio.wait_for(
                        agent.ainvoke(
                            {"messages": [HumanMessage(content=user_input)]},
                            config={"configurable": {"checkpoint_ns": ""}}  # Disable checkpointing for subgraph
                        ),
                        timeout=300.0  # 5 minutes timeout
                    )
                    file_logger.info(f"Video Analyzer result type: {type(result)}")
                    
                    # Extract structured output INSIDE task to avoid pickling agent result
                    if isinstance(result, dict) and "structured_response" in result:
                        structured_output = result["structured_response"]
                        file_logger.info(f"Got structured response: {type(structured_output)}")
                        
                        # Inject video URLs into each per-video result for backtracking
                        if structured_output.per_video_results and len(structured_output.per_video_results) == len(video_urls):
                            for idx, video_result in enumerate(structured_output.per_video_results):
                                video_result.video_url = video_urls[idx]
                            file_logger.info(f"Injected {len(video_urls)} video URLs into results")
                        elif structured_output.per_video_results:
                            file_logger.warning(f"Video result count ({len(structured_output.per_video_results)}) doesn't match URL count ({len(video_urls)})")
                        
                        # Extract token usage from messages
                        messages = result.get("messages", [])
                        for msg in reversed(messages):
                            if isinstance(msg, AIMessage) and hasattr(msg, 'usage_metadata') and msg.usage_metadata:
                                token_tracker.set_current_agent("video_analyzer")
                                token_tracker.add_usage(
                                    input_tokens=msg.usage_metadata.get("input_tokens", 0),
                                    output_tokens=msg.usage_metadata.get("output_tokens", 0),
                                    total_tokens=msg.usage_metadata.get("total_tokens", 0)
                                )
                                break
                        
                        # Return only the serializable Pydantic model dict
                        return structured_output.model_dump()
                    else:
                        # Create fallback structured output
                        file_logger.warning(f"Unexpected result structure: {type(result)}")
                        file_logger.info("Creating fallback video structured output")
                        structured_output = VideoTrendOutput(
                            per_video_results=[],
                            metrics_summary={},
                            trending_elements={},
                            commercial_insights={},
                            technical_quality={}
                        )
                        return structured_output.model_dump()
                except asyncio.TimeoutError:
                    file_logger.error(f"Video analyzer timed out on attempt {attempt + 1}")
                    if attempt < MAX_RETRIES:
                        await asyncio.sleep(BASE_DELAY)
                        continue
                    else:
                        raise RuntimeError("Video analyzer exceeded max retries due to timeouts")
                except Exception as e:
                    error_str = str(e)
                    if "429" in error_str or "quota" in error_str.lower() or "rate" in error_str.lower():
                        if attempt < MAX_RETRIES:
                            delay_match = re.search(r"retry in ([\d.]+)s", error_str)
                            if delay_match:
                                delay = float(delay_match.group(1))
                            else:
                                delay = BASE_DELAY * (2 ** attempt)
                            file_logger.warning(f"Rate limit hit in video analyzer (attempt {attempt + 1}). Retrying in {delay} seconds...")
                            file_logger.warning(f"Error details: {error_str}")
                            await asyncio.sleep(delay)
                            continue
                        else:
                            file_logger.error(f"Max retries exceeded for rate limiting in video analyzer: {e}")
                            raise
                    else:
                        file_logger.error(f"Non-rate-limit error in video analyzer: {e}")
                        raise
        
        # Execute agent in isolated task context - returns serialized dict
        structured_output_dict = await run_video_analyzer_agent()
        
        # Convert back to Pydantic model for processing
        structured_output = VideoTrendOutput(**structured_output_dict)
        
        # Use @task for blocking file write to avoid blocking async event loop
        @task
        def save_output_to_disk():
            with open("data/video_analyzer_output.json", "w") as f:
                json.dump(structured_output.model_dump(), f, indent=2)
        
        file_logger.info("="*80)
        file_logger.info("VIDEO ANALYZER RAW OUTPUT:")
        file_logger.info(json.dumps(structured_output.model_dump(), indent=2))
        file_logger.info("="*80)
        await save_output_to_disk()
        file_logger.info("Video analyzer output saved")
        
        # Create return dictionary with proper state isolation
        return_dict = {
            "video_analysis": [structured_output.model_dump()],
            "agent_memories": {
                **state.get("agent_memories", {}),
                "video_analyzer": {"processed_videos": len(video_urls)}
            },
            "execution_status": {
                **state.get("execution_status", {}),
                "video_analyzer": "completed"
            },
            "token_usage": token_tracker.get_usage()
        }
        
        console_logger.info(f"Video analyzer returning analysis with {len(return_dict['video_analysis'])} results")
        file_logger.debug(f"Video return dict keys: {list(return_dict.keys())}")
        console_logger.info("[Agent 3] Consolidating video findings...")
        return return_dict
        
    except Exception as e:
        file_logger.error(f"ERROR: Video Analyzer error: {e}")
        file_logger.error(f"Video analyzer traceback: {traceback.format_exc()}")
        return {
            "video_analysis": [],
            "errors": {**state.get("errors", {}), "video_analyzer": str(e)},
            "execution_status": {
                **state.get("execution_status", {}),
                "video_analyzer": "failed"
            }
        }
