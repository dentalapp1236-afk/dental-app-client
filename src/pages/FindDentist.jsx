import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import StarRating from "../components/StarRating";
import PublicTopbar from "../components/PublicTopbar";
import { SkeletonCards } from "../components/Skeleton";

export default function FindDentist() {
  const { user } = useAuth();
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locStatus, setLocStatus] = useState("Finding dentists near you…");

  const load = async (lat, lng) => {
    setLoading(true);
    try {
      const params = lat != null && lng != null ? { lat, lng } : {};
      const { data } = await api.get("/dentists", { params });
      setDentists(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocStatus("Location unavailable — showing top-rated dentists.");
      load();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocStatus("Sorted by distance from your location.");
        load(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocStatus("Location denied — showing top-rated dentists.");
        load();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return (
    <>
      {!user && <PublicTopbar />}
      <div className="page">
      <h1 className="icon">
        <Icon name="person_search" /> Find a dentist
      </h1>
      <p className="muted">{locStatus}</p>
      {!user && (
        <p className="muted">
          Browse clinics near you, then sign in or create an account to connect with one.
        </p>
      )}

      {loading ? (
        <SkeletonCards count={6} />
      ) : dentists.length === 0 ? (
        <p className="muted">No dentists registered yet.</p>
      ) : (
        <div className="dentist-grid">
          {dentists.map((d) => (
            <Link key={d._id} to={`/dentists/${d._id}`} className="dentist-card">
              <div className="row gap" style={{ justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>Dr. {d.name}</h3>
                {d.distanceKm != null && (
                  <span className="badge icon">
                    <Icon name="near_me" size={16} /> {d.distanceKm} km
                  </span>
                )}
              </div>
              {d.clinicName && <div className="muted">{d.clinicName}</div>}
              {d.specialization && (
                <div className="tag icon">
                  <Icon name="medical_services" size={16} /> {d.specialization}
                </div>
              )}
              <div className="row gap" style={{ marginTop: 6 }}>
                <StarRating value={d.rating} size={18} />
                <span className="muted">
                  {d.rating ? d.rating.toFixed(1) : "New"}
                  {d.reviewCount ? ` (${d.reviewCount})` : ""}
                </span>
              </div>
              {d.yearsOfExperience != null && (
                <div className="muted icon">
                  <Icon name="workspace_premium" size={16} /> {d.yearsOfExperience} yrs
                  experience
                </div>
              )}
              {d.about && <p className="clamp-2">{d.about}</p>}
            </Link>
          ))}
        </div>
      )}
      </div>
    </>
  );
}
