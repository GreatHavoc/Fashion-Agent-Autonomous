"""
State definitions and Pydantic models for Fashion Analysis agents.

This module contains all state schemas and structured output models used across
the multi-agent fashion trend analysis system.
"""

import operator
from typing import List, Dict, Any, Annotated
from typing_extensions import TypedDict
from pydantic import BaseModel, Field


def merge_agent_memories(left: Dict[str, Dict[str, Any]], right: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Merge agent memories from parallel nodes.
    
    This reducer handles concurrent updates to agent_memories when multiple nodes
    (e.g., content_analyzer and video_analyzer) execute in parallel.
    
    Args:
        left: Existing agent memories dict
        right: New agent memories dict to merge
        
    Returns:
        Merged dict with nested keys preserved
    """
    result = left.copy()
    for agent_name, agent_data in right.items():
        if agent_name in result:
            # Merge nested dicts for same agent
            result[agent_name] = {**result[agent_name], **agent_data}
        else:
            result[agent_name] = agent_data
    return result


def merge_dicts(left: Dict[str, str], right: Dict[str, str]) -> Dict[str, str]:
    """Merge flat dicts from parallel nodes.
    
    Handles concurrent updates to execution_status and errors dicts.
    
    Args:
        left: Existing dict
        right: New dict to merge
        
    Returns:
        Merged dict with all keys
    """
    return {**left, **right}


# =========================
# Human-in-the-Loop Models
# =========================

class UserInput(BaseModel):
    """User-provided input for workflow initialization."""
    custom_urls: List[str] = Field(default_factory=list, description="User-provided URLs for analysis")
    custom_images: List[str] = Field(default_factory=list, description="User-provided image paths for analysis")
    custom_videos: List[str] = Field(default_factory=list, description="User-provided video URLs for analysis")
    query: str = Field(default="", description="User's analysis query or description")


class OutfitReviewDecision(BaseModel):
    """Human review decision for outfit designs."""
    decision_type: str = Field(description="Decision type: 'approve', 'reject', or 'edit'")
    rejection_feedback: str = Field(default="", description="Mandatory feedback when decision is 'reject'")
    edit_instructions: str = Field(default="", description="Change instructions when decision is 'edit'")
    selected_outfit_ids: List[str] = Field(default_factory=list, description="Outfit IDs to approve/reject/edit")


# =========================
# Agent 1: Data Collector - Output Models
# =========================

class URLItem(BaseModel):
    """Structured model for a single URL item."""
    title: str = Field(description="Article or post title")
    url: str = Field(description="Website article/post URL (never Instagram URLs)")
    author: str = Field(description="Author name or source")
    date: str = Field(description="Publication date")
    category: str = Field(description="Content category (fashion, style, trend, etc.)")
    excerpt: str = Field(description="Brief content summary or excerpt")
    image_url: str = Field(description="High-quality image URL (Instagram display_url or article image)")
    scraped_at: str = Field(description="Timestamp when scraped")


class DataCollectorOutput(BaseModel):
    """Structured output for Data Collector Agent."""
    url_list: List[URLItem] = Field(description="List of curated URLs with metadata")
    self_analysis: str = Field(description="Current hypotheses, notable patterns, failed areas")
    errors: Dict[str, str] = Field(default_factory=dict, description="Error log by tool/category")


class DataCollectorState(TypedDict):
    """Internal state for Data Collector agent."""
    scraping_plan: List[str]
    used_tools: List[str]
    intermediate_results: List[Dict[str, Any]]
    filtered_posts: List[Dict[str, Any]]
    errors: Dict[str, Any]
    url_list: List[Dict[str, Any]]
    self_analysis: str


# =========================
# Agent 2: Content Analyzer - Output Models
# =========================

class PerURLFinding(BaseModel):
    """
    Detailed analysis results for a single fashion-relevant article or post,
    focusing on signals most useful for future trend forecasting.
    """
    title: str = Field(description="The title of the article or post.")
    url: str = Field(description="Direct link to the content for reference.")
    author: str = Field(
        description="Name of the author, designer, or publication that created the content."
    )
    date: str = Field(description="Date the article or post was published.")
    category: str = Field(
        description="Fashion category or main theme (e.g. bridal, street style, sustainability, menswear)."
    )
    summary: str = Field(
        description="Concise summary describing the main findings, ideas, and narrative of the article/post."
    )
    micro_trends: List[str] = Field(
        description="Short-term, niche trends observed or suggested in this content."
    )
    macro_trends: List[str] = Field(
        description="Major, long-term industry-wide trends discussed or extrapolated from this content."
    )
    colors: List[str] = Field(
        description="Key colors, palettes, or shades consistently highlighted or predicted as trending. Keep it specific like pantone codes."
    )
    fabrics: List[str] = Field(
        description="Important fabrics or materials featured, referenced, or forecasted (e.g. denim, silk, eco-fabrics)."
    )
    silhouettes: List[str] = Field(
        description="Garment shapes, cuts, or overall silhouettes—the structural styles emphasized."
    )
    sellout_signals: List[str] = Field(
        description="Styles, products, or concepts considered high-demand, must-have, or forecasted to 'sell out'."
    )
    signals_for_future: List[str] = Field(
        description="Explicit signals, forward-looking predictions, or anticipated breakout ideas for future seasons."
    )
    influencer_mentions: List[str] = Field(
        description="Fashion designers, brands, key influencers or labels discussed or cited."
    )
    sentiment: str = Field(
        description="General sentiment about the trend direction (e.g. optimistic, skeptical, urgent, hype)."
    )
    supporting_images: List[str] = Field(
        description="URLs of high-quality images included or referenced which illustrate key trend elements."
    )
    evidence_strength: float = Field(
        description="Confidence score (from 0 to 1) for the degree to which this article helps predict future trends."
    )
    extrapolation: str = Field(
        description="Brief summary of the analyst's interpretation on how this article could influence future fashion direction."
    )


class ContentAnalysisOutput(BaseModel):
    """Structured output for Content Analyzer Agent."""
    per_url_findings: List[PerURLFinding] = Field(description="Analysis results per URL")
    enhanced_thesis: str = Field(description="Enhanced analysis thesis")
    final_report: str = Field(description="Final content analysis report")
    trend_insights: str = Field(description="Categorize the trends identified accross URLs")


class ContentAnalyzerState(TypedDict):
    """Internal state for Content Analyzer agent."""
    input_url_list: List[Dict[str, Any]]
    agent1_self_analysis: str
    per_url_findings: List[Dict[str, Any]]
    enhanced_thesis: str
    final_report: str
    errors: Dict[str, Any]


# =========================
# Agent 3: Video Analyzer - Output Models
# =========================

class TrendItemFrequency(BaseModel):
    """Frequency count for a trend item."""
    name: str = Field(..., description="The name of the trend item (e.g., color, fabric, silhouette).")
    frequency: int = Field(..., description="The number of looks in which this item is featured.")


class TrendIdentification(BaseModel):
    """Identified trends with frequency data."""
    silhouette_trends: List[TrendItemFrequency] = Field(
        ..., description="Trending silhouettes with their appearance frequency across looks.")
    popular_colors: List[TrendItemFrequency] = Field(
        ..., description="Color palette with frequency count (number of looks featuring each pantone color use pantone codes).")
    trending_fabrics: List[TrendItemFrequency] = Field(
        ..., description="Key fabrics with frequency count (number of looks featuring each fabric).")
    prints: List[TrendItemFrequency] = Field(
        ..., description="Prints featured, with counts for each.")
    patterns: List[TrendItemFrequency] = Field(
        ..., description="Patterns featured, with counts for each.")
    seasonal_style_cues: List[TrendItemFrequency] = Field(
        ..., description="Seasonal styling cues (layering, boots, palettes), with frequency across all looks.")


class DemographicRepresentation(BaseModel):
    """Demographic representation in fashion shows."""
    gender: List[str] = Field(..., description="Gender(s) represented in the collection.")
    age_range: List[str] = Field(..., description="Approximate age group targeted (e.g., 20s-30s).")
    inclusivity_notes: str = Field(..., description="Notes on inclusivity, such as diversity in representation.")


class CollectionAnalysis(BaseModel):
    """Analysis of fashion collection structure."""
    number_of_looks: int = Field(..., description="Total number of outfits/looks presented in the runway show.")
    demographic_representation: DemographicRepresentation = Field(..., description="Breakdown of gender, age, and inclusivity represented.")
    dominant_themes: List[str] = Field(..., description="Main creative or stylistic themes in the collection (e.g., Gothic Romance, Sophisticated Tailoring).")
    statement_pieces: List[TrendItemFrequency] = Field(..., description="Highlighted garments with frequency (count of looks featuring each statement piece).")


class StylingInsights(BaseModel):
    """Styling details and techniques."""
    accessories: List[TrendItemFrequency] = Field(..., description="Accessories used, with counts indicating uses across all looks.")
    hair_makeup_styles: List[TrendItemFrequency] = Field(..., description="Hair and makeup approaches, with frequency by look.")
    layering_outfit_pairing: List[TrendItemFrequency] = Field(..., description="Styling notes for layering or outfit pairings, with frequency by look.")
    props_unconventional_items: List[TrendItemFrequency] = Field(..., description="Props or unusual styling items, with appearance counts.")


class ModelSelection(BaseModel):
    """Model selection diversity metrics."""
    body_types: List[str] = Field(..., description="Body types showcased by the models.")
    ethnic_diversity: List[str] = Field(..., description="Ethnic groups represented in the model selection.")
    age: List[str] = Field(..., description="Age groups represented by models.")
    gender_fluidity: str = Field(..., description="Presence of gender-neutral or gender-fluid styling.")


class DiversityRepresentation(BaseModel):
    """Overall diversity representation."""
    model_selection: ModelSelection = Field(..., description="Details on body, age, ethnicity, and gender representation in the casting.")
    inclusivity_social_messaging: str = Field(..., description="Social or cultural inclusivity messages conveyed by the show.")


class ShowProduction(BaseModel):
    """Production quality metrics."""
    audience_engagement: str = Field(..., description="Notes about audience involvement and reactions.")


class CommercialPotential(BaseModel):
    """Commercial viability assessment."""
    retail_success_pieces: List[TrendItemFrequency] = Field(..., description="Commercially promising pieces with their appearance frequency.")
    viral_moments: List[str] = Field(..., description="Moments likely to trend or go viral.")


class DesignerCollaborationInfluences(BaseModel):
    """Designer collaboration details."""
    guest_designers_partners: List[str] = Field(..., description="Any guest collaborators or partner designers.")
    cross_industry_references: List[str] = Field(..., description="References drawn from other industries (e.g., films, sports, subcultures).")


class FashionShowAnalysis(BaseModel):
    """Complete analysis of a single fashion show video."""
    video_url: str = Field(description="URL of the analyzed video for backtracking")
    trend_identification: TrendIdentification = Field(..., description="Summary of silhouettes, colors, fabrics, and seasonal styles, with frequency counts for each.")
    collection_analysis: CollectionAnalysis = Field(..., description="Analytical breakdown of themes, demographics, and statement pieces, with frequency counts.")
    styling_insights: StylingInsights = Field(..., description="Insights into accessories, layering, and overall outfit styling, with frequency for each trend.")
    diversity_representation: DiversityRepresentation = Field(..., description="Representation diversity in models and inclusivity messaging.")
    show_production: ShowProduction = Field(..., description="Details about set design, music, and audience experience.")
    commercial_potential: CommercialPotential = Field(..., description="Assessment of pieces most likely to succeed commercially, including frequency of appearance.")
    designer_collaboration_influences: DesignerCollaborationInfluences = Field(..., description="Influences from collaborations or other industries.")


class VideoTrendOutput(BaseModel):
    """Structured output for Video Trend Analyzer Agent."""
    per_video_results: List[FashionShowAnalysis] = Field(description="Analysis results per video")
    trending_elements: List[str] = Field(description="Trending elements by category like what is most frequent silhouettes, colors, fabrics, wearing patterns across all videos")
    commercial_insights: str = Field(description="Commercial potential insights summary across all videos")


class VideoTrendState(TypedDict):
    """Internal state for Video Analyzer agent."""
    video_urls: List[str]
    processed_count: int
    per_video_results: List[Dict[str, Any]]
    metrics_summary: Dict[str, Any]
    errors: Dict[str, Any]


# =========================
# Agent 4: Final Processor - Output Models
# =========================


class ColorTrend(BaseModel):
    name: str = Field(..., description="Name of the dominant color (e.g., Black, Beige).")
    pantone_code: str = Field(..., description="Pantone color code representing the color.")
    frequency: int = Field(..., description="Number of times this color appeared in the analyzed outfits.")
    trend_direction: str = Field(..., description="Indicates whether the color is rising, stable, or declining in popularity.")
    confidence_score: float = Field(..., description="Confidence score (0-1) indicating reliability of the color trend analysis.")


class StyleTrend(BaseModel):
    trend_name: str = Field(..., description="Name of the style trend (e.g., Oversized Blazers).")
    frequency: int = Field(..., description="Number of times this style trend appeared in the analyzed outfits.")
    trend_direction: str = Field(..., description="Direction of the style trend (rising, stable, declining).")
    confidence_score: float = Field(..., description="Confidence score (0-1) indicating reliability of the style trend analysis.")
    description: str = Field(..., description="Brief explanation of the style trend.")
    key_pieces: List[str] = Field(..., description="List of key clothing or accessory pieces associated with this style trend.")


class PatternTrend(BaseModel):
    pattern_name: str = Field(..., description="Name of the pattern (e.g., Polka Dots, Stripes).")
    pattern_type: str = Field(..., description="Type/category of the pattern (e.g., Geometric, Floral).")
    frequency: int = Field(..., description="Number of times this pattern appeared in the analyzed outfits.")
    trend_direction: str = Field(..., description="Direction of the pattern trend (rising, stable, declining).")
    confidence_score: float = Field(..., description="Confidence score (0-1) indicating reliability of the pattern trend analysis.")
    description: str = Field(..., description="Brief description of the pattern and its characteristics.")
    scale: str = Field(..., description="Scale or size of the pattern (e.g., Small, Medium, Large).")
    color_combinations: List[str] = Field(..., description="List of common color combinations associated with the pattern.")


class PrintTrend(BaseModel):
    print_name: str = Field(..., description="Name of the print (e.g., Animal Print).")
    print_category: str = Field(..., description="Category of the print (e.g., Abstract, Graphic, Nature).")
    frequency: int = Field(..., description="Number of times this print appeared in the analyzed outfits.")
    trend_direction: str = Field(..., description="Direction of the print trend (rising, stable, declining).")
    confidence_score: float = Field(..., description="Confidence score (0-1) indicating reliability of the print trend analysis.")
    description: str = Field(..., description="Brief description of the print and its relevance.")
    placement_style: str = Field(..., description="Typical placement or styling of the print (e.g., All-over, Accents).")
    color_palette: List[str] = Field(..., description="List of prominent colors found in the print palette.")


class MaterialTrend(BaseModel):
    material: str = Field(..., description="Type of fabric or material trending (e.g., Denim, Linen).")
    frequency: int = Field(..., description="Number of times this material appeared in the analyzed outfits.")
    trend_direction: str = Field(..., description="Direction or nature of the material trend (rising, stable, declining).")


class SilhouetteTrend(BaseModel):
    silhouette: str = Field(..., description="Type of silhouette or cut trending (e.g., A-line, Oversized).")
    frequency: int = Field(..., description="Number of times this silhouette appeared in the analyzed outfits.")
    trend_direction: str = Field(..., description="Direction or nature of the silhouette trend (rising, stable, declining).")


class SeasonalInsights(BaseModel):
    fall: List[str] = Field(..., description="Key trends and insights predicted for the Fall season.")
    winter: List[str] = Field(..., description="Key trends and insights predicted for the Winter season.")
    spring: List[str] = Field(..., description="Key trends and insights predicted for the Spring season.")
    summer: List[str] = Field(..., description="Key trends and insights predicted for the Summer season.")


class TrendAnalysisOutput(BaseModel):
    analysis_date: str = Field(default="2025-09-23", description="Date of the trend analysis in YYYY-MM-DD format.")
    total_outfits_analyzed: int = Field(..., description="Total number of outfits analyzed to derive these trends.")
    dominant_color_trends: List[ColorTrend] = Field(..., description="List of dominant color trends identified in the analysis.")
    style_trends: List[StyleTrend] = Field(..., description="List of style trends identified in the analysis.")
    pattern_trends: List[PatternTrend] = Field(..., description="List of pattern trends identified in the analysis.")
    print_trends: List[PrintTrend] = Field(..., description="List of print trends identified in the analysis.")
    material_trends: List[MaterialTrend] = Field(..., description="List of trending materials identified in the analysis.")
    silhouette_trends: List[SilhouetteTrend] = Field(..., description="List of trending silhouettes identified in the analysis.")
    seasonal_insights: SeasonalInsights = Field(..., description="Season-specific insights and predictions for upcoming trends.")
    predicted_next_season_trends: List[str] = Field(..., description="Predicted trends likely to emerge in the next season.")


class TrendAnalysisList(BaseModel):
    trend_analysis: TrendAnalysisOutput = Field(description="Trend analysis results")
    overall_confidence_score: float = Field(..., description="Overall confidence score (0-1) indicating the reliability of this entire analysis.")
    analysis_summary: str = Field(..., description="High-level summary of the entire trend analysis.")

# =========================
# Agent 5: Outfit Designer - Output Models
# =========================

class OutfitRevision(BaseModel):
    """Individual revision details."""
    revision_number: int = Field(description="Revision iteration number")
    feedback: str = Field(description="Feedback that triggered this revision")
    changes_made: List[str] = Field(description="List of changes made in this revision")
    design_confidence: float = Field(ge=0.0, le=1.0, description="Confidence in design after revision")


class FashionMetrics(BaseModel):
    """Fashion metrics for outfit evaluation."""
    Formality: float = Field(ge=0.0, le=1.0, description="Formality level of the outfit")
    Trendiness: float = Field(ge=0.0, le=1.0, description="Trendiness level of the outfit")
    Boldness: float = Field(ge=0.0, le=1.0, description="Boldness level of the outfit")
    Wearability: float = Field(ge=0.0, le=1.0, description="Wearability level of the outfit")


class OutfitDesignOutput(BaseModel):
    """Structured output for individual outfit design."""
    outfit_name: str = Field(description="Unique identifier for the outfit")
    outfit_description: str = Field(description="Summary of the final outfit design")
    season: str = Field(description="Season(s) the outfit is designed for")
    occasion: str = Field(description="Occasion(s) the outfit is designed for")
    fashion_metrics: FashionMetrics = Field(description="Fashion metrics related to the outfit design")
    style_tags: List[str] = Field(description="List of style tags associated with the outfit") 
    dominant_colors: List[str] = Field(description="Dominant colors used in the outfit")
    forecasted_popularity: float = Field(ge=0.0, le=1.0, description="Forecasted popularity score for the outfit based on trends relevancy")
    target_market_alignment: str = Field(description="How well the design aligns with Indian 18-26 market")
    trend_incorporation: List[str] = Field(description="List of trends incorporated from analysis")
    total_revisions: int = Field(ge=0, description="Total number of design revisions")
    revision_history: List[OutfitRevision] = Field(description="History of all revisions")
    final_garment_specs: Dict[str, Any] = Field(description="Final garment specifications sent to MCP")
    saved_image_path: str = Field(description="Path to saved outfit image")
    design_success: bool = Field(description="Whether the design process was successful")
    reflection_insights: List[str] = Field(description="Key insights from reflection process")


class ListofOutfits(BaseModel):
    """Collection of outfit designs."""
    Outfits: List[OutfitDesignOutput] = Field(description="List of outfits designed")


class OutfitDesignState(TypedDict):
    """Internal state for Outfit Designer agent."""
    content_analysis_results: List[Dict[str, Any]]
    video_analysis_results: List[Dict[str, Any]] 
    final_trend_report: Dict[str, Any]
    current_design: Dict[str, Any]
    revision_count: int
    reflection_feedback: str
    design_complete: bool
    errors: Dict[str, Any]


# =========================
# Agent 6: Video Generator - Output Models
# =========================

class VideoGenerationOutput(BaseModel):
    """Individual video generation result."""
    outfit_id: str = Field(description="ID of the outfit this video was generated for")
    input_image_path: str = Field(description="Path to the input outfit image")
    output_video_path: str = Field(description="Path to the generated video file")
    generation_success: bool = Field(description="Whether video generation was successful")
    generation_time: float = Field(description="Time taken to generate video in seconds")
    error_message: str = Field(default="", description="Error message if generation failed")
    video_duration: float = Field(description="Duration of generated video in seconds")
    video_format: str = Field(default="mp4", description="Output video format")


class VideoGenerationCollectionOutput(BaseModel):
    """Collection of video generation results."""
    total_outfits_processed: int = Field(description="Total number of outfits processed")
    successful_videos: int = Field(description="Number of successfully generated videos")
    failed_videos: int = Field(description="Number of failed video generations")
    video_results: List[VideoGenerationOutput] = Field(description="Individual video generation results")
    total_processing_time: float = Field(description="Total time for all video generations")
    output_directory: str = Field(description="Directory where videos were saved")


# =========================
# Main Workflow State
# =========================

class FashionAnalysisState(TypedDict):
    """Main state for the entire fashion analysis workflow with parallel execution support."""
    # Input
    query: str
    
    # Human-in-the-loop fields
    user_input: Dict[str, Any]  # UserInput.model_dump() - custom URLs/images from user
    awaiting_outfit_review: bool  # True when paused for outfit approval
    outfit_review_decision: Dict[str, Any]  # OutfitReviewDecision.model_dump() - human decision
    
    # Agent outputs (use list concatenation for parallel updates)
    data_urls: Annotated[List[Dict[str, Any]], operator.add]
    content_analysis: Annotated[List[Dict[str, Any]], operator.add]
    video_analysis: Annotated[List[Dict[str, Any]], operator.add]
    final_report: Dict[str, Any]
    outfit_designs: Annotated[List[Dict[str, Any]], operator.add]
    outfit_videos: Annotated[List[Dict[str, Any]], operator.add]
    
    # State management - all need reducers for parallel node updates
    agent_memories: Annotated[Dict[str, Dict[str, Any]], merge_agent_memories]
    execution_status: Annotated[Dict[str, str], merge_dicts]
    errors: Annotated[Dict[str, str], merge_dicts]


# =========================
# Note on Agent State Schemas
# =========================
# Per LangGraph v1.0 guidelines:
# - create_agent only supports TypedDict for state schemas (not Pydantic BaseModel)
# - Custom state for agents should extend AgentState from langgraph.prebuilt
# - Use AnyMessage for message fields to ensure proper serialization
# - Pydantic BaseModel is used for structured output (response_format), not state
