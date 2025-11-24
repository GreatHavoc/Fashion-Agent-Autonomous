"""
MCP Client Management and Tool Retrieval Functions.

This module manages connections to MCP servers and retrieves tools for each agent.
"""

import asyncio
import traceback
from typing import Optional, List
from langchain_mcp_adapters.client import MultiServerMCPClient

from fashion_agent.config import (
    file_logger,
    MCP_SCRAPER_CONFIG,
    MCP_IMAGE_CONFIG,
    MCP_VIDEO_CONFIG,
    MCP_OUTFIT_CONFIG,
    SCRAPER_TOOL_NAMES,
    IMAGE_TOOL_PREFERRED_NAMES
)


# =========================
# MCP Client Singletons
# =========================

MCP_CLIENT_SCRAPE: Optional[MultiServerMCPClient] = None
MCP_CLIENT_IMAGE: Optional[MultiServerMCPClient] = None
MCP_CLIENT_VIDEO: Optional[MultiServerMCPClient] = None
MCP_CLIENT_OUTFIT: Optional[MultiServerMCPClient] = None


# =========================
# MCP Client Getters
# =========================

def get_mcp_scrape() -> MultiServerMCPClient:
    """Data Collector MCP - Web scraping and URL filtering tools."""
    global MCP_CLIENT_SCRAPE
    if MCP_CLIENT_SCRAPE is None:
        MCP_CLIENT_SCRAPE = MultiServerMCPClient(MCP_SCRAPER_CONFIG)
    return MCP_CLIENT_SCRAPE


def get_mcp_image() -> MultiServerMCPClient:
    """Content Analyzer MCP - Image processing and content analysis tools."""
    global MCP_CLIENT_IMAGE
    if MCP_CLIENT_IMAGE is None:
        MCP_CLIENT_IMAGE = MultiServerMCPClient(MCP_IMAGE_CONFIG)
    return MCP_CLIENT_IMAGE


def get_mcp_video() -> MultiServerMCPClient:
    """Video Analyzer MCP - Video processing and trend analysis tools."""
    global MCP_CLIENT_VIDEO
    if MCP_CLIENT_VIDEO is None:
        MCP_CLIENT_VIDEO = MultiServerMCPClient(MCP_VIDEO_CONFIG)
    return MCP_CLIENT_VIDEO


def get_mcp_outfit() -> Optional[MultiServerMCPClient]:
    """Get or create MCP client for outfit design agent."""
    global MCP_CLIENT_OUTFIT
    if MCP_CLIENT_OUTFIT is None:
        try:
            MCP_CLIENT_OUTFIT = MultiServerMCPClient(MCP_OUTFIT_CONFIG)
        except Exception as e:
            file_logger.warning(f"Failed to create outfit MCP client: {e}")
            MCP_CLIENT_OUTFIT = None
    return MCP_CLIENT_OUTFIT


# =========================
# Tool Retrieval Functions
# =========================

async def get_scraper_tools() -> List:
    """Get MCP tools for data collection agent.
    
    MultiServerMCPClient.get_tools() automatically handles session management.
    Each tool invocation creates a fresh ClientSession internally.
    """
    try:
        file_logger.info("Getting tools from data collector MCP client...")
        client = get_mcp_scrape()
        
        # get_tools() handles session creation automatically - no need to call start()
        tools = await client.get_tools()
        file_logger.info(f"Retrieved {len(tools)} total tools from MCP")
        
        # Filter to specific tools if configured
        filtered = [t for t in tools if getattr(t, "name", None) in SCRAPER_TOOL_NAMES]
        file_logger.info(f"Filtered to {len(filtered)} scraper tools")
        
        result_tools = filtered or tools
        file_logger.info(f"Returning {len(result_tools)} tools for data collector")
        return result_tools
        
    except Exception as e:
        file_logger.error(f"ERROR: Failed to get scraper tools: {e}")
        file_logger.error(f"Scraper tools traceback: {traceback.format_exc()}")
        file_logger.warning("Returning empty tools list as fallback")
        return []


async def get_image_tools() -> List:
    """Get MCP tools for content analyzer agent.
    
    MultiServerMCPClient.get_tools() automatically handles session management.
    """
    try:
        client = get_mcp_image()
        tools = await client.get_tools()
        file_logger.info(f"Retrieved {len(tools)} image tools from MCP")
        return tools
    except Exception as e:
        file_logger.error(f"ERROR: Failed to get image tools: {e}")
        file_logger.warning("Returning empty tools list as fallback")
        return []


async def get_video_tools() -> List:
    """Get MCP tools for video analyzer agent.
    
    MultiServerMCPClient.get_tools() automatically handles session management.
    """
    try:
        file_logger.info("Getting tools from video analyzer MCP client...")
        client = get_mcp_video()
        
        tools = await client.get_tools()
        file_logger.info(f"Retrieved {len(tools)} video tools from MCP")
        return tools

    except Exception as e:
        file_logger.error(f"ERROR: Failed to get video tools: {e}")
        file_logger.error(f"Video tools traceback: {traceback.format_exc()}")
        file_logger.warning("Returning empty tools list as fallback")
        return []


async def get_outfit_tools() -> List:
    """Get MCP tools for outfit design agent.
    
    MultiServerMCPClient.get_tools() automatically handles session management.
    """
    try:
        client = get_mcp_outfit()
        if not client:
            return []
        tools = await client.get_tools()
        file_logger.info(f"Retrieved {len(tools)} outfit design tools")
        return tools
    except Exception as e:
        file_logger.warning(f"Failed to get outfit design tools: {e}")
        return []


async def get_image_tool():
    """Get preferred image tool from content analyzer MCP client.
    
    MultiServerMCPClient.get_tools() automatically handles session management.
    """
    client = get_mcp_image()
    tools = await client.get_tools()
    
    by_name = {getattr(t, "name", ""): t for t in tools}
    for name in IMAGE_TOOL_PREFERRED_NAMES:
        if name in by_name:
            return by_name[name]
    
    if tools:
        return tools[0]
    raise RuntimeError("No MCP image tool available. Ensure your Image MCP server is running and exposes a tool.")
