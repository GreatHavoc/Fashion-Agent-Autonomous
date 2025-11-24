import os
from typing import Dict, List, Optional
from decouple import config
from sqlalchemy import create_engine, Column, String, JSON, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.exc import IntegrityError
from supabase import create_client, Client
import uuid
import logging
from datetime import datetime
config.search_path = os.path.dirname(os.path.abspath(__file__))
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get credentials from environment variables
DB_URL = config("DATABASE_URL", default="postgresql://user:password@localhost/dbname")
SUPABASE_URL = config("SUPABASE_URL", default="")
SUPABASE_KEY = config("SUPABASE_KEY", default="")
SUPABASE_BUCKET = config("SUPABASE_BUCKET", default="outfits")
SUPABASE_VIDEO_BUCKET = config("SUPABASE_VIDEO_BUCKET", default="videos")


# Initialize SQLAlchemy with 2.0 style
Base = declarative_base()
engine = create_engine(DB_URL, pool_pre_ping=True, pool_recycle=300)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


class MediaProcessing(Base):
    """SQLAlchemy model for media processing data"""
    __tablename__ = "media_processing"

    id = Column(String, primary_key=True)  # Removed default to allow manual ID setting
    data_collector = Column(JSON, nullable=True)
    video_analyzer = Column(JSON, nullable=True)
    content_analysis = Column(JSON, nullable=True)
    final_report = Column(JSON, nullable=True)
    outfit_generation = Column(JSON, nullable=True)
    video_generation = Column(JSON, nullable=True)
    outfit_image_urls = Column(JSON, nullable=True)  # Store URLs as JSON array
    video_urls = Column(JSON, nullable=True)  # Store video URLs as JSON array
    created_at = Column(String, default=lambda: datetime.now().isoformat())
    updated_at = Column(String, default=lambda: datetime.now().isoformat(), onupdate=lambda: datetime.now().isoformat())


