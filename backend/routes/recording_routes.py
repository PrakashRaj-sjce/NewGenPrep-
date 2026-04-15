"""
NewGenPrep - Recording Routes
Handles: upload interview recordings (webcam/screen) to local/Azure/S3 storage
"""

import os
from datetime import datetime
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends

from services.db_service import get_session, save_session
from routes.auth_routes import get_authenticated_user

router = APIRouter(prefix="/api/interview", tags=["Recording"])

def _assert_session_owner(session: dict, user: dict) -> None:
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user token")
    session_user_id = session.get("user_id")
    if not session_user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    if session_user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized for this session")


@router.post("/upload-recording")
async def upload_recording(
    session_id: str,
    recording_type: str,
    recording: UploadFile = File(...),
    user=Depends(get_authenticated_user),
):
    """Upload interview recordings (webcam or screen). Max 500MB."""
    try:
        session = await get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        _assert_session_owner(session, user)

        recording_data = await recording.read()
        file_size = len(recording_data)

        if file_size > 500 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Recording too large (max 500MB)")

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        file_extension = recording.filename.split(".")[-1] if "." in recording.filename else "webm"
        storage_filename = f"{session_id}_{recording_type}_{timestamp}.{file_extension}"

        storage_provider = os.getenv("RECORDING_STORAGE_PROVIDER", "local").lower()
        storage_url = None

        if storage_provider == "local":
            local_path = os.getenv("LOCAL_RECORDING_PATH", "./recordings")
            os.makedirs(local_path, exist_ok=True)
            file_path = os.path.join(local_path, storage_filename)
            with open(file_path, "wb") as f:
                f.write(recording_data)
            storage_url = f"file://{os.path.abspath(file_path)}"

        elif storage_provider == "azure":
            conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "")
            container = os.getenv("AZURE_STORAGE_CONTAINER", "interview-recordings")
            if not conn_str or conn_str.startswith("your-"):
                raise HTTPException(status_code=500, detail="Azure Blob Storage not configured")
            try:
                from azure.storage.blob import BlobServiceClient
                blob_client = BlobServiceClient.from_connection_string(conn_str).get_blob_client(
                    container=container, blob=storage_filename
                )
                blob_client.upload_blob(recording_data, overwrite=True)
                storage_url = blob_client.url
            except ImportError:
                raise HTTPException(status_code=500, detail="azure-storage-blob not installed")

        elif storage_provider == "s3":
            bucket = os.getenv("AWS_S3_BUCKET", "interview-recordings")
            region = os.getenv("AWS_REGION", "us-east-1")
            access_key = os.getenv("AWS_ACCESS_KEY_ID", "")
            secret_key = os.getenv("AWS_SECRET_ACCESS_KEY", "")
            if not access_key or access_key.startswith("your-"):
                raise HTTPException(status_code=500, detail="AWS S3 not configured")
            try:
                import boto3
                s3 = boto3.client("s3", region_name=region, aws_access_key_id=access_key, aws_secret_access_key=secret_key)
                s3.put_object(Bucket=bucket, Key=storage_filename, Body=recording_data, ContentType="video/webm")
                storage_url = f"https://{bucket}.s3.{region}.amazonaws.com/{storage_filename}"
            except ImportError:
                raise HTTPException(status_code=500, detail="boto3 not installed")
        else:
            raise HTTPException(status_code=400, detail=f"Unknown storage provider: {storage_provider}")

        recording_field = f"{recording_type}_recording_url"
        session[recording_field] = storage_url
        session[f"{recording_field}_uploaded_at"] = datetime.utcnow().isoformat()
        await save_session(session_id, session)

        return {
            "success": True, "storage_url": storage_url,
            "storage_provider": storage_provider,
            "file_size_mb": round(file_size / (1024 * 1024), 2),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
