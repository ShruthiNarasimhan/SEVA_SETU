import { useContext } from "react";
import { LanguageContext } from "../App";
import { translations } from "../translations";

// This component receives a 'complaint' object and displays its data
function ComplaintCard({ complaint, onStatusUpdate }) {
  const { lang } = useContext(LanguageContext);
  const t = translations[lang];

  const isResolved = complaint.status === "Resolved";

  // Function to tell the backend to mark this specific complaint as resolved
  const handleResolve = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/report/${complaint.id}`,
        {
          method: "PUT",
        },
      );

      if (response.ok) {
        if (onStatusUpdate) onStatusUpdate();
      } else {
        console.error("Failed to update status");
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  return (
    <div className="card interactive">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "18px" }}>{complaint.category}</h3>
        <span
          className={`badge ${isResolved ? "badge-resolved" : "badge-pending"}`}
        >
          {isResolved ? t.resolved : t.pending}
        </span>
      </div>

      <p style={{ margin: "8px 0", fontSize: "15px" }}>
        <strong style={{ color: "var(--text-muted)" }}>{t.location}: </strong>{" "}
        {complaint.location}
      </p>

      <p style={{ margin: "8px 0", fontSize: "15px" }}>
        <strong style={{ color: "var(--text-muted)" }}>
          {t.description}:{" "}
        </strong>{" "}
        {complaint.description}
      </p>

      <p style={{ margin: "8px 0", fontSize: "15px" }}>
        <strong style={{ color: "var(--text-muted)" }}>
          {t.ai_detected}:{" "}
        </strong>{" "}
        {complaint.category}
      </p>

      {/* Cover image styling strictly proportioned */}
      {complaint.imageUrl && (
        <img
          src={complaint.imageUrl}
          alt="Complaint placeholder"
          style={{
            width: "100%",
            height: "200px",
            objectFit: "cover",
            marginTop: "16px",
            borderRadius: "8px",
          }}
        />
      )}

      {/* Button to update status */}
      <button
        className={`btn ${isResolved ? "" : "btn-primary"}`}
        style={{ width: "100%", marginTop: "20px" }}
        onClick={handleResolve}
        disabled={isResolved}
      >
        {isResolved ? t.resolved_checked : t.mark_resolved}
      </button>
    </div>
  );
}

export default ComplaintCard;
