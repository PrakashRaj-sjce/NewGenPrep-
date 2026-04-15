import httpx
import base64
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional

from security import check_xss, sanitize_string

router = APIRouter(prefix="/api/interview", tags=["Code Execution"])

class ExecuteCodeRequest(BaseModel):
    language: str
    code: str

# Judge0 CE (Community Edition) - free, no API key required
JUDGE0_API_URL = "https://ce.judge0.com"

# Judge0 uses numeric language IDs
# Full list: https://ce.judge0.com/languages
LANGUAGE_IDS = {
    "python": 71,       # Python 3.8.1
    "javascript": 63,   # JavaScript (Node.js 12.14.0)
    "typescript": 74,    # TypeScript 3.7.4
    "c": 50,             # C (GCC 9.2.0)
    "cpp": 54,           # C++ (GCC 9.2.0)
    "java": 62,          # Java (OpenJDK 13.0.1)
    "go": 60,            # Go (1.13.5)
    "rust": 73,          # Rust (1.40.0)
    "ruby": 72,          # Ruby (2.7.0)
    "php": 68,           # PHP (7.4.1)
}

# Max code length to prevent abuse
MAX_CODE_LENGTH = 50_000  # 50KB


def _optional_auth(request: Request):
    """Try to authenticate but don't fail if no token — allows guest code execution."""
    try:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            from services.auth_service import verify_token
            payload = verify_token(token)
            return payload
    except Exception:
        pass
    return {"sub": "guest", "role": "guest"}


@router.post("/execute")
async def execute_code(request: ExecuteCodeRequest, user=Depends(_optional_auth)):
    """
    Executes code in a sandboxed environment using Judge0 CE.
    Returns the stdout, stderr, and execution status.
    """
    language = sanitize_string(request.language.lower(), max_length=20)
    code = request.code

    # Safety limits
    if len(code) > MAX_CODE_LENGTH:
        raise HTTPException(status_code=413, detail=f"Code exceeds maximum length ({MAX_CODE_LENGTH} chars)")

    check_xss(language, "language")

    lang_id = LANGUAGE_IDS.get(language)
    if not lang_id:
        supported = ", ".join(sorted(LANGUAGE_IDS.keys()))
        raise HTTPException(status_code=400, detail=f"Language '{language}' not supported. Supported: {supported}")

    # Judge0 expects base64-encoded source code
    encoded_code = base64.b64encode(code.encode("utf-8")).decode("utf-8")

    payload = {
        "language_id": lang_id,
        "source_code": encoded_code,
        "stdin": "",
        "cpu_time_limit": 10,       # 10 second max
        "memory_limit": 128000,     # 128MB max
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Submit the code (wait=true makes Judge0 return results synchronously)
            response = await client.post(
                f"{JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true",
                json=payload,
                headers={"Content-Type": "application/json"},
            )

            if response.status_code not in (200, 201):
                return {
                    "success": False,
                    "error": f"Execution API returned {response.status_code}",
                    "output": response.text[:500],
                }

            result = response.json()

            # Decode base64 outputs
            stdout_b64 = result.get("stdout") or ""
            stderr_b64 = result.get("stderr") or ""
            compile_b64 = result.get("compile_output") or ""

            stdout = base64.b64decode(stdout_b64).decode("utf-8", errors="replace") if stdout_b64 else ""
            stderr = base64.b64decode(stderr_b64).decode("utf-8", errors="replace") if stderr_b64 else ""
            compile_output = base64.b64decode(compile_b64).decode("utf-8", errors="replace") if compile_b64 else ""

            status_desc = result.get("status", {}).get("description", "Unknown")
            exit_code = 0 if status_desc == "Accepted" else 1

            # Build output string
            output_parts = []
            if stdout:
                output_parts.append(stdout)
            if compile_output and status_desc != "Accepted":
                output_parts.append(f"[COMPILE ERROR]\n{compile_output}")
            if stderr:
                output_parts.append(f"[STDERR]\n{stderr}")
            if not output_parts:
                if status_desc == "Accepted":
                    output_parts.append("(No output)")
                else:
                    output_parts.append(f"Status: {status_desc}")

            return {
                "success": exit_code == 0,
                "output": "\n".join(output_parts),
                "exit_code": exit_code,
                "stderr": stderr,
                "status": status_desc,
                "time": result.get("time"),
                "memory": result.get("memory"),
            }

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Code execution exceeded timeout limit. Possible infinite loop.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to communicate with execution engine: {str(e)}")


