"""
Video generation utilities for fashion runway presentations.

This module provides functionality to generate AI-powered fashion runway videos
using Google's Veo video generation API.
"""

import asyncio
import os
import uuid
import aiofiles
import shutil
from pathlib import Path
from typing import Dict, Any

import cv2
from google.genai import Client
from google.genai import types
from moviepy import VideoFileClip, concatenate_videoclips
from decouple import config

from fashion_agent.config import file_logger


# Configure environment
config.search_path = os.path.dirname(os.path.abspath(__file__))
_GOOGLE_API_ENV_KEYS = ("GoogleAPI", "GOOGLE_API_KEY")


def _get_google_api_key() -> str:
    """Resolve the Google API key from common environment variables."""
    for key in _GOOGLE_API_ENV_KEYS:
        value = config(key, default=None)
        if value:
            return value
    env_list = ", ".join(_GOOGLE_API_ENV_KEYS)
    raise RuntimeError(
        f"Missing Google API credentials. Set one of the following environment variables: {env_list}."
    )


def ensure_dir(path):
    """Create directory if it doesn't exist."""
    os.makedirs(str(path), exist_ok=True)


async def async_ensure_dir(path):
    """Create directory asynchronously."""
    await asyncio.to_thread(os.makedirs, str(path), exist_ok=True)


def blob_to_image(blob) -> "types.Image":
    """Convert a google.genai.types.Blob object into a google.genai.types.Image object."""
    if not isinstance(blob, types.Blob):
        raise TypeError("Expected a google.genai.types.Blob object.")
    
    return types.Image(
        image_bytes=blob.data,
        mime_type=blob.mime_type,
        gcs_uri=None
    )


def extract_last_frame(video_path, output_image_path):
    """Extract the last frame from a video and save it as an image."""
    try:
        cap = cv2.VideoCapture(str(video_path))
        
        if not cap.isOpened():
            file_logger.error(f"Could not open video {video_path}")
            return False
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.set(cv2.CAP_PROP_POS_FRAMES, total_frames - 1)
        ret, frame = cap.read()
        
        if ret:
            cv2.imwrite(str(output_image_path), frame)
            file_logger.info(f"Last frame extracted: {output_image_path}")
            cap.release()
            return True
        else:
            file_logger.error("Could not read the last frame")
            cap.release()
            return False
            
    except Exception as e:
        file_logger.error(f"Error extracting last frame: {e}")
        return False


