"""
Content Analyzer Node - Analyzes images and text from collected URLs.

Extracts fashion insights, trends, colors, fabrics, and silhouettes.
"""

import os
import json
import asyncio
import re
from typing import Dict, Any
from langgraph.func import task
from langchain_core.messages import HumanMessage

from fashion_agent.utils import storage
from fashion_agent.config import file_logger, console_logger, MAX_RETRIES, BASE_DELAY
from fashion_agent.state import ContentAnalysisOutput
from fashion_agent.agents import build_agent2_modern


async def content_analyzer_node(state: Dict[str, Any], config) -> Dict[str, Any]:
    """
    LangGraph node for content analysis.
    
    Analyzes URLs from data collector to extract fashion trends and insights.
    """
    # Check for cached output from previous run
    def load_cached_output():
        output_file = "data/content_analyzer_output.json"
        if os.path.exists(output_file):
            try:
                with open(output_file, "r") as f:
                    structured_output = ContentAnalysisOutput(**json.load(f))
                file_logger.info("Loaded Content Analyzer output from file, skipping agent execution.")
                return {
                    "content_analysis": [structured_output.model_dump()],
                    "agent_memories": {
                        **state.get("agent_memories", {}),
                        "content_analyzer": {"last_analysis": structured_output.enhanced_thesis}
                    },
                    "execution_status": {
                        **state.get("execution_status", {}),
                        "content_analyzer": "completed"
                    }
                }
            except Exception as e:
                file_logger.warning(f"Failed to load cached Content Analyzer output: {e}. Will rerun agent.")
        return None
    
    cached = load_cached_output()
    if cached:
        await asyncio.to_thread(
            storage.update_content_analysis,
            record_id=f"fashion_analysis_{config['configurable']['thread_id']}",
            data=cached
        )
        return cached
    
    console_logger.info("Starting Content Analyzer Agent...")
    
    try:
        
        url_list = state.get("data_collection", {}).get("url_list", [])
        if not url_list:
            raise ValueError("No URLs from data collector")
        
        file_logger.info(f"Content analyzer received {len(url_list)} URLs from data collector")
        
        user_input = f"""
        Analyze the collected URLs and images for fashion trends.
        Query: {state.get('query', '')}
        URLs to analyze: {json.dumps(url_list)}
        The current insights from data collector: {state.get('agent_memories', {}).get('data_collector', {}).get('last_analysis', '')}
        Use your MCP image processing tools and website resources to analyze content and extract insights.
        """
        
        # Use @task to isolate agent execution from checkpointing
        @task
        async def run_content_analyzer_agent():
            agent = await build_agent2_modern()
            
            # Retry logic with exponential backoff
            for attempt in range(MAX_RETRIES + 1):
                try:
                    file_logger.info(f"Content analyzer attempt {attempt + 1}/{MAX_RETRIES + 1}")
                    # Add timeout to prevent indefinite hanging
                    # Invoke agent WITHOUT checkpointer config to prevent MCP tool pickling errors
                    result = await asyncio.wait_for(
                        agent.ainvoke(
                            {"messages": [HumanMessage(content=user_input)]},
                            config={"configurable": {"checkpoint_ns": ""}}  # Disable checkpointing for subgraph
                        ),
                        timeout=300.0  # 5 minutes timeout
                    )
                    file_logger.info(f"Content Analyzer result type: {type(result)}")
                    
                    # Extract structured output INSIDE task to avoid pickling agent result
                    if isinstance(result, dict) and "structured_response" in result:
                        structured_output = result["structured_response"]
                        file_logger.info(f"Got structured response: {type(structured_output)}")
                        # Return only the serializable Pydantic model dict
                        return structured_output.model_dump()
                    elif isinstance(result, ContentAnalysisOutput):
                        return result.model_dump()
                    else:
                        # Create structured output from result
                        file_logger.warning(f"Unexpected result structure: {type(result)}")
                        structured_output = ContentAnalysisOutput(
                            per_url_findings=[],
                            enhanced_thesis=str(result),
                            final_report=str(result),
                            trend_insights={},
                            confidence_scores={}
                        )
                        return structured_output.model_dump()
                except asyncio.TimeoutError:
                    file_logger.error(f"Content analyzer timed out on attempt {attempt + 1}")
                    if attempt < MAX_RETRIES:
                        await asyncio.sleep(BASE_DELAY)
                        continue
                    else:
                        raise RuntimeError("Content analyzer exceeded max retries due to timeouts")
                except Exception as e:
                    error_str = str(e)
                    if "429" in error_str or "quota" in error_str.lower() or "rate" in error_str.lower():
                        if attempt < MAX_RETRIES:
                            delay_match = re.search(r"retry in ([\d.]+)s", error_str)
                            if delay_match:
                                delay = float(delay_match.group(1))
                            else:
                                delay = BASE_DELAY * (2 ** attempt)
                            file_logger.warning(f"Rate limit hit (attempt {attempt + 1}). Retrying in {delay} seconds...")
                            file_logger.warning(f"Error details: {error_str}")
                            await asyncio.sleep(delay)
                            continue
                        else:
                            file_logger.error(f"Max retries exceeded for rate limiting: {e}")
                            raise
                    else:
                        file_logger.error(f"Non-rate-limit error in content analyzer: {e}")
                        raise
        
        # Execute agent in isolated task context - returns serialized dict
        structured_output_dict = await run_content_analyzer_agent()
        console_logger.info("SUCCESS: Content analyzer completed successfully")
        
        # Convert back to Pydantic model for processing
        structured_output = ContentAnalysisOutput(**structured_output_dict)
        
        # Use @task for blocking file write to avoid blocking async event loop
        @task
        def save_output_to_disk():
            with open("data/content_analyzer_output.json", "w") as f:
                json.dump(structured_output.model_dump(), f, indent=2)
        
        file_logger.info("="*80)
        file_logger.info("CONTENT ANALYZER RAW OUTPUT:")
        file_logger.info(json.dumps(structured_output.model_dump(), indent=2))
        file_logger.info("="*80)
        await save_output_to_disk()
        file_logger.info("Content analyzer output saved")
        
        return {
            "content_analysis": [structured_output.model_dump()],
            "agent_memories": {
                **state.get("agent_memories", {}),
                "content_analyzer": {"last_analysis": structured_output.enhanced_thesis}
            },
            "execution_status": {
                **state.get("execution_status", {}),
                "content_analyzer": "completed"
            }
        }
        
    except Exception as e:
        return {
            "content_analysis": [],
            "errors": {**state.get("errors", {}), "content_analyzer": str(e)},
            "execution_status": {
                **state.get("execution_status", {}),
                "content_analyzer": "failed"
            }
        }
