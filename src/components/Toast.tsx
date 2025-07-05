import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/utils/tailwind";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  persistent?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast: Toast = {
        id,
        duration: 5000,
        persistent: false,
        ...toast,
      };

      setToasts((prev) => {
        const updated = [newToast, ...prev];
        return updated.slice(0, maxToasts);
      });

      // Auto-remove toast after duration
      if (!newToast.persistent && newToast.duration) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }
    },
    [maxToasts],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 flex max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
}

function ToastItem({ toast }: ToastItemProps) {
  const { removeToast } = useToast();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => removeToast(toast.id), 300);
  };

  const getToastStyles = () => {
    const baseStyles =
      "border-l-4 bg-background shadow-lg rounded-lg p-4 flex items-start gap-3";

    switch (toast.type) {
      case "success":
        return cn(baseStyles, "border-green-500");
      case "error":
        return cn(baseStyles, "border-red-500");
      case "warning":
        return cn(baseStyles, "border-yellow-500");
      case "info":
        return cn(baseStyles, "border-blue-500");
      default:
        return cn(baseStyles, "border-gray-500");
    }
  };

  const getIcon = () => {
    const iconProps = { className: "h-5 w-5 flex-shrink-0" };

    switch (toast.type) {
      case "success":
        return (
          <CheckCircle {...iconProps} className="h-5 w-5 text-green-500" />
        );
      case "error":
        return <AlertCircle {...iconProps} className="h-5 w-5 text-red-500" />;
      case "warning":
        return (
          <AlertTriangle {...iconProps} className="h-5 w-5 text-yellow-500" />
        );
      case "info":
        return <Info {...iconProps} className="h-5 w-5 text-blue-500" />;
      default:
        return <Info {...iconProps} className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div
      className={cn(
        "transform transition-all duration-300 ease-in-out",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
      )}
    >
      <div className={getToastStyles()}>
        {getIcon()}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium break-words">{toast.message}</p>
        </div>
        <button
          onClick={handleClose}
          className="ml-2 flex-shrink-0 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Convenience hooks for different toast types
export function useToastHelpers() {
  const { addToast } = useToast();

  const showSuccess = useCallback(
    (message: string, options?: Partial<Toast>) => {
      addToast({ message, type: "success", ...options });
    },
    [addToast],
  );

  const showError = useCallback(
    (message: string, options?: Partial<Toast>) => {
      addToast({ message, type: "error", ...options });
    },
    [addToast],
  );

  const showWarning = useCallback(
    (message: string, options?: Partial<Toast>) => {
      addToast({ message, type: "warning", ...options });
    },
    [addToast],
  );

  const showInfo = useCallback(
    (message: string, options?: Partial<Toast>) => {
      addToast({ message, type: "info", ...options });
    },
    [addToast],
  );

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}
