import { Component } from "react";
import { reportError } from "../config/sentry.js";
import "../pages/incomplete.css";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    reportError(error, { where: "error-boundary" });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="incomplete-text">
        <div>
          something went wrong.{" "}
          <button type="button" className="incomplete-link" onClick={() => window.location.reload()}>
            reload
          </button>
        </div>
      </div>
    );
  }
}
