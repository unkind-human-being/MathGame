"use client";

import Link from "next/link";
import BackgroundSymbols from "../components/BackgroundSymbols";

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="az-offline-page">
      {/* Reuse floating math symbols background */}
      <BackgroundSymbols />

      <main className="az-offline-main">
        <section className="az-offline-card">
          {/* Top label */}
          <p className="az-offline-tagline">PWA · OFFLINE MODE</p>

          {/* Main title + subtitle */}
          <h1 className="az-offline-title">
            You&apos;re currently{" "}
            <span className="az-offline-gradient">offline</span>
          </h1>
          <p className="az-offline-subtitle">
            AZMATH is built as a{" "}
            <span className="az-highlight">Progressive Web App</span>.  
            You can still open this screen even without internet.
          </p>

          {/* Game style status box */}
          <div className="az-offline-panel">
            <div className="az-offline-panel-header">
              <span className="az-chip">Math Game Status</span>
              <span className="az-chip secondary">App Installed</span>
            </div>

            <div className="az-offline-panel-body">
              <div className="az-status-row">
                <span className="az-dot az-dot-orange" />
                <span>Connection lost · Waiting for network</span>
              </div>
              <div className="az-status-row">
                <span className="az-dot az-dot-green" />
                <span>Home screen & UI cached on this device</span>
              </div>
              <div className="az-status-row">
                <span className="az-dot az-dot-blue" />
                <span>
                  Scores & questions need internet to sync with the server
                </span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="az-buttons">
            <button
              type="button"
              className="az-btn az-btn-primary"
              onClick={handleRetry}
            >
              Retry Connection
            </button>
            <Link href="/" className="az-btn az-btn-secondary">
              Back to Home
            </Link>
          </div>

          {/* Small hint */}
          <p className="az-hint">
            Tip: If you installed AZMATH as an app on your phone, you can open
            it anytime from your home screen — with no browser UI and no URL bar.
          </p>
        </section>
      </main>

      <style jsx>{`
        .az-offline-page {
          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow: hidden;
          background: radial-gradient(
            circle at top,
            #0f172a 0,
            #020617 55%,
            #000000 100%
          );
          color: #e5e7eb;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
            sans-serif;
        }

        .az-offline-main {
          position: relative;
          z-index: 10;
          max-width: 960px;
          margin: 0 auto;
          padding: 32px 18px 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .az-offline-card {
          width: 100%;
          max-width: 720px;
          border-radius: 24px;
          padding: 24px 20px 26px;
          background: linear-gradient(
            to bottom right,
            rgba(15, 23, 42, 0.98),
            rgba(15, 23, 42, 0.9)
          );
          border: 1px solid rgba(55, 65, 81, 0.9);
          box-shadow: 0 0 28px rgba(15, 23, 42, 0.95);
        }

        .az-offline-tagline {
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #9ca3af;
          margin-bottom: 10px;
        }

        .az-offline-title {
          font-size: clamp(24px, 5.5vw, 32px);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .az-offline-gradient {
          background: linear-gradient(
            to right,
            #22c55e,
            #0ea5e9,
            #a855f7,
            #f97316
          );
          -webkit-background-clip: text;
          color: transparent;
          text-shadow: 0 0 16px rgba(0, 0, 0, 0.7);
        }

        .az-offline-subtitle {
          font-size: 14px;
          color: #9ca3af;
          line-height: 1.7;
          margin-bottom: 18px;
          max-width: 540px;
        }

        .az-highlight {
          color: #22c55e;
          font-weight: 600;
        }

        .az-offline-panel {
          border-radius: 20px;
          padding: 14px 14px;
          background: radial-gradient(
              circle at top left,
              rgba(34, 197, 94, 0.16),
              transparent 55%
            ),
            radial-gradient(
              circle at bottom right,
              rgba(56, 189, 248, 0.16),
              transparent 55%
            ),
            rgba(15, 23, 42, 0.96);
          border: 1px solid rgba(75, 85, 99, 0.9);
          margin-bottom: 18px;
        }

        .az-offline-panel-header {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }

        .az-chip {
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.9);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .az-chip.secondary {
          border-color: rgba(56, 189, 248, 0.9);
          color: #7dd3fc;
        }

        .az-offline-panel-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 12px;
          color: #d1d5db;
        }

        .az-status-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .az-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
        }

        .az-dot-orange {
          background: #f97316;
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.9);
        }

        .az-dot-green {
          background: #22c55e;
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.9);
        }

        .az-dot-blue {
          background: #38bdf8;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.9);
        }

        .az-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: flex-start;
          margin-bottom: 12px;
        }

        .az-btn {
          border-radius: 999px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 1px solid transparent;
        }

        .az-btn-primary {
          border-color: rgba(34, 197, 94, 0.9);
          background: radial-gradient(
            circle at top,
            #22c55e 0%,
            #16a34a 45%,
            #052e16 100%
          );
          color: #f9fafb;
          box-shadow: 0 0 18px rgba(34, 197, 94, 0.9),
            0 0 6px rgba(16, 185, 129, 0.7);
        }

        .az-btn-secondary {
          border-color: rgba(148, 163, 184, 0.8);
          background: linear-gradient(
            to right,
            rgba(15, 23, 42, 0.95),
            rgba(15, 23, 42, 0.8)
          );
          color: #e5e7eb;
        }

        .az-hint {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 4px;
        }

        @media (max-width: 480px) {
          .az-offline-main {
            padding: 28px 16px 36px;
          }

          .az-offline-card {
            padding: 22px 18px 24px;
          }

          .az-offline-subtitle {
            max-width: 100%;
          }
        }

        @media (min-width: 768px) {
          .az-offline-main {
            padding: 40px 24px 48px;
          }

          .az-offline-card {
            padding: 26px 24px 30px;
          }
        }
      `}</style>
    </div>
  );
}
