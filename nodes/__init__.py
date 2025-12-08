"""Node functions for the fashion analysis workflow."""

from typing import Dict, Any
from langchain_core.messages import AIMessage

from fashion_agent.nodes.data_collector import data_collector_node
from fashion_agent.nodes.content_analyzer import content_analyzer_node
from fashion_agent.nodes.video_analyzer import video_analyzer_node
from fashion_agent.nodes.final_processor import final_processor_node
from fashion_agent.nodes.outfit_designer import outfit_designer_node
from fashion_agent.nodes.video_generator import video_generator_node
from fashion_agent.nodes.user_input_collector import user_input_collector_node
from fashion_agent.nodes.outfit_reviewer import outfit_reviewer_node


def extract_token_usage(agent_result: Dict[str, Any], agent_name: str = "unknown") -> Dict[str, Any]:
    """Extract token usage from agent result.
    
    Looks for usage_metadata in the last AI message within the agent's response.
    
    Args:
        agent_result: The result dict from agent.ainvoke()
        agent_name: Name of the agent for attribution
        
    Returns:
        Dict with input_tokens, output_tokens, total_tokens, and agent attribution
    """
    usage = {
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
        "agent": agent_name
    }
    
    try:
        messages = agent_result.get("messages", [])
        # Look for the last AI message with usage_metadata
        for msg in reversed(messages):
            if isinstance(msg, AIMessage):
                msg_usage = getattr(msg, 'usage_metadata', None)
                if msg_usage:
                    usage["input_tokens"] = msg_usage.get("input_tokens", 0)
                    usage["output_tokens"] = msg_usage.get("output_tokens", 0)
                    usage["total_tokens"] = msg_usage.get("total_tokens", 0)
                    break
    except Exception:
        pass  # Silently fail - token tracking is optional
    
    return usage


__all__ = [
    "data_collector_node",
    "content_analyzer_node",
    "video_analyzer_node",
    "final_processor_node",
    "outfit_designer_node",
    "video_generator_node",
    "user_input_collector_node",
    "outfit_reviewer_node",
    "extract_token_usage",
]
