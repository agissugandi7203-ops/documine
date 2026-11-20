"use client";

export function FeatureMosaicSkeleton() {
  return (
    <section
      id="capabilities"
      className="fm-section fm-section--skeleton"
      aria-label="Loading capabilities"
    >
      <div className="fm-masthead">
        <div className="fm-skel-stack">
          <span className="fm-skel-line fm-skel-line--title" />
          <span className="fm-skel-line fm-skel-line--sub" />
        </div>
        <div className="fm-skel-stack">
          <span className="fm-skel-line fm-skel-line--copy" />
          <span className="fm-skel-line fm-skel-line--copyShort" />
        </div>
      </div>

      <div className="fm-frame">
        <div className="fm-stage">
          <div className="fm-card fm-notif fm-skel-card" />
          <div className="fm-card fm-connect fm-skel-card" />
          <div className="fm-card fm-automate fm-skel-card" />
          <div className="fm-card fm-insights fm-skel-card" />
          <div className="fm-card fm-search fm-skel-card" />
        </div>
      </div>
    </section>
  );
}
