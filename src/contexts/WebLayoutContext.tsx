import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface WebLayoutContextValue {
  isTodoBoardWide: boolean;
  setTodoBoardWide: (enabled: boolean) => void;
  isSettlementCalendarWide: boolean;
  setSettlementCalendarWide: (enabled: boolean) => void;
}

const WebLayoutContext = createContext<WebLayoutContextValue | null>(null);

export function WebLayoutProvider({ children }: { children: ReactNode }) {
  const [isTodoBoardWide, setIsTodoBoardWide] = useState(false);
  const [isSettlementCalendarWide, setIsSettlementCalendarWide] = useState(false);

  const setTodoBoardWide = useCallback((enabled: boolean) => {
    setIsTodoBoardWide(enabled);
  }, []);

  const setSettlementCalendarWide = useCallback((enabled: boolean) => {
    setIsSettlementCalendarWide(enabled);
  }, []);

  const value = useMemo(
    () => ({
      isTodoBoardWide,
      setTodoBoardWide,
      isSettlementCalendarWide,
      setSettlementCalendarWide,
    }),
    [isTodoBoardWide, setTodoBoardWide, isSettlementCalendarWide, setSettlementCalendarWide]
  );

  return <WebLayoutContext.Provider value={value}>{children}</WebLayoutContext.Provider>;
}

export function useWebLayout() {
  const context = useContext(WebLayoutContext);
  if (!context) {
    throw new Error("useWebLayout must be used within WebLayoutProvider");
  }
  return context;
}
