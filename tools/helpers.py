"""
Helper functions for tools and data processing.

This module contains utility functions for:
- URL item creation
- Video generation
- LLM-based image analysis
"""

import os
from datetime import datetime
from typing import Dict, Any
from langchain_core.messages import HumanMessage

from fashion_agent.config import file_logger, llm
from fashion_agent.state import URLItem


# =========================
# URL Item Creation
# =========================

def create_url_item(
    title: str = "",
    url: str = "",
    author: str = "",
    date: str = "",
    category: str = "",
    excerpt: str = "",
    image_url: str = ""
) -> URLItem:
    """Helper function to create URLItem with proper timestamp."""
    return URLItem(
        title=title,
        url=url,
        author=author,
        date=date,
        category=category,
        excerpt=excerpt,
        image_url=image_url,
        scraped_at=datetime.now().isoformat()
    )


# =========================
# Video Generation Helpers
# =========================
# Video Generation Helpers
# =========================

async def make_video(image_path: str) -> Dict[str, Any]:
    """
    Generate video from outfit image.
    
    Args:
        image_path: Path to the outfit image
        
    Returns:
        Dict containing:
        - success: bool
        - output_path: str (path to generated video)
        - duration: float (video duration in seconds)
        - error: str (if failed)
        - processing_time: float
    """
    from ..utils.video_generation import vid_generator
    
    if not os.path.exists(image_path):
        return {
            "success": False,
            "output_path": None,
            "duration": 0.0,
            "error": f"Input image not found: {image_path}",
            "processing_time": 0.5
        }
    try:
        output_path = await vid_generator(image_path)
    except Exception as e:
        return {
            "success": False,
            "output_path": None,
            "duration": 0.0,
            "error": str(e),
            "processing_time": 0.5
        }
    if output_path is None or not os.path.exists(output_path):
        return {
            "success": False,
            "output_path": None,
            "duration": 0.0,
            "error": "Video generation failed, output file not created",
            "processing_time": 0.5
        }
    return {
        "success": True,
        "output_path": output_path,
        "duration": 5.0,  # 5 second video
        "error": None,
        "processing_time": 0.5
    }


def load_video_urls() -> list:
    """Load video URLs from config.VIDEO_URLS."""
    from fashion_agent.config import VIDEO_URLS
    
    if VIDEO_URLS:
        file_logger.info(f"Loaded {len(VIDEO_URLS)} video URLs from config")
    else:
        file_logger.warning("No video URLs configured in config.VIDEO_URLS")
    
    return VIDEO_URLS


# =========================
# LLM Image Analysis
# =========================

async def analyze_image_with_llm(image_b64: str, mime: str, context: str) -> str:
    """Analyze image using LLM with vision capabilities."""
    mime = mime or "image/png"
    data_uri = f"data:{mime};base64,{image_b64}"
    content = [
        {"type": "text", "text": context},
        {"type": "image_url", "image_url": data_uri},
    ]
    msg = HumanMessage(content=content)
    resp = await llm.ainvoke([msg])
    return getattr(resp, "content", str(resp))
