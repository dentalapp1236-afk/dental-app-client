import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import StarRating from "../components/StarRating";
import SlotPicker from "../components/SlotPicker";
import PublicTopbar from "../components/PublicTopbar";

export default function DentistProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dentist, setDentist] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Review form (clients only)
  const [myRating, setMyRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Association (clients only)
  const [assoc, setAssoc] = useState(null); // { dentist, pending }
  const [assocMsg, setAssocMsg] = useState("");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/dentists/${id}`);
        setDentist(data.dentist);
        setReviews(data.reviews);
      } catch (err) {
        if (err.response?.status === 404) setNotFound(true);
        else console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (user?.role === "client") {
      api.get("/associations/me").then((r) => setAssoc(r.data)).catch(() => {});
    }
  }, [user]);

  // Logged-out visitor chose this clinic: remember it, then send them to sign up.
  const startAssociate = () => {
    sessionStorage.setItem("pendingAssociation", JSON.stringify({ id, name: dentist?.name || "" }));
    navigate("/register");
  };

  const requestAssociation = async () => {
    setAssocMsg("");
    setRequesting(true);
    try {
      await api.post("/associations/request", { dentistId: id });
      setAssoc((a) => ({ ...(a || {}), pending: { dentist: { _id: id, name: dentist.name } } }));
      setAssocMsg("Request sent — the dentist will be notified.");
    } catch (err) {
      setAssocMsg(err.response?.data?.message || "Could not send request.");
    } finally {
      setRequesting(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setReviewError("");
    if (!myRating) {
      setReviewError("Please pick a star rating.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post(`/dentists/${id}/reviews`, {
        rating: myRating,
        comment,
      });
      setDentist(data.dentist);
      setReviews(data.reviews);
      setComment("");
    } catch (err) {
      setReviewError(err.response?.data?.message || "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page"><p className="muted">Loading…</p></div>;
  if (notFound) return <div className="page"><p className="muted">Dentist not found.</p></div>;

  return (
    <>
      {!user && <PublicTopbar />}
      <div className="page">
      <div className="card">
        <div className="row gap" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0 }}>Dr. {dentist.name}</h1>
            {dentist.clinicName && <div className="muted">{dentist.clinicName}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <StarRating value={dentist.rating} size={22} />
            <div className="muted">
              {dentist.rating ? dentist.rating.toFixed(1) : "No ratings yet"}
              {dentist.reviewCount ? ` · ${dentist.reviewCount} reviews` : ""}
            </div>
          </div>
        </div>

        <div className="row gap" style={{ flexWrap: "wrap", marginTop: 8 }}>
          {dentist.specialization && (
            <span className="tag icon">
              <Icon name="medical_services" size={16} /> {dentist.specialization}
            </span>
          )}
          {dentist.yearsOfExperience != null && (
            <span className="tag icon">
              <Icon name="workspace_premium" size={16} /> {dentist.yearsOfExperience} yrs
            </span>
          )}
        </div>

        {!user && (
          <div className="assoc-bar">
            <button onClick={startAssociate} className="icon">
              <Icon name="person_add" size={18} /> Associate with this clinic
            </button>
            <span className="muted" style={{ marginLeft: 8 }}>
              You'll create a patient account to connect.
            </span>
          </div>
        )}

        {user?.role === "client" && (
          <div className="assoc-bar">
            {assoc?.dentist?._id === id ? (
              <span className="badge icon"><Icon name="verified" size={16} /> You're associated with this dentist</span>
            ) : assoc?.dentist ? (
              <span className="muted">You're already with Dr. {assoc.dentist.name}. Leave them first to switch.</span>
            ) : assoc?.pending ? (
              <span className="badge-pending">Request pending…</span>
            ) : (
              <button onClick={requestAssociation} disabled={requesting} className="icon">
                <Icon name="person_add" size={18} /> {requesting ? "Sending…" : "Request to associate"}
              </button>
            )}
            {assocMsg && <span className="muted" style={{ marginLeft: 8 }}>{assocMsg}</span>}
          </div>
        )}

        {dentist.about && (
          <>
            <hr className="divider" />
            <h3>About</h3>
            <p>{dentist.about}</p>
          </>
        )}

        {dentist.availability?.length > 0 && (
          <>
            <hr className="divider" />
            <h3 className="icon"><Icon name="event_available" size={18} /> Check availability</h3>
            <p className="muted" style={{ marginTop: -4 }}>
              Pick a day to see which slots are open.
            </p>
            <SlotPicker dentistId={id} availabilityOverride={dentist.availability} readOnly />

            <hr className="divider" />
            <h3 className="icon"><Icon name="schedule" size={18} /> Clinic hours</h3>
            <div className="row gap" style={{ flexWrap: "wrap" }}>
              {dentist.availability.map((slot, i) => (
                <span key={i} className="tag">
                  {slot.day} {slot.start}–{slot.end}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Leave a review — only patients associated with this dentist */}
      {user?.role === "client" && assoc?.dentist?._id !== id && (
        <p className="muted" style={{ marginTop: 12 }}>
          You can leave a review once Dr. {dentist.name} approves your association.
        </p>
      )}
      {user?.role === "client" && assoc?.dentist?._id === id && (
        <form className="card" onSubmit={submitReview}>
          <h3 className="icon"><Icon name="rate_review" size={18} /> Leave a review</h3>
          {reviewError && <div className="error">{reviewError}</div>}
          <StarRating value={myRating} onChange={setMyRating} size={28} />
          <textarea
            rows={3}
            placeholder="Share your experience (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit review"}
          </button>
        </form>
      )}

      <h2 className="icon"><Icon name="reviews" /> Reviews</h2>
      {reviews.length === 0 ? (
        <p className="muted">No reviews yet.</p>
      ) : (
        reviews.map((r) => (
          <div key={r._id} className="card" style={{ marginTop: 12 }}>
            <div className="row gap" style={{ justifyContent: "space-between" }}>
              <strong>{r.client?.name || "Patient"}</strong>
              <StarRating value={r.rating} size={16} />
            </div>
            {r.comment && <p style={{ margin: "6px 0 0" }}>{r.comment}</p>}
          </div>
        ))
      )}
      </div>
    </>
  );
}
