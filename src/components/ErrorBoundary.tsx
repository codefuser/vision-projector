import { Component, type ReactNode } from "react";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    logger.error(error.message, { stack: error.stack, componentStack: info.componentStack });
  }
  reset = () => this.setState({ error: null });
  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center">
            <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
            <p className="mt-2 text-sm text-muted-foreground">{this.state.error.message}</p>
            <button
              onClick={this.reset}
              className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