def create_video_prompts():
    """Create JSON-based prompts for the two video segments with detailed cuts."""
    
    prompts = {
        "segment1": {
            "duration": "80ms",
            "description": "Model walks from back to front to display point where model presents outfit to audience",
            "cuts": [
                {
                    "scene": "Runway entrance - model walking from background to foreground",
                    "camera_position": "Behind model, elevated angle, tracking forward",
                    "camera_movement": "Smooth forward tracking shot following model's walk",
                    "duration": "20ms",
                    "from": "0ms",
                    "to": "20ms",
                    "model": "Model enters from back of runway, walks confidently toward front display point with steady pace, maintaining professional posture"
                },
                {
                    "scene": "Close-up details of outfit elements during walk",
                    "camera_position": "Front position, multiple angle cuts",
                    "camera_movement": "Quick zoom-in shots with rapid cuts between dress, shoes, and fabric details",
                    "duration": "30ms",
                    "from": "20ms",
                    "to": "50ms",
                    "model": "Model continues walking, dress fabric flows naturally, shoes create rhythmic steps, outfit details clearly visible in motion"
                },
                {
                    "scene": "Left side perspective with face turn",
                    "camera_position": "Left side of runway, medium distance",
                    "camera_movement": "Full body shot transitioning to zoom-in from face to chest level",
                    "duration": "20ms",
                    "from": "50ms",
                    "to": "70ms",
                    "model": "Model reaches display point, Model maintains straight body posture then elegantly turns neck to left toward camera at left, makes eye contact with left-side audience while continuing forward movement"
                },
                {
                    "scene": "Arrival at display point",
                    "camera_position": "Front center of runway at display point",
                    "camera_movement": "Zoom out shot revealing full model at display position",
                    "duration": "10ms",
                    "from": "70ms",
                    "to": "80ms",
                    "model": "Model still looking left, then gracefully turns head to face front, establishes eye contact with front audience, prepares for presentation"
                }
            ]
        },
        "segment2": {
            "duration": "80ms",
            "description": "Model presents outfit with elegance and professionalism at display point",
            "cuts": [
                {
                    "scene": "Bottom to top reveal of complete outfit",
                    "camera_position": "Front of model, low angle starting at feet level",
                    "camera_movement": "Smooth vertical zoom-in moving from shoes upward to shoulders",
                    "duration": "20ms",
                    "from": "0ms",
                    "to": "20ms",
                    "model": "Model stands professionally at display point, maintains elegant posture while camera showcases outfit from shoes to shoulders"
                },
                {
                    "scene": "Full body presentation with left turn",
                    "camera_position": "Front center, medium distance",
                    "camera_movement": "Zoom out shot capturing entire body",
                    "duration": "10ms",
                    "from": "20ms",
                    "to": "30ms",
                    "model": "Model slightly turns body to left, showcasing outfit's side profile and silhouette, maintains confident stance"
                },
                {
                    "scene": "Makeup and facial features close-up",
                    "camera_position": "Left side angle focusing on face",
                    "camera_movement": "Zoom-in shot concentrating on facial features and makeup details",
                    "duration": "20ms",
                    "from": "30ms",
                    "to": "50ms",
                    "model": "Model looks toward left camera, blinks eyes naturally, displays makeup artistry including eye makeup, lip color, and facial contouring"
                },
                {
                    "scene": "Professional pose presentation",
                    "camera_position": "Front center, full view",
                    "camera_movement": "Zoom out shot showing complete model",
                    "duration": "15ms",
                    "from": "50ms",
                    "to": "65ms",
                    "model": "Model turns back to face front audience, strikes professional pose showcasing outfit's front design and overall styling"
                },
                {
                    "scene": "Elegant exit with fade transition",
                    "camera_position": "Front center, wide angle",
                    "camera_movement": "Zoom out shot with gradual fade out effect",
                    "duration": "15ms",
                    "from": "65ms",
                    "to": "80ms",
                    "model": "Model turns back gracefully, begins walking away from display point, maintains elegant posture during exit as scene fades out"
                }
            ]
        }
    }
    
    return prompts


def json_to_narrative_prompt(prompt_data):
    """Convert the JSON segment format into a narrative prompt for video generation API."""
    description = prompt_data.get("description", "").strip()
    total_duration = prompt_data.get("duration", "").strip()
    cuts = prompt_data.get("cuts", [])
 
    narrative_lines = []
    header = f"{description} (Total Duration: {total_duration})"
    narrative_lines.append(header)
    narrative_lines.append("")
 
    narrative_lines.append("Lighting: Runway spotlights with dramatic shadows; maintain high-fashion editorial mood.")
    narrative_lines.append("Cinematography notes: Shallow depth of field on key cuts; seamless grading with rich contrast and enhanced saturation.")
    narrative_lines.append("Audio: Silent video with no audio track required.")
    narrative_lines.append("")
 
    narrative_lines.append("Shot-by-shot (follow exact timestamps & cuts):")
    for cut in cuts:
        time_range = f"{cut.get('from', '')} - {cut.get('to', '')}"
        scene = cut.get("scene", "").strip()
        camera_pos = cut.get("camera_position", "").strip()
        camera_move = cut.get("camera_movement", "").strip()
        model_action = cut.get("model", "").strip()
        duration = cut.get("duration", "").strip()
 
        cut_desc = f"- {time_range} ({duration}) | Scene: {scene}"
        narrative_lines.append(cut_desc)
        narrative_lines.append(f"  Camera: {camera_pos} | Movement: {camera_move}")
        narrative_lines.append(f"  Model Action: {model_action}")
 
        scene_lower = scene.lower()
        model_lower = model_action.lower()
        combined_text = f"{scene_lower} {model_lower}"
        
        if any(k in combined_text for k in ["face", "makeup", "eye", "lip", "skin", "cheek", "eyes", "blink"]):
            narrative_lines.append("  Render note: prioritize skin texture, eye/lip detail, highlight/shimmer, and natural grain for closeups.")
        if any(k in combined_text for k in ["fabric", "weave", "print", "texture", "dress", "outfit", "cloth"]):
            narrative_lines.append("  Render note: include fabric detail with shallow depth-of-field and crisp texture capture.")
        if any(k in combined_text for k in ["shoe", "step", "hem", "hands", "accessory", "ring", "bracelet", "bag", "shoes"]):
            narrative_lines.append("  Render note: emphasize movement & tactile detail with precise focus.")
        
        narrative_lines.append("")
 
    narrative_lines.append("Editorial notes:")
    narrative_lines.append("- Use hard cuts where indicated; preserve continuity across adjacent cuts.")
    narrative_lines.append("- Include zoom-ins and zoom-outs exactly at the timestamps listed.")
    narrative_lines.append("- When the camera angle changes, adjust the camera angle rather than rotating the model. Generate a background if needed.")
    narrative_lines.append("- Maintain color continuity and grading across the timeline; favor high-fashion contrast and saturation.")
    narrative_lines.append("- Prioritize face & outfit sharpness for closeups; allow background blur for editorial depth.")
    narrative_lines.append("- Keep total segment duration equal to the specified duration and match cuts precisely for frame-accurate editing.")
    narrative_lines.append("- Generate silent video without audio track.")
 
    narrative = "\n".join(narrative_lines).strip()
    return narrative
 

