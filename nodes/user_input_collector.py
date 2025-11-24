"""User Input Collector Node - Collects custom URLs and images from users before workflow starts."""

from typing import Dict, Any
from langgraph.types import interrupt

from fashion_agent.config import file_logger
from fashion_agent.state import UserInput


async def user_input_collector_node(state: Dict[str, Any], config) -> Dict[str, Any]:
    """
    Collect custom URLs and images from user at workflow start.
    
    This node pauses execution and requests:
    - Custom URLs for trend analysis
    - Custom images for content analysis  
    - Custom video URLs for video analysis
    - Optional query/description
    
    Returns state with user_input populated.
    """
    file_logger.info("Starting user input collection...")
    
    # Interrupt to collect user input
    user_response = interrupt({
        "message": "Provide custom URLs, images, and videos for fashion analysis",
        "instructions": {
            "custom_urls": "List of URLs to analyze for fashion trends (optional)",
            "custom_images": "List of image file paths or URLs to analyze (optional)",
            "custom_videos": "List of video URLs to analyze for trends (optional)",
            "query": "Describe what fashion trends you want to analyze (optional)"
        },
        "example": {
            "custom_urls": ["https://vogue.com/...", "https://elle.com/..."],
            "custom_images": ["path/to/image1.jpg", "path/to/image2.png"],
            "custom_videos": ["https://youtube.com/...", "https://vimeo.com/..."],
            "query": "Analyze summer 2025 sustainable fashion trends"
        }
    })
    
    # Validate and structure user input
    try:
        user_input = UserInput(**user_response)
        file_logger.info(f"User input collected: {len(user_input.custom_urls)} URLs, "
                        f"{len(user_input.custom_images)} images, "
                        f"{len(user_input.custom_videos)} videos")
        
        return {
            "user_input": user_input.model_dump(),
            "query": user_input.query or state.get("query", "Fashion trend analysis")
        }
    except Exception as e:
        file_logger.error(f"Error processing user input: {e}")
        # Return empty user input if validation fails
        return {
            "user_input": UserInput().model_dump(),
            "query": state.get("query", "Fashion trend analysis")
        }
