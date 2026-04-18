# Seva Setu 🤝

**Citizen Incident Reporting Platform**

Seva Setu is a robust, location-based reporting system designed to bridge the gap between citizens and local authorities. It allows users to report civic issues such as potholes, garbage, and electricity failures, with AI-powered category detection and an interactive administrative dashboard.

## 🚀 Features

- **Multi-lingual Support**: Available in English and Tamil.
- **AI-Powered Detection**: Automatically categorizes issues from uploaded images using YOLOv8.
- **Location-based Reporting**: Precise reporting via OpenStreetMap (Nominatim) geocoding.
- **Admin Dashboard**: Comprehensive overview for authorities to track, filter, and resolve issues.
- **Heatmap/Map View**: Visualize issue clusters to identify hotspots.

## 🛠️ Technology Stack

- **Frontend**: React, Vite, Leaflet (Maps), CSS Modules.
- **Backend**: FastAPI (Python), Uvicorn, Pydantic.
- **AI/ML**: Ultralytics YOLOv8.
- **Geocoding**: OpenStreetMap (Nominatim API).

---

## 💻 Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js (v16+) & npm

### 1. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI server:
   ```bash
   python main.py
   ```
   The backend will be available at `http://localhost:8000`.

### 2. Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

---

## 📖 Usage Guidelines

### Reporting an Issue (User)
1. Select "Report Issue" from the navigation.
2. Choose a category (or let the AI detect it from an image).
3. Provide a location and description.
4. Upload an image (optional).
5. Submit the report.

### Managing Issues (Admin)
1. Select "Admin Dashboard".
2. Use the credentials:
   - **Username**: `admin`
   - **Password**: `admin`
3. Filter reports by status (Pending/Resolved) or search by location.
4. Mark issues as "Resolved" once handled.
5. View the "Map" to see hotspots.

---

## 🔒 Configuration Details

Ensure you have a stable internet connection for the Geocoding service (Nominatim).

If you are deploying this, create a `.env` file in the `backend` directory based on the following:

### `.env.example`
```env
# Currently not required for local development
# API_KEYS...
```

---

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
