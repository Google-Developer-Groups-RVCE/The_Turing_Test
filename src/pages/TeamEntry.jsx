import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import { registerTeam } from "../api/responseService.js";
import Loader from "../components/Loader.jsx";

/* Person images */
import p1  from "../../reference/person1.png";
import p2  from "../../reference/person2.png";
import p3  from "../../reference/person3.png";
import p4  from "../../reference/person4.png";
import p5  from "../../reference/person5.png";
import p6  from "../../reference/person6.png";
import p7  from "../../reference/person7.png";
import p8  from "../../reference/person8.png";
import p9  from "../../reference/person9.png";
import p10 from "../../reference/person10.png";
import p11 from "../../reference/person11.png";
import p12 from "../../reference/person12.png";
import p13 from "../../reference/person13.png";

/* GDG symbol */
import gdgSymbol from "../../reference/gdg_symbol.webp";

const persons = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13];

/* ── Shared top navbar (rendered on every sub-screen too) ── */
export function TopNav() {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  return (
    <nav className="top-nav" aria-label="Site header">
      {/* Left: The Turing Test */}
      <div className="nav-left">
        <span className="nav-title">The Turing Test</span>
      </div>

      {/* Right: GDG symbol + fullscreen button */}
      <div className="nav-right">
        <img
          src={gdgSymbol}
          alt="GDG Symbol"
          className="gdg-symbol"
          draggable="false"
        />
        <button
          id="fullscreen-btn"
          type="button"
          className="btn-fullscreen"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            /* Exit fullscreen icon */
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
            </svg>
          ) : (
            /* Enter fullscreen icon */
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
          )}
        </button>
      </div>
    </nav>
  );
}

/* ── Main TeamEntry component ── */
export default function TeamEntry() {
  const { setTeamId, setTeamName } = useSession();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [step, setStep] = useState(0); // 0 = Intro, 1 = Instructions, 2 = Form
  const [btn1Clicked, setBtn1Clicked] = useState(false);
  const [btn2Clicked, setBtn2Clicked] = useState(false);

  const navigate = useNavigate();

  const handleFirstBegin = () => {
    setBtn1Clicked(true);
    setTimeout(() => setStep(1), 350);
  };

  const handleSecondBegin = () => {
    setBtn2Clicked(true);
    setTimeout(() => setStep(2), 350);
  };

  const handleStart = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a team name.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await registerTeam({ teamName: name.trim() });
      setTeamId(result.teamId);
      setTeamName(result.teamName || name.trim());
      navigate("/round1/1");
    } catch (err) {
      setError("Could not start the session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Team name form (step 2) ── */
  if (step === 2) {
    return (
      <>
        <div className="page-bg" aria-hidden="true" />
        <TopNav />
        <div className="page-wrap">
          <div className="team-entry-screen">
            <div className="team-entry-card">
              <h1 className="team-entry-title">Beat Gemini</h1>
              <p className="team-entry-subtitle">Enter your team name to begin the Turing Challenge.</p>

              <form onSubmit={handleStart} noValidate>
                <label htmlFor="teamName" className="team-entry-label">Team Name</label>
                <input
                  id="teamName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  placeholder="e.g. Team Sherlock"
                  className="team-entry-input"
                />

                {error ? (
                  <p role="alert" className="poll-error" style={{ marginBottom: "16px" }}>{error}</p>
                ) : null}

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    id="start-btn"
                    type="submit"
                    disabled={loading}
                    className="btn-glossy"
                  >
                    {loading ? "Starting..." : "Start"}
                  </button>
                </div>
              </form>

              {loading
                ? <div style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}><Loader label="Starting session..." /></div>
                : null}
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ── Instructions screen (step 1) ── */
  if (step === 1) {
    return (
      <>
        <div className="page-bg" aria-hidden="true" />
        <TopNav />
        <div className="page-wrap" style={{ position: "relative" }}>
          <div className="instructions-screen">
            <h1 className="instructions-title">Beat Gemini</h1>
            <div className="instructions-text">
              <p>You’ll face multiple challenges designed to test whether you can tell human content from Gemini.</p>
              <p>Round 1: conversations. Round 2: images. Then continue to the existing final challenge.<br />Choose carefully — the answers may not be as obvious as they seem.</p>
              <p>Can you outsmart Gemini?</p>
            </div>
          </div>
          <div className="intro-footer">
            <button
              id="begin-btn-2"
              type="button"
              className={`btn-begin${btn2Clicked ? " clicked" : ""}`}
              onClick={handleSecondBegin}
            >
              Begin
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ── Intro landing screen (step 0) ── */
  return (
    <>
      <div className="page-bg" aria-hidden="true" />
      <TopNav />
      <div className="page-wrap" style={{ position: "relative" }}>

        {/* Main split layout */}
        <div className="intro-screen">

          {/* Left: text stack */}
          <div className="intro-text">
            <h1 className="intro-title">Welcome to the Turing Challenge:</h1>
            <p className="intro-decode">Can You Outsmart Gemini?</p>
            <p className="intro-subtitle">Human or Gemini — trust your instincts.</p>
          </div>

          {/* Right: looping person images */}
          <div className="intro-image-wrap" aria-hidden="true">
            {persons.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`person ${i + 1}`}
                className="person-img"
                draggable="false"
              />
            ))}
          </div>
        </div>

        {/* Bottom: Begin button */}
        <div className="intro-footer">
          <button
            id="begin-btn"
            type="button"
            className={`btn-begin${btn1Clicked ? " clicked" : ""}`}
            onClick={handleFirstBegin}
          >
            Begin
          </button>
        </div>
      </div>
    </>
  );
}
