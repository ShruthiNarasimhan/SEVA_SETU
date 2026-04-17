import { useState, useContext, useRef, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LanguageContext } from "../App";
import { translations } from "../translations";

// Helper component to update map center dynamically
function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

function UserReport() {
  const { lang } = useContext(LanguageContext);
  const t = translations[lang];

  const [formData, setFormData] = useState({
    category: "",
    area: "", // NEW: Explicit Locality (e.g. Adyar)
    location: "", // Full address string for backend
    street: "", // Street / Landmark
    houseNo: "", // Optional House No
    description: "",
  });
  const [locationMode, setLocationMode] = useState("manual");
  const [coords, setCoords] = useState({ lat: 13.0827, lon: 80.2707 }); // Default Chennai
  const [addressLoading, setAddressLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setCoords({ lat: newPos.lat, lon: newPos.lng });
          reverseGeocode(newPos.lat, newPos.lng);
        }
      },
    }),
    [],
  );

  const reverseGeocode = async (lat, lon) => {
    console.log(`Attempting reverse geocode for: ${lat}, ${lon}`);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      );
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        const road =
          addr.road || addr.pedestrian || addr.cycleway || addr.path || "";
        const area =
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.district ||
          "";
        const city = addr.city || addr.town || addr.village || "Chennai";

        setFormData((prev) => ({
          ...prev,
          location: area || city,
          street: road || prev.street,
        }));
      }
    } catch (err) {
      console.error("Reverse geocoding error:", err);
    }
  };

  const [suggestions, setSuggestions] = useState([]);
  const [isAutocompleteLoading, setIsAutocompleteLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Debounced autocomplete search
  useEffect(() => {
    if (searchTerm.length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsAutocompleteLoading(true);
      try {
        const url = `http://localhost:8000/search?query=${encodeURIComponent(searchTerm + " Chennai")}`;
        const response = await fetch(url);
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Autocomplete search error:", err);
      } finally {
        setIsAutocompleteLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const handleSelectSuggestion = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);

    // Extract suburb or neighborhood for the Area field
    const addr = item.address || {};
    const area =
      addr.suburb ||
      addr.neighbourhood ||
      addr.residential ||
      addr.district ||
      "Unknown";

    setCoords({ lat, lon });
    setFormData((prev) => ({
      ...prev,
      area: area,
      location: item.display_name,
    }));

    setSearchTerm(item.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
    showMessage("Location matched! You can refine it by dragging the pin.");
  };

  const handleSearchAddress = async () => {
    const query = searchTerm.trim();
    if (!query) {
      showMessage("Please enter an address to search.");
      return;
    }

    setSearchLoading(true);
    const url = `http://localhost:8000/geocode?query=${encodeURIComponent(query + " Chennai")}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setCoords({ lat: data.lat, lon: data.lon });

        // Try to get area from proxy response (we should ideally update geocode endpoint too)
        setFormData((prev) => ({ ...prev, location: data.display_name }));
        showMessage("Location found! Map updated.");
      } else {
        showMessage("No results found. Try a full address.");
      }
    } catch (err) {
      console.error("Geocoding Proxy failed:", err);
      showMessage("Connection error.");
    } finally {
      setSearchLoading(false);
    }
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showMessage("Geolocation is not supported by your browser");
      return;
    }

    setAddressLoading(true);
    setLocationMode("auto");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lon: longitude });
        await reverseGeocode(latitude, longitude);
        setAddressLoading(false);
      },
      (error) => {
        console.error("Location error:", error);
        showMessage(
          "Unable to detect precise location. Please move the marker or enter details manually.",
        );
        setLocationMode("manual");
        setAddressLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.area.trim()) {
      showMessage("Please enter an Area / Locality.");
      return;
    }
    setIsSubmitting(true);

    try {
      let finalLat = coords.lat;
      let finalLon = coords.lon;

      if (locationMode === "manual") {
        const query = encodeURIComponent(
          `${formData.area} ${formData.street} Chennai, India`,
        );
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}`,
        );
        const data = await res.json();

        if (data.length > 0) {
          finalLat = parseFloat(data[0].lat);
          finalLon = parseFloat(data[0].lon);
        }
      }

      const fullAddress = [
        formData.houseNo ? `House No: ${formData.houseNo}` : "",
        formData.street,
        formData.area,
      ]
        .filter(Boolean)
        .join(", ");

      const data = new FormData();
      data.append("category", formData.category);
      data.append("area", formData.area); // NEW FIELD
      data.append("location", fullAddress); // Detailed string
      data.append("description", formData.description);
      data.append("latitude", finalLat);
      data.append("longitude", finalLon);

      if (imageFile) data.append("image", imageFile);

      console.log("Submitting FormData:", {
        category: formData.category,
        area: formData.area,
        location: fullAddress,
        description: formData.description,
        latitude: finalLat,
        longitude: finalLon,
      });

      const response = await fetch("http://localhost:8000/report", {
        method: "POST",
        body: data,
      });

      if (response.ok) {
        const result = await response.json();
        const detectedCategory = result.detected_category || formData.category;

        setFormData({
          category: "",
          location: "",
          street: "",
          houseNo: "",
          description: "",
        });
        setCoords({ lat: 13.0827, lon: 80.2707 });
        setLocationMode("manual");
        setImageFile(null);
        setImagePreview(null);
        showMessage(
          `Issue reported successfully! AI detected: ${detectedCategory}.`,
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        showMessage("Failed to report issue. Please try again.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      showMessage("An error occurred. Please check your connection.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        maxWidth: "640px",
        margin: "0 auto",
        borderTop: "4px solid var(--primary)",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "8px" }}>
        {t.report_issue}
      </h2>
      <p
        style={{
          textAlign: "center",
          color: "var(--text-muted)",
          marginBottom: "24px",
        }}
      >
        Help us build a better city by providing precise location details.
      </p>

      {message && (
        <div
          style={{
            marginBottom: "20px",
            padding: "16px",
            borderRadius: "8px",
            textAlign: "center",
            fontWeight: "500",
            backgroundColor: message.includes("successfully")
              ? "#D1FAE5"
              : "#FEE2E2",
            color: message.includes("successfully") ? "#059669" : "#DC2626",
          }}
        >
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "28px" }}
      >
        {/* Category */}
        <div>
          <label className="input-label" htmlFor="category">
            {t.category}
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            className="input-field"
          >
            <option value="" disabled>
              {t.select_category}
            </option>
            <option value="Roads">{t.roads}</option>
            <option value="Water">{t.water}</option>
            <option value="Garbage">{t.garbage}</option>
            <option value="Electricity">{t.electricity}</option>
            <option value="Other">{t.other}</option>
          </select>
        </div>

        {/* Precise Location Section */}
        <div>
          <label className="input-label">Precise Location</label>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              marginBottom: "12px",
            }}
          >
            Click detect or drag the pin to the exact spot.
          </p>

          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <button
              type="button"
              className={`btn ${locationMode === "auto" ? "btn-primary" : "btn-outline"}`}
              style={{ flex: 1 }}
              onClick={handleDetectLocation}
            >
              📍{" "}
              {addressLoading
                ? "Detecting High Accuracy..."
                : "Use Current GPS"}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={() => setLocationMode("manual")}
            >
              ⌨️ Enter Address
            </button>
          </div>

          {/* Map Preview */}
          <div
            style={{
              height: "260px",
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid #E5E7EB",
              marginBottom: "16px",
            }}
          >
            <MapContainer
              center={[coords.lat, coords.lon]}
              zoom={15}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ChangeMapView center={[coords.lat, coords.lon]} />
              <Marker
                draggable={true}
                eventHandlers={eventHandlers}
                position={[coords.lat, coords.lon]}
                ref={markerRef}
              >
                <Popup>Current selection</Popup>
              </Marker>
            </MapContainer>
          </div>

          <div
            style={{
              background: "#F9FAFB",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #E5E7EB",
              position: "relative",
            }}
          >
            <label
              style={{
                fontSize: "13px",
                fontWeight: "bold",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Search Address
            </label>
            <div style={{ position: "relative", marginBottom: "12px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type area or street (e.g. Adyar 3rd Street)"
                  className="input-field"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: "0 16px", fontSize: "14px" }}
                  onClick={handleSearchAddress}
                  disabled={searchLoading}
                >
                  {searchLoading ? "..." : "🔍"}
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    backgroundColor: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    marginTop: "4px",
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                >
                  {suggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSuggestion(item)}
                      style={{
                        padding: "10px 14px",
                        cursor: "pointer",
                        fontSize: "14px",
                        borderBottom:
                          idx === suggestions.length - 1
                            ? "none"
                            : "1px solid #F3F4F6",
                        transition: "background-color 0.2s",
                      }}
                      onMouseOver={(e) =>
                        (e.target.style.backgroundColor = "#F9FAFB")
                      }
                      onMouseOut={(e) =>
                        (e.target.style.backgroundColor = "white")
                      }
                    >
                      {item.display_name}
                    </div>
                  ))}
                </div>
              )}
              {isAutocompleteLoading && (
                <div
                  style={{
                    position: "absolute",
                    right: "50px",
                    top: "10px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                  }}
                >
                  Searching...
                </div>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div style={{ gridColumn: "span 2" }}>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: "bold",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Locality Details
                </label>
                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  required
                  placeholder="Area / Locality (e.g. Adyar, Velachery)"
                  className="input-field"
                  style={{ marginBottom: "12px" }}
                />

                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  required
                  placeholder="Street / Landmark (Required)"
                  className="input-field"
                />
              </div>
              <div>
                <input
                  type="text"
                  name="houseNo"
                  value={formData.houseNo}
                  onChange={handleChange}
                  placeholder="House No (Optional)"
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="input-label" htmlFor="description">
            {t.description}
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            placeholder={t.description_placeholder}
            rows="3"
            className="input-field"
          />
        </div>

        {/* Image Attachment */}
        <div>
          <div
            onClick={() => document.getElementById("image-upload").click()}
            style={{
              backgroundColor: "#F9FAFB",
              border: "2px dashed #D1D5DB",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "180px",
                  borderRadius: "8px",
                }}
              />
            ) : (
              <div style={{ color: "var(--text-muted)" }}>
                <div style={{ fontSize: "28px", marginBottom: "4px" }}>📸</div>
                <strong style={{ fontSize: "14px" }}>Add Photo Evidence</strong>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || addressLoading}
          style={{
            width: "100%",
            padding: "16px",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          {isSubmitting ? "Submitting Report..." : "Submit to Authorities"}
        </button>
      </form>
    </div>
  );
}

export default UserReport;
