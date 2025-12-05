"""
Agent builder functions for the Fashion Analysis workflow.

This module contains functions to build LangChain v1 agents with structured output
for each specialized role in the fashion trend analysis pipeline.
"""

import traceback
from langchain.agents import create_agent
from langchain.agents.structured_output import ProviderStrategy, ToolStrategy

from fashion_agent.config import (
    file_logger,
    console_logger,
    llm,
    get_data_collector_prompt,
    get_content_analyzer_prompt,
    get_video_analyzer_prompt,
    get_final_processor_prompt,
    get_outfit_designer_prompt
)
from fashion_agent.state import (
    DataCollectorOutput,
    ContentAnalysisOutput,
    VideoTrendOutput,
    TrendAnalysisList,
    ListofOutfits
)
from fashion_agent.tools.mcp_clients import (
    get_scraper_tools,
    get_image_tools,
    get_video_tools,
    get_outfit_tools
)


# =========================
# Agent 1: Data Collector
# =========================

async def build_agent1_modern():
    """Build LangChain v1 agent for data collection with structured output and dedicated MCP tools."""
    try:
        file_logger.info("Building data collector agent...")
        
        # Get MCP tools directly - no @task needed for async operations
        tools = await get_scraper_tools()
        file_logger.info(f"Retrieved {len(tools)} scraper tools")
        
        # Create LangChain v1 agent with structured output and memory isolation
        agent = create_agent(
            model=llm,
            tools=tools,
            system_prompt=get_data_collector_prompt(),
            response_format=ToolStrategy(DataCollectorOutput)  # Use ToolStrategy for reliability
        )
        file_logger.info("SUCCESS: Data collector agent built successfully")
        return agent
    except Exception as e:
        file_logger.error(f"ERROR: Failed to build data collector agent: {e}")
        file_logger.error(f"Data collector agent traceback: {traceback.format_exc()}")
        # Return agent without tools as fallback
        file_logger.info("Creating fallback agent without MCP tools...")
        agent = create_agent(
            model=llm,
            tools=[],
            system_prompt=get_data_collector_prompt(),
            response_format=ToolStrategy(DataCollectorOutput)  # Use ToolStrategy for reliability
        )
        return agent


# =========================
# Agent 2: Content Analyzer
# =========================

async def build_agent2_modern():
    """Build LangChain v1 agent for content analysis with dedicated MCP tools."""
    try:
        file_logger.info("Building content analyzer agent...")
        
        # Get MCP tools directly - no @task needed for async operations
        tools = await get_image_tools()
        file_logger.info(f"Retrieved {len(tools)} image tools")
        
        agent = create_agent(
            model=llm,
            tools=tools,
            system_prompt=get_content_analyzer_prompt(),
            response_format=ToolStrategy(ContentAnalysisOutput)  # Use ToolStrategy for reliability
        )
        file_logger.info("SUCCESS: Content analyzer agent built successfully")
        return agent
    except Exception as e:
        file_logger.error(f"ERROR: Failed to build content analyzer agent: {e}")
        file_logger.error(f"Content analyzer agent traceback: {traceback.format_exc()}")
        raise  # Critical failure, do not proceed without content analysis


# =========================
# Agent 3: Video Analyzer
# =========================

async def build_agent3_modern():
    """Build LangChain v1 agent for video trend analysis with dedicated MCP tools."""
    try:
        file_logger.info("Building video analyzer agent...")
        
        # Get MCP tools directly - no @task needed for async operations
        tools = await get_video_tools()
        file_logger.info(f"Retrieved {len(tools)} video tools")
        
        agent = create_agent(
            model=llm,
            tools=tools,
            system_prompt=get_video_analyzer_prompt(),
            response_format=ToolStrategy(VideoTrendOutput)  # Use ToolStrategy for reliability
        )
        file_logger.info("SUCCESS: Video analyzer agent built successfully")
        return agent
    except Exception as e:
        file_logger.error(f"ERROR: Failed to build video analyzer agent: {e}")
        file_logger.error(f"Video analyzer agent traceback: {traceback.format_exc()}")
        # Return agent without tools as fallback
        file_logger.info("Creating fallback video analyzer agent without MCP tools...")
        agent = create_agent(
            model=llm,
            tools=[],
            system_prompt=get_video_analyzer_prompt(),
            response_format=ProviderStrategy(VideoTrendOutput)
        )
        return agent


# =========================
# Agent 4: Final Processor (Trend Analyzer)
# =========================

async def build_agent4_modern():
    """Build LangChain v1 agent for final processing and synthesis."""
    try:
        file_logger.info("Building final processor agent...")
        # Final processor typically doesn't need special MCP tools for synthesis
        tools = []  # Use empty tools list for final synthesis
        file_logger.info(f"Using {len(tools)} final processing tools")
        
        agent = create_agent(
            model=llm,
            tools=tools,
            system_prompt=get_final_processor_prompt(),
            response_format=ToolStrategy(TrendAnalysisList)  # Use ToolStrategy for reliability
        )
        file_logger.info("SUCCESS: Final processor agent built successfully")
        return agent
    except Exception as e:
        file_logger.error(f"ERROR: Failed to build final processor agent: {e}")
        file_logger.error(f"Final processor agent traceback: {traceback.format_exc()}")
        # Return agent without tools as fallback
        file_logger.info("Creating fallback final processor agent without MCP tools...")
        agent = create_agent(
            model=llm,
            tools=[],
            system_prompt=get_final_processor_prompt(),
            response_format=ProviderStrategy(TrendAnalysisList)
        )
        return agent


# =========================
# Agent 5: Outfit Designer
# =========================

async def build_agent5_modern():
    """Build LangChain v1 agent for outfit design with reflection capabilities."""
    try:
        file_logger.info("Building outfit designer agent...")
        
        # Get MCP tools directly - no @task needed for async operations
        # Using @task can cause execution context issues when agent is used as subgraph
        tools = await get_outfit_tools()
        file_logger.info(f"Retrieved {len(tools)} outfit design tools")

        agent = create_agent(
            model=llm,
            tools=tools,
            system_prompt=get_outfit_designer_prompt(),
            response_format=ToolStrategy(ListofOutfits)  # Use ToolStrategy for reliability
        )
        console_logger.info("SUCCESS: Outfit designer agent built successfully")
        return agent
    except Exception as e:
        file_logger.error(f"ERROR: Failed to build outfit designer agent: {e}")
        file_logger.error(f"Outfit designer agent traceback: {traceback.format_exc()}")
        # Return agent without tools as fallback
        file_logger.info("Creating fallback outfit designer agent without MCP tools...")
        agent = create_agent(
            model=llm,
            tools=[],
            system_prompt=get_outfit_designer_prompt(),
            response_format=ProviderStrategy(ListofOutfits)
        )
        return agent