def init_db():
    """Initialize database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        return False


def get_db_session() -> Session:
    """Get a database session"""
    return SessionLocal()


def upload_to_supabase(file_path: str, file_name: Optional[str] = None, bucket: Optional[str] = None) -> Optional[str]:
    """
    Upload a file to Supabase storage and return the public URL
    
    Args:
        file_path: Path to the file to upload
        file_name: Optional custom name for the file in storage
        bucket: Optional bucket name (defaults to SUPABASE_BUCKET for images)
        
    Returns:
        Public URL of the uploaded file or None if upload fails
    """
    try:
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return None
            
        # Use original filename if no custom name provided
        if file_name is None:
            file_name = os.path.basename(file_path)
            
        # Determine bucket based on file type or explicit parameter
        if bucket is None:
            # Default to images bucket
            bucket = SUPABASE_BUCKET
            
        # Generate unique path to avoid conflicts
        unique_path = f"{datetime.now().strftime('%Y/%m/%d')}/{uuid.uuid4()}-{file_name}"
        
        # Upload file to Supabase
        with open(file_path, 'rb') as f:
            result = supabase.storage.from_(bucket).upload(
                path=unique_path,
                file=f
            )
            
        if result is None:
            logger.error(f"Failed to upload file: {result.get('error', 'Unknown error')}")
            return None
            
        # Get public URL
        public_url = supabase.storage.from_(bucket).get_public_url(unique_path)
        logger.info(f"File uploaded successfully to {bucket}: {public_url}")
        return public_url
        
    except Exception as e:
        logger.error(f"Error uploading file to Supabase: {str(e)}")
        return None


def upload_image_to_supabase(file_path: str, file_name: Optional[str] = None) -> Optional[str]:
    """
    Upload an image file to Supabase storage and return the public URL
    
    Args:
        file_path: Path to the image file to upload
        file_name: Optional custom name for the file in storage
        
    Returns:
        Public URL of the uploaded image or None if upload fails
    """
    return upload_to_supabase(file_path, file_name, SUPABASE_BUCKET)


def upload_video_to_supabase(file_path: str, file_name: Optional[str] = None) -> Optional[str]:
    """
    Upload a video file to Supabase storage and return the public URL
    
    Args:
        file_path: Path to the video file to upload
        file_name: Optional custom name for the file in storage
        
    Returns:
        Public URL of the uploaded video or None if upload fails
    """
    return upload_to_supabase(file_path, file_name, SUPABASE_VIDEO_BUCKET)


def upload_multiple_images(file_paths: List[str]) -> List[str]:
    """
    Upload multiple image files to Supabase and return their URLs
    
    Args:
        file_paths: List of paths to image files
        
    Returns:
        List of public URLs of the uploaded images
    """
    urls = []
    for file_path in file_paths:
        url = upload_image_to_supabase(file_path)
        if url:
            urls.append(url)
    return urls


def upload_multiple_videos(file_paths: List[str]) -> List[str]:
    """
    Upload multiple video files to Supabase and return their URLs
    
    Args:
        file_paths: List of paths to video files
        
    Returns:
        List of public URLs of the uploaded videos
    """
    urls = []
    for file_path in file_paths:
        url = upload_video_to_supabase(file_path)
        if url:
            urls.append(url)
    return urls


def create_media_processing_record(
    record_id: Optional[str] = None,  # New parameter for custom ID
    data_collector: Optional[Dict] = None,
    video_analyzer: Optional[Dict] = None,
    content_analysis: Optional[Dict] = None,
    final_report: Optional[Dict] = None,
    outfit_generation: Optional[Dict] = None,
    video_generation: Optional[Dict] = None,
    outfit_image_paths: Optional[List[str]] = None,
    video_paths: Optional[List[str]] = None
) -> Optional[str]:
    """
    Create a new media processing record with JSON data, outfit image URLs, and video URLs
    
    Args:
        record_id: Optional custom ID for the record (generates UUID if not provided)
        data_collector: JSON data for data_collector column
        video_analyzer: JSON data for video_analyzer column
        content_analysis: JSON data for content_analysis column
        final_report: JSON data for final_report column
        outfit_generation: JSON data for outfit_generation column
        video_generation: JSON data for video_generation column
        outfit_image_paths: List of paths to outfit image files
        video_paths: List of paths to video files
        
    Returns:
        ID of the created record or None if creation fails
    """
    try:
        # Generate UUID if no custom ID provided
        if record_id is None:
            record_id = str(uuid.uuid4())
            
        # Check if record with this ID already exists
        with get_db_session() as db:
            existing_record = db.query(MediaProcessing).filter(MediaProcessing.id == record_id).first()
            if existing_record:
                logger.error(f"Record with ID {record_id} already exists")
                return None
        
        # Upload outfit images if provided
        outfit_image_urls = []
        if outfit_image_paths:
            outfit_image_urls = upload_multiple_images(outfit_image_paths)
            
        # Upload videos if provided
        video_urls = []
        if video_paths:
            video_urls = upload_multiple_videos(video_paths)
            
        # Create new record
        with get_db_session() as db:
            new_record = MediaProcessing(
                id=record_id,  # Use the provided or generated ID
                data_collector=data_collector,
                video_analyzer=video_analyzer,
                content_analysis=content_analysis,
                final_report=final_report,
                outfit_generation=outfit_generation,
                video_generation=video_generation,
                outfit_image_urls=outfit_image_urls,
                video_urls=video_urls
            )
            
            db.add(new_record)
            db.commit()
        
        logger.info(f"Created new media processing record with ID: {record_id}")
        return record_id
        
    except Exception as e:
        logger.error(f"Error creating media processing record: {str(e)}")
        return None


def update_media_processing_record(
    record_id: str,
    data_collector: Optional[Dict] = None,
    video_analyzer: Optional[Dict] = None,
    content_analysis: Optional[Dict] = None,
    final_report: Optional[Dict] = None,
    outfit_generation: Optional[Dict] = None,
    video_generation: Optional[Dict] = None,
    outfit_image_paths: Optional[List[str]] = None,
    video_paths: Optional[List[str]] = None,
    append_images: bool = False,
    append_videos: bool = False
) -> bool:
    """
    Update an existing media processing record with new JSON data, outfit image URLs, and video URLs
    
    Args:
        record_id: ID of the record to update
        data_collector: JSON data for data_collector column
        video_analyzer: JSON data for video_analyzer column
        content_analysis: JSON data for content_analysis column
        final_report: JSON data for final_report column
        outfit_generation: JSON data for outfit_generation column
        video_generation: JSON data for video_generation column
        outfit_image_paths: List of paths to outfit image files
        video_paths: List of paths to video files
        append_images: If True, append new image URLs to existing ones
        append_videos: If True, append new video URLs to existing ones
        
    Returns:
        True if update successful, False otherwise
    """
    max_retries = 3
    for attempt in range(max_retries):
        try:
            with get_db_session() as db:
                record = db.query(MediaProcessing).filter(MediaProcessing.id == record_id).first()
                
                if not record:
                    logger.info(f"Record with ID {record_id} not found, creating new record")
                    # Create a new record if it doesn't exist with empty fields
                    record = MediaProcessing(id=record_id)
                    db.add(record)
                    # Flush to detect IntegrityError from concurrent inserts
                    try:
                        db.flush()
                    except IntegrityError:
                        # Another process created the record concurrently, rollback and retry
                        db.rollback()
                        logger.warning(f"Concurrent insert detected for record {record_id}, retrying (attempt {attempt + 1}/{max_retries})")
                        continue
                    
                # Update JSON fields if provided
                if data_collector is not None:
                    record.data_collector = data_collector
                if video_analyzer is not None:
                    record.video_analyzer = video_analyzer
                if content_analysis is not None:
                    record.content_analysis = content_analysis
                if final_report is not None:
                    record.final_report = final_report
                if outfit_generation is not None:
                    record.outfit_generation = outfit_generation
                if video_generation is not None:
                    record.video_generation = video_generation
                    
                # Handle outfit images
                if outfit_image_paths:
                    new_urls = upload_multiple_images(outfit_image_paths)
                    if new_urls:
                        if append_images and record.outfit_image_urls:
                            record.outfit_image_urls.extend(new_urls)
                        else:
                            record.outfit_image_urls = new_urls
                            
                # Handle videos
                if video_paths:
                    new_urls = upload_multiple_videos(video_paths)
                    if new_urls:
                        if append_videos and record.video_urls:
                            record.video_urls.extend(new_urls)
                        else:
                            record.video_urls = new_urls
                            
                record.updated_at = datetime.now().isoformat()
                db.commit()
            
            logger.info(f"Updated media processing record with ID: {record_id}")
            return True
            
        except IntegrityError as e:
            # This shouldn't happen after the flush() retry logic, but handle it anyway
            logger.error(f"IntegrityError updating media processing record (attempt {attempt + 1}/{max_retries}): {str(e)}")
            if attempt < max_retries - 1:
                continue
            return False
        except Exception as e:
            logger.error(f"Error updating media processing record: {str(e)}")
            return False
    
    logger.error(f"Failed to update record {record_id} after {max_retries} attempts")
    return False


# Specialized update functions for individual columns
def update_data_collector(record_id: str, data: Dict) -> bool:
    """Update only the data_collector column for a specific record"""
    return update_media_processing_record(record_id, data_collector=data)


def update_video_analyzer(record_id: str, data: Dict) -> bool:
    """Update only the video_analyzer column for a specific record"""
    return update_media_processing_record(record_id, video_analyzer=data)


def update_content_analysis(record_id: str, data: Dict) -> bool:
    """Update only the content_analysis column for a specific record"""
    return update_media_processing_record(record_id, content_analysis=data)


def update_final_report(record_id: str, data: Dict) -> bool:
    """Update only the final_report column for a specific record"""
    return update_media_processing_record(record_id, final_report=data)


def update_outfit_generation(record_id: str, data: Dict) -> bool:
    """Update only the outfit_generation column for a specific record"""
    return update_media_processing_record(record_id, outfit_generation=data)


def update_video_generation(record_id: str, data: Dict) -> bool:
    """Update only the video_generation column for a specific record"""
    return update_media_processing_record(record_id, video_generation=data)


def update_outfit_images(record_id: str, image_paths: List[str], append: bool = False) -> bool:
    """Update only the outfit_image_urls column for a specific record"""
    return update_media_processing_record(
        record_id, 
        outfit_image_paths=image_paths, 
        append_images=append
    )


def update_videos(record_id: str, video_paths: List[str], append: bool = False) -> bool:
    """Update only the video_urls column for a specific record"""
    return update_media_processing_record(
        record_id, 
        video_paths=video_paths, 
        append_videos=append
    )


def get_media_processing_record(record_id: str) -> Optional[Dict]:
    """
    Get a media processing record by ID
    
    Args:
        record_id: ID of the record to retrieve
        
    Returns:
        Dictionary representation of the record or None if not found
    """
    try:
        with get_db_session() as db:
            record = db.query(MediaProcessing).filter(MediaProcessing.id == record_id).first()
            
            if not record:
                logger.error(f"Record with ID {record_id} not found")
                return None
                
            # Convert to dictionary
            result = {
                "id": record.id,
                "data_collector": record.data_collector,
                "video_analyzer": record.video_analyzer,
                "content_analysis": record.content_analysis,
                "final_report": record.final_report,
                "outfit_generation": record.outfit_generation,
                "video_generation": record.video_generation,
                "outfit_image_urls": record.outfit_image_urls,
                "video_urls": record.video_urls,
                "created_at": record.created_at,
                "updated_at": record.updated_at
            }
        
        return result
        
    except Exception as e:
        logger.error(f"Error retrieving media processing record: {str(e)}")
        return None


def delete_media_processing_record(record_id: str) -> bool:
    """
    Delete a media processing record by ID
    
    Args:
        record_id: ID of the record to delete
        
    Returns:
        True if deletion successful, False otherwise
    """
    try:
        with get_db_session() as db:
            record = db.query(MediaProcessing).filter(MediaProcessing.id == record_id).first()
            
            if not record:
                logger.error(f"Record with ID {record_id} not found")
                return False
                
            db.delete(record)
            db.commit()
        
        logger.info(f"Deleted media processing record with ID: {record_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error deleting media processing record: {str(e)}")
        return False


def execute_raw_query(query: str, params: Optional[Dict] = None) -> List[Dict]:
    """
    Execute a raw SQL query and return results as a list of dictionaries
    
    Args:
        query: SQL query to execute
        params: Optional parameters for the query
        
    Returns:
        List of dictionaries representing the query results
    """
    try:
        with get_db_session() as db:
            result = db.execute(text(query), params or {})
            rows = result.fetchall()
            
            # Convert to list of dictionaries
            columns = result.keys()
            results = [dict(zip(columns, row)) for row in rows]
        
        return results
        
    except Exception as e:
        logger.error(f"Error executing raw query: {str(e)}")
        return []


# Initialize the database when the module is imported
init_db()
