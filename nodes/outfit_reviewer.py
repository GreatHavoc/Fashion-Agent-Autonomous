"""Outfit Reviewer Node - Human review and approval of outfit designs."""

from typing import Dict, Any
from langgraph.types import interrupt

from fashion_agent.config import file_logger
from fashion_agent.state import OutfitReviewDecision


async def outfit_reviewer_node(state: Dict[str, Any], config) -> Dict[str, Any]:
    """
    Present outfit designs to user for review and approval.
    
    User can:
    - Approve: Proceed to video generation
    - Reject: Provide mandatory feedback, stop workflow
    - Edit: Provide change instructions, regenerate outfits
    
    Returns state with review decision and updated awaiting_outfit_review flag.
    """
    
    # GUARD: Check if review was already completed (prevent double interrupt from cached nodes)
    execution_status = state.get("execution_status", {})
    reviewer_status = execution_status.get("outfit_reviewer")
    
    if reviewer_status == "completed":
        file_logger.info("Outfit review already completed (status=completed), skipping re-review")
        return {}  # Pass through without changes
    
    # Also check if we already have a review decision with approve/reject
    existing_decision = state.get("outfit_review_decision", {})
    if existing_decision.get("decision_type") in ["approve", "reject"]:
        file_logger.info(f"Outfit review already completed (decision={existing_decision.get('decision_type')}), skipping re-review")
        return {}  # Pass through without changes
    
    file_logger.info("Starting outfit review process...")
    
    # Get outfit designs from state
    outfit_designs = state.get("outfit_designs", [])
    
    if not outfit_designs:
        file_logger.warning("No outfit designs available for review")
        return {
            "awaiting_outfit_review": False,
            "errors": {**state.get("errors", {}), "outfit_reviewer": "No outfits to review"}
        }
    
    # Extract outfit data for presentation
    outfits_data = outfit_designs[0] if outfit_designs else {}
    outfits_list = outfits_data.get("Outfits", [])
    
    # Format outfits for review
    review_payload = {
        "message": "Review outfit designs before proceeding to video generation",
        "total_outfits": len(outfits_list),
        "outfits": [
        {
            "outfit_id": f"outfit_{idx}",
            "name": outfit.get("outfit_name", ""),
            "description": outfit.get("outfit_description", ""),
            "colors": outfit.get("dominant_colors", []),
            "style": outfit.get("style_tags", []),
            "image_path": outfit.get("saved_image_path", "")
        }
            for idx, outfit in enumerate(outfits_list)
        ],
        "instructions": {
            "approve": "Continue to video generation with these designs",
            "reject": "Stop workflow - you MUST provide rejection_feedback explaining why",
            "edit": "Regenerate outfits - you MUST provide edit_instructions with specific changes"
        },
        "decision_format": {
            "decision_type": "approve | reject | edit",
            "rejection_feedback": "Required if decision_type is 'reject'",
            "edit_instructions": "Required if decision_type is 'edit'",
            "selected_outfit_ids": "Optional: list of outfit IDs to act on (empty = all)"
        }
    }
    
    file_logger.info(f"Presenting {len(outfits_list)} outfits for human review")
    
    # Interrupt for human review
    review_response = interrupt(review_payload)
    print("--------------", review_response)
    # Validate review decision
    try:
        decision = OutfitReviewDecision(**review_response)
        
        # Validate required fields
        if decision.decision_type == "reject" and not decision.rejection_feedback:
            raise ValueError("rejection_feedback is mandatory when decision is 'reject'")
        
        if decision.decision_type == "edit" and not decision.edit_instructions:
            raise ValueError("edit_instructions is mandatory when decision is 'edit'")
        
        file_logger.info(f"Outfit review decision: {decision.decision_type}")
        
        # Handle different decision types
        if decision.decision_type == "approve":
            file_logger.info("Outfits approved - proceeding to video generation")
            return {
                "awaiting_outfit_review": False,
                "outfit_review_decision": decision.model_dump(),
                "execution_status": {
                    **state.get("execution_status", {}),
                    "outfit_reviewer": "completed"
                }
            }
        
        elif decision.decision_type == "reject":
            file_logger.warning(f"Outfits rejected: {decision.rejection_feedback}")
            return {
                "awaiting_outfit_review": False,
                "outfit_review_decision": decision.model_dump(),
                "errors": {
                    **state.get("errors", {}),
                    "outfit_reviewer": f"Designs rejected: {decision.rejection_feedback}"
                },
                "execution_status": {
                    **state.get("execution_status", {}),
                    "outfit_reviewer": "rejected"
                }
            }
        
        elif decision.decision_type == "edit":
            file_logger.info(f"Outfit edit requested: {decision.edit_instructions}")
            # Store edit instructions for outfit designer to use
            return {
                "awaiting_outfit_review": True,  # Will need another review after regeneration
                "outfit_review_decision": decision.model_dump(),
                "execution_status": {
                    **state.get("execution_status", {}),
                    "outfit_reviewer": "edit_requested"
                }
            }
        
        else:
            raise ValueError(f"Invalid decision_type: {decision.decision_type}")
            
    except Exception as e:
        file_logger.error(f"Error processing outfit review: {e}")
        return {
            "awaiting_outfit_review": False,
            "errors": {
                **state.get("errors", {}),
                "outfit_reviewer": f"Invalid review decision: {str(e)}"
            }
        }
