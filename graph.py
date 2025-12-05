"""Graph construction for the fashion analysis workflow."""

import os
import sqlite3
from typing import Dict, Any
from pathlib import Path
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite import SqliteSaver

from fashion_agent.state import FashionAnalysisState
from fashion_agent.nodes import (
    data_collector_node,
    content_analyzer_node,
    video_analyzer_node,
    final_processor_node,
    outfit_designer_node,
    video_generator_node,
    user_input_collector_node,
    outfit_reviewer_node,
)
from fashion_agent.config import file_logger


def coordination_node(state, config):
    """Coordination barrier node - ensures both content_analyzer and video_analyzer complete.
    
    This node acts as a synchronization point (fan-in barrier) for parallel execution.
    It receives updates from both content_analyzer and video_analyzer, and only executes
    after BOTH have completed and their state updates have been merged.
    
    Simply passes through the merged state to final_processor.
    """
    file_logger.info("Coordination node: Both content_analyzer and video_analyzer completed")
    return {}  # No state updates, just acts as a barrier


# Ensure data directory exists at module import (synchronous context)
# This avoids blocking calls during async graph compilation
_DATA_DIR = Path(__file__).parent / "data"
_DATA_DIR.mkdir(exist_ok=True)
_CHECKPOINT_DB = str(_DATA_DIR / "checkpoints.db")

# Initialize and setup checkpointer at module load time
_CHECKPOINTER = None

if not os.getenv("LANGGRAPH_DEPLOYMENT_ENV"):
    _CHECKPOINTER = SqliteSaver(sqlite3.connect(_CHECKPOINT_DB, check_same_thread=False))
    _CHECKPOINTER.setup()  # Create database tables
    file_logger.info(f"SqliteSaver initialized and setup complete: {_CHECKPOINT_DB}")


def route_after_review(state: Dict[str, Any]) -> str:
    """Route based on outfit review decision.
    
    Args:
        state: Current graph state containing outfit_review_decision
        
    Returns:
        Name of the next node to route to based on decision type
    """
    decision = state.get("outfit_review_decision", {})
    decision_type = decision.get("decision_type", "")
    execution_status = state.get("execution_status", {})
    
    # Debug logging
    file_logger.info(f"ROUTER: Evaluating outfit review routing")
    file_logger.info(f"ROUTER: decision_type = '{decision_type}'")
    file_logger.info(f"ROUTER: full decision = {decision}")
    file_logger.info(f"ROUTER: execution_status = {execution_status}")
    
    if decision_type == "approve":
        file_logger.info(f"ROUTER: Routing to video_generator (APPROVED)")
        return "video_generator"
    elif decision_type == "reject":
        file_logger.info(f"ROUTER: Routing to END (REJECTED)")
        return END
    elif decision_type == "edit":
        file_logger.info(f"ROUTER: Routing to outfit_designer (EDIT REQUESTED)")
        return "outfit_designer"  # Loop back for regeneration
    else:
        file_logger.info(f"ROUTER: No valid decision, staying at outfit_reviewer")
        return "outfit_reviewer"


def create_fashion_analysis_graph():
    """Create the complete LangGraph workflow with human-in-the-loop and parallel execution.
    
    Workflow Architecture:
    1. START -> User Input Collector (HITL: collect URLs/images)
    2. User Input -> Data Collector + Video Analyzer (parallel)
    3. Data Collector -> Content Analyzer (sequential chain)
    4. Content Analyzer + Video Analyzer -> Coordination -> Final Processor (merge)
    5. Final Processor -> Outfit Designer
    6. Outfit Designer -> Outfit Reviewer (HITL: approve/reject/edit)
    7. Outfit Reviewer -> Video Generator (if approved)
   8. Video Generator -> END
    
    Returns:
        Compiled graph with checkpointer (auto-configured in LangSmith deployments)
    """
    
    # Build the state graph using the properly defined FashionAnalysisState
    builder = StateGraph(FashionAnalysisState)
    
    # Add all agent nodes including HITL nodes
    builder.add_node("user_input_collector", user_input_collector_node)
    builder.add_node("data_collector", data_collector_node)
    builder.add_node("content_analyzer", content_analyzer_node)
    builder.add_node("video_analyzer", video_analyzer_node)
    builder.add_node("coordination", coordination_node)  # Barrier node for fan-in synchronization
    builder.add_node("final_processor", final_processor_node)
    builder.add_node("outfit_designer", outfit_designer_node)
    builder.add_node("outfit_reviewer", outfit_reviewer_node)
    builder.add_node("video_generator", video_generator_node)
    
    # Define the workflow edges with HITL integration
    # 1. Start with user input collection (HITL pause point)
    builder.add_edge(START, "user_input_collector")
    
    # 2. After user input, start parallel analysis
    builder.add_edge("user_input_collector", "data_collector")
    builder.add_edge("user_input_collector", "video_analyzer")
    
    # 3. Data collector -> Content analyzer (sequential chain)
    builder.add_edge("data_collector", "content_analyzer")
    
    # 4. Both content analyzer and video analyzer -> Coordination node (fan-in barrier)
    builder.add_edge("content_analyzer", "coordination")
    builder.add_edge("video_analyzer", "coordination")
    
    # 5. Coordination -> Final processor
    builder.add_edge("coordination", "final_processor")
    
    # 6. Final processor -> Outfit designer
    builder.add_edge("final_processor", "outfit_designer")
    
    # 7. Outfit designer -> Outfit reviewer (HITL pause point)
    builder.add_edge("outfit_designer", "outfit_reviewer")
    
    # 8. Outfit reviewer -> Conditional routing based on decision
    builder.add_conditional_edges(
        "outfit_reviewer",
        route_after_review,
        {
            "video_generator": "video_generator",
            "outfit_designer": "outfit_designer",
            "outfit_reviewer": "outfit_reviewer",
            END: END
        }
    )
    
    # 9. Video generator -> END
    builder.add_edge("video_generator", END)
    
    # Compile with checkpointer
    # Note: When deployed to LangSmith, the checkpointer is automatically configured
    # with PostgreSQL. The SqliteSaver below is only used for local development.
    file_logger.info("Compiling fashion analysis graph with checkpointer...")
    
    # Use the module-level checkpointer that was already initialized
    if _CHECKPOINTER:
        file_logger.info(f"Local dev mode - using SqliteSaver at: {_CHECKPOINT_DB}")
        graph = builder.compile(checkpointer=_CHECKPOINTER)
    else:
        # In LangSmith deployment - checkpointer auto-configured, don't specify one
        file_logger.info("Running in LangSmith deployment - using auto-configured Postgres checkpointer")
        graph = builder.compile()
    
    file_logger.info("Graph compiled successfully")
    
    return graph


def get_graph():
    """Preferred entry point for LangGraph CLI v1.
    
    This function is called by `langgraph dev` to load the graph.
    """
    return create_fashion_analysis_graph()
