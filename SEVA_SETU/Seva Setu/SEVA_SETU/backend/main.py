import os
import shutil
import uuid
import httpx
import uvicorn
from fastapi import FastAPI, Form, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from ultralytics import YOLO

# ✅ Load trained model
current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "best.pt")

try:
    model = YOLO(model_path)
except Exception as e:
    print(f"Warning: Could not load model from {model_path}: {e}")
    model = None

# Create FastAPI app
app = FastAPI(title="Seva Setu API")

# Ensure uploads folder exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Serve uploaded images
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS (allow frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fake DB
complaints_db = []


@app.get("/")
def root():
    return {"message": "Seva Setu API is running"}

# Response model
class ComplaintResponse(BaseModel):
    id: int
    category: str
    area: str
    location: str
    description: str
    imageUrl: str = ""
    latitude: float
    longitude: float
    status: str

# 🚀 CREATE REPORT (AI INTEGRATED)
@app.post("/report")
async def create_report(
    category: str = Form(...),
    area: str = Form(...),
    location: str = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    image: Optional[UploadFile] = File(None)
):
    new_id = len(complaints_db) + 1
    image_path = ""

    # ✅ Save image
    if image:
        ext = os.path.splitext(image.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        save_path = os.path.join(UPLOAD_DIR, filename)

        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        image_path = f"uploads/{filename}"

    # 🔥 AI DETECTION
    detected_category = category

    if image_path and model is not None:
        try:
            results = model(image_path)

            for r in results:
                if len(r.boxes) > 0:
                    cls_id = int(r.boxes[0].cls[0])
                    detected_category = model.names[cls_id]
        except Exception as e:
            print(f"Error during detection: {e}")
            detected_category = category

    # ✅ Create complaint with AI result
    new_complaint = ComplaintResponse(
        id=new_id,
        category=detected_category,  # 🔥 AI replaces manual input
        area=area,
        location=location,
        description=description,
        imageUrl=f"http://localhost:8000/{image_path}" if image_path else "",
        latitude=latitude,
        longitude=longitude,
        status="Pending"
    )

    complaints_db.append(new_complaint)

    return {
        "message": "Complaint submitted successfully",
        "detected_category": detected_category  # optional debug
    }

# GET all reports
@app.get("/reports", response_model=List[ComplaintResponse])
def get_reports():
    return complaints_db

# Update status
@app.put("/report/{complaint_id}")
def update_report_status(complaint_id: int):
    for complaint in complaints_db:
        if complaint.id == complaint_id:
            complaint.status = "Resolved"
            return {"message": "Updated"}

    raise HTTPException(status_code=404, detail="Not found")

# 🌍 Geocoding
@app.get("/geocode")
async def geocode(query: str = Query(...)):
    url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json"
    headers = {"User-Agent": "SevaSetuApp/1.0"}

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers)
            data = res.json()

            if data:
                return {
                    "lat": float(data[0]["lat"]),
                    "lon": float(data[0]["lon"]),
                    "display_name": data[0]["display_name"]
                }

            raise HTTPException(status_code=404, detail="Not found")

    except Exception:
        raise HTTPException(status_code=500, detail="Geo error")

# 🔍 Search
@app.get("/search")
async def search(query: str = Query(...)):
    url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=5"
    headers = {"User-Agent": "SevaSetuApp/1.0"}

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers)
            return res.json()

    except:
        return []


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