async def generate_video_segment(client, prompt_data, image_blob, segment_name):
    """Generate a single video segment using Google Veo API."""
    
    await asyncio.sleep(10)
    
    narrative_prompt = json_to_narrative_prompt(prompt_data)
    
    file_logger.info(f"Generating {segment_name}...")
    operation = await client.models.generate_videos(
        model="veo-3.0-generate-001",
        prompt=narrative_prompt,
        image=image_blob,
    )

    while not operation.done:
        file_logger.info("Waiting for video generation to complete...")
        await asyncio.sleep(5)
        operation = await client.operations.get(operation)

    output_dir = "data/vid_segments"
    await async_ensure_dir(output_dir)

    file_name = f"{output_dir}/{str(uuid.uuid4())}_{segment_name}.mp4"
    file_logger.info(f"Saving generated video to: {file_name}")
    video = operation.response.generated_videos[0]

    downloaded = await client.files.download(file=video.video)

    video_bytes = None
    if isinstance(downloaded, (bytes, bytearray)):
        video_bytes = bytes(downloaded)
    elif hasattr(downloaded, "data"):
        video_bytes = getattr(downloaded, "data")
    elif hasattr(downloaded, "video_bytes"):
        video_bytes = getattr(downloaded, "video_bytes")
    else:
        uri = getattr(video.video, "uri", None)
        if uri:
            try:
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    async with session.get(uri) as resp:
                        video_bytes = await resp.read()
            except Exception as e:
                file_logger.error(f"Fallback HTTP download failed: {e}")

    if not video_bytes:
        raise RuntimeError(
            "Failed to obtain generated video bytes. The SDK returned a remote video reference; "
            "use the return value from client.files.download or fetch the URI and save the bytes locally."
        )

    async with aiofiles.open(file_name, 'wb') as f:
        await f.write(video_bytes)
    file_logger.info(f"Generated video saved to {file_name}")

    return file_name


def patch_videos_with_moviepy(video_paths, output_path):
    """Patch multiple videos together using MoviePy."""
    
    try:
        file_logger.info("Loading video clips...")
        clips = []
        
        for video_path in video_paths:
            file_logger.info(f"Loading: {video_path}")
            clip = VideoFileClip(str(video_path))
            clip = clip.without_audio()
            clips.append(clip)
        
        file_logger.info("Concatenating video clips...")
        final_clip = concatenate_videoclips(clips, method="compose")
        
        file_logger.info(f"Writing final video to: {output_path}")
        final_clip.write_videofile(
            str(output_path), 
            audio=False,
            logger=None
        )
        
        final_clip.close()
        for clip in clips:
            clip.close()
        
        file_logger.info(f"Successfully created final video: {output_path}")
        return True
        
    except Exception as e:
        file_logger.error(f"Error patching videos with MoviePy: {e}")
        return False


