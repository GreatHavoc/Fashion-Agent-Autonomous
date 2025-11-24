"""
Fashion Agent - Multi-Agent Fashion Trend Analysis System

This package contains a LangGraph-based workflow for analyzing fashion trends
using multiple specialized agents working in parallel and sequential patterns.
"""

__version__ = "1.0.0"

from fashion_agent.graph import create_fashion_analysis_graph, get_graph
from fashion_agent.state import FashionAnalysisState

__all__ = [
    "create_fashion_analysis_graph",
    "get_graph",
    "FashionAnalysisState",
]
