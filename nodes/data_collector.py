"""
Data Collector Node - First agent in the workflow.

Scrapes fashion URLs from various sources and filters relevant content.
"""

import os
import json
import asyncio
import traceback
import re
from datetime import datetime
from typing import Dict, Any
from langgraph.func import task
from langchain_core.messages import HumanMessage

from fashion_agent.utils import storage
from fashion_agent.config import file_logger, console_logger, MAX_RETRIES, BASE_DELAY, token_tracker
from fashion_agent.state import DataCollectorOutput
from fashion_agent.agents import build_agent1_modern
from langchain_core.messages import AIMessage


async def data_collector_node(state: Dict[str, Any], config) -> Dict[str, Any]:
    """
    LangGraph node for data collection.
    
    Scrapes fashion URLs from configured sources and returns curated list.
    """
    # CACHE DISABLED - Always run agent fresh
    # # Check for cached output from previous run
    # def load_cached_output():
    #     output_file = "data/data_collector_output.json"
    #     if os.path.exists(output_file):
    #         try:
    #             with open(output_file, "r") as f:
    #                 structured_output = DataCollectorOutput(**json.load(f))
    #
    #             return {
    #                 "data_collection": structured_output.model_dump(),
    #                 "agent_memories": {
    #                     **state.get("agent_memories", {}),
    #                     "data_collector": {"last_analysis": structured_output.self_analysis}
    #                 },
    #                 "execution_status": {
    #                     **state.get("execution_status", {}),
    #                     "data_collector": "completed"
    #                 }
    #             }
    #         except Exception as e:  
    #             file_logger.warning(f"Failed to load cached Data Collector output: {e}. Will rerun agent.")
    #     return None
    # 
    # cached = load_cached_output()
    # if cached:
    #     await asyncio.to_thread(
    #         storage.update_data_collector,
    #         record_id=f"fashion_analysis_{config['configurable']['thread_id']}",
    #         data=cached
    #     )
    #     return cached
    
    console_logger.info("[Agent 1] Data Collector running...")
    file_logger.info("Starting Data Collector Agent...")
    file_logger.debug(f"Input state keys: {list(state.keys())}")
    console_logger.info("[Agent 1] Scraping websites...")
    
    try:
        session_id = f"fashion_analysis_{config['configurable']['thread_id']}"
        file_logger.info(f"Data collector session ID: {session_id}")
        
        # Get user-provided custom URLs to pass to the agent
        user_input_data = state.get("user_input", {})
        custom_urls = user_input_data.get("custom_urls", [])
        
        custom_urls_instruction = ""
        if custom_urls:
            file_logger.info(f"Passing {len(custom_urls)} custom URLs to data collector agent for validation")
            custom_urls_instruction = f"\n\nUser-provided URLs to validate and include if relevant:\n{json.dumps(custom_urls, indent=2)}\nValidate each URL and only include if it's relevant for fashion trend analysis."
        
        user_input = f"""
        Do not invent any URLs or create fake URLs or use own knowledge to generate URLs.
        Always comment on the url provided by the user.
        Process all and filter URLs for fashion trend analysis.
        User query: {state.get('query')}
        {custom_urls_instruction}
        
        Return structured output with curated URL list and analysis.
        """
        
        # Use @task to COMPLETELY isolate agent execution from checkpointing
        # Build agent, invoke, extract output, and destroy agent all within task scope
        @task
        async def run_data_collector_agent():
            # Build agent inside task
            agent = await build_agent1_modern()
            
            # Retry logic with exponential backoff
            for attempt in range(MAX_RETRIES + 1):
                try:
                    file_logger.info(f"Data collector attempt {attempt + 1}/{MAX_RETRIES + 1}")
                    # Add timeout to prevent indefinite hanging
                    # Invoke agent WITHOUT checkpointer config to prevent MCP tool pickling errors
                    result = await asyncio.wait_for(
                        agent.ainvoke(
                            {"messages": [HumanMessage(content=user_input)]},
                            config={"configurable": {"checkpoint_ns": ""}}  # Disable checkpointing for subgraph
                        ),
                        timeout=300.0  # 5 minutes timeout
                    )
                    console_logger.info(f"Data Collector result type: {type(result)}")
                    file_logger.info(f"SUCCESS: Data collector completed. Agent result type: {type(result)}")
                    
                    # Extract structured output INSIDE task to avoid pickling agent result
                    if isinstance(result, dict) and "structured_response" in result:
                        structured_output = result["structured_response"]
                        file_logger.info(f"Got structured response: {type(structured_output)}")
                        
                        # Extract token usage from messages
                        token_usage = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
                        messages = result.get("messages", [])
                        for msg in reversed(messages):
                            if isinstance(msg, AIMessage) and hasattr(msg, 'usage_metadata') and msg.usage_metadata:
                                token_usage = {
                                    "input_tokens": msg.usage_metadata.get("input_tokens", 0),
                                    "output_tokens": msg.usage_metadata.get("output_tokens", 0),
                                    "total_tokens": msg.usage_metadata.get("total_tokens", 0)
                                }
                                file_logger.info(f"Data collector token usage: {token_usage}")
                                token_tracker.set_current_agent("data_collector")
                                token_tracker.add_usage(**token_usage)
                                break
                        
                        # Return only the serializable Pydantic model dict
                        output_dict = structured_output.model_dump()
                        output_dict["_token_usage"] = token_usage
                        # Clean up agent reference before returning
                        del agent
                        del result
                        return output_dict
                    else:
                        # Fallback: create default output if structure is unexpected
                        file_logger.error(f"Unexpected result structure: {type(result)}, missing structured_response key")
                        structured_output = DataCollectorOutput(
                            data_collection=[],
                            video_urls=[],
                            search_queries=[],
                            metadata={}
                        )
                        output_dict = structured_output.model_dump()
                        # Clean up references
                        del agent
                        del result
                        return output_dict
                except asyncio.TimeoutError:
                    file_logger.error(f"Data collector timed out on attempt {attempt + 1}")
                    if attempt < MAX_RETRIES:
                        await asyncio.sleep(BASE_DELAY)
                        continue
                    else:
                        raise RuntimeError("Data collector exceeded max retries due to timeouts")
                except Exception as e:
                    error_str = str(e)
                    if "429" in error_str or "quota" in error_str.lower() or "rate" in error_str.lower():
                        if attempt < MAX_RETRIES:
                            delay_match = re.search(r"retry in ([\d.]+)s", error_str)
                            if delay_match:
                                delay = float(delay_match.group(1))
                            else:
                                delay = BASE_DELAY * (2 ** attempt)
                            file_logger.warning(f"Rate limit hit in data collector (attempt {attempt + 1}). Retrying in {delay} seconds...")
                            file_logger.warning(f"Error details: {error_str}")
                            await asyncio.sleep(delay)
                            continue
                        else:
                            file_logger.error(f"Max retries exceeded for rate limiting in data collector: {e}")
                            raise
                    else:
                        file_logger.error(f"Non-rate-limit error in data collector: {e}")
                        raise
        
        # Execute agent in isolated task context - returns serialized dict
        structured_output_dict = await run_data_collector_agent()
        
        # Convert back to Pydantic model for processing
        structured_output = DataCollectorOutput(**structured_output_dict)
        
        # Use @task for blocking file write to avoid blocking async event loop
        @task
        def save_output_to_disk():
            with open("data/data_collector_output.json", "w") as f:
                json.dump(structured_output.model_dump(), f, indent=2)
        
        file_logger.info("="*80)
        file_logger.info("DATA COLLECTOR RAW OUTPUT:")
        file_logger.info(json.dumps(structured_output.model_dump(), indent=2))
        file_logger.info("="*80)
        await save_output_to_disk()
        file_logger.info("Data collector output saved")
        
        # Create return dictionary with proper state isolation
        return_dict = {
            "data_collection": structured_output.model_dump(),
            "agent_memories": {
                **state.get("agent_memories", {}),
                "data_collector": {"last_analysis": structured_output.self_analysis}
            },
            "execution_status": {
                **state.get("execution_status", {}),
                "data_collector": "completed"
            },
            "token_usage": token_tracker.get_usage()
        }
        
        file_logger.info(f"Data collector returning {len(return_dict['data_collection']['url_list'])} URLs")
        file_logger.debug(f"Return dict keys: {list(return_dict.keys())}")
        console_logger.info("[Agent 1] Consolidating website findings...")
        await asyncio.sleep(1)
        console_logger.info("[Agent 1] Instagram scraping...")
        await asyncio.sleep(1)
        console_logger.info("[Agent 1] Consolidating Instagram findings...")
        await asyncio.sleep(1)
        console_logger.info(f"[Agent 1] Final URLs scraped: {len(return_dict['data_collection']['url_list'])}")
        return return_dict
        
    except Exception as e:
        file_logger.error(f"ERROR: Data Collector error: {e}")
        file_logger.error(f"Traceback: {traceback.format_exc()}")
        return {
            "data_collection": {},
            "errors": {**state.get("errors", {}), "data_collector": str(e)},
            "execution_status": {
                **state.get("execution_status", {}),
                "data_collector": "failed"
            }
        }
