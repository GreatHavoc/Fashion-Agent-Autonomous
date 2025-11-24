"""MCP tools and helper utilities."""

from fashion_agent.tools.mcp_clients import (
    get_mcp_scrape,
    get_mcp_image,
    get_mcp_video,
    get_mcp_outfit,
    get_scraper_tools,
    get_image_tools,
    get_video_tools,
    get_outfit_tools,
    get_image_tool
)

from fashion_agent.tools.helpers import (
    create_url_item,
    make_video,
    load_video_urls,
    analyze_image_with_llm
)

__all__ = [
    # MCP clients
    "get_mcp_scrape",
    "get_mcp_image",
    "get_mcp_video",
    "get_mcp_outfit",
    # Tool retrieval
    "get_scraper_tools",
    "get_image_tools",
    "get_video_tools",
    "get_outfit_tools",
    "get_image_tool",
    # Helpers
    "create_url_item",
    "make_video",
    "load_video_urls",
    "analyze_image_with_llm"
]
