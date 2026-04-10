import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-page">
          <div className="error-boundary-icon">{"\u26A0\uFE0F"}</div>
          <h1 className="error-boundary-title">{"\uBB38\uC81C\uAC00"} {"\uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4"}</h1>
          <p className="error-boundary-desc">
            {"\uC608\uAE30\uCE58"} {"\uC54A\uC740"} {"\uC624\uB958\uAC00"} {"\uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4"}.
            {"\uD398\uC774\uC9C0\uB97C"} {"\uC0C8\uB85C\uACE0\uCE68\uD558\uAC70\uB098"} {"\uD648\uC73C\uB85C"} {"\uB3CC\uC544\uAC00"} {"\uC8FC\uC138\uC694"}.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              {"\uC0C8\uB85C\uACE0\uCE68"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = "/";
              }}
            >
              {"\uD648\uC73C\uB85C"}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