def move_file(source_path, destination_path):
    """Move a file from source to destination."""
    try:
        if not os.path.isfile(source_path):
            raise FileNotFoundError(f"Source file not found: {source_path}")
        
        if os.path.isdir(destination_path):
            destination_path = os.path.join(destination_path, os.path.basename(source_path))
        
        shutil.move(source_path, destination_path)
        file_logger.info(f"File moved successfully to: {destination_path}")
    except Exception as e:
        file_logger.error(f"Error moving file: {e}")


async def vid_generator(initial_image_path):
    """
    Main video generation function.
    
    Generates a complete fashion runway video from an initial outfit image.
    Creates two segments and patches them together.
    
    Args:
        initial_image_path: Path to the outfit image
        
    Returns:
        str: Path to generated video, or None if failed
    """
    file_id = str(uuid.uuid4())
    
    file_logger.info("Initializing Google GenAI client...")
    aclient = Client(api_key=_get_google_api_key()).aio
    
    output_dir = Path("videos")
    await async_ensure_dir(output_dir)

    frames_dir = Path("extracted_frames")
    await async_ensure_dir(frames_dir)

    async def read_image_bytes(path):
        async with aiofiles.open(path, 'rb') as f:
            return await f.read()

    file_logger.info(f"Loading initial image from: {initial_image_path}")
    image_bytes = await read_image_bytes(initial_image_path)
    image_blob = types.Part.from_bytes(data=image_bytes, mime_type='image/png')
    image = blob_to_image(image_blob.inline_data)

    prompts = create_video_prompts()
    video_paths = []

    try:
        segment_name = "segment1"
        file_logger.info(f"=== Generating {segment_name} ===")
        video_path = await generate_video_segment(
            aclient,
            prompts[segment_name],
            image,
            segment_name
        )
        video_paths.append(video_path)
        file_logger.info(f"{segment_name} completed: {video_path}")

        last_frame_path = frames_dir / f"{segment_name}_last_frame.jpg"
        last_frame_ok = await asyncio.to_thread(extract_last_frame, video_path, last_frame_path)
        
        if not last_frame_ok:
            final_video_path = output_dir / f"{file_id}_complete_runway_presentation.mp4"
            await asyncio.to_thread(move_file, video_path, final_video_path)
            file_logger.info(f"Video generated and saved to: {final_video_path}")
            await aclient.aclose()
            return str(final_video_path)

        file_logger.info("Waiting 10 seconds before generating segment 2...")
        await asyncio.sleep(10)
        
        image_bytes = await read_image_bytes(last_frame_path)
        image_blob = types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg')
        image2 = blob_to_image(image_blob.inline_data)
        
        try:
            segment_name = "segment2"
            file_logger.info(f"=== Generating {segment_name} ===")
            video_path = await generate_video_segment(
                aclient,
                prompts[segment_name],
                image2,
                segment_name
            )
            video_paths.append(video_path)
        except Exception as e:
            file_logger.error(f"Error generating second segment: {e}")
            final_video_path = output_dir / f"{file_id}_complete_runway_presentation.mp4"
            await asyncio.to_thread(move_file, video_paths[0], final_video_path)
            file_logger.info(f"Video generated and saved to: {final_video_path}")
            await aclient.aclose()
            return str(final_video_path)
            
    except Exception as e:
        file_logger.error(f"Unable to generate video: {e}")
        await aclient.aclose()
        return None

    final_video_path = output_dir / f"{file_id}_complete_runway_presentation.mp4"
    
    try:
        patched = await asyncio.to_thread(patch_videos_with_moviepy, video_paths, final_video_path)
    except Exception as exc:
        file_logger.error(f"Error running video patch in thread: {exc}")
        await aclient.aclose()
        return None

    if patched:
        file_logger.info(f"Complete runway video created: {final_video_path}")
        await aclient.aclose()
        return str(final_video_path)
    else:
        file_logger.error("Failed to create final video")
        await aclient.aclose()
        return None
