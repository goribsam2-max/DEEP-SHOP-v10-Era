import React, { createContext, useContext, useMemo } from 'react';

export interface PageLoadingContextValue {
  isPageLoading: boolean;
  setIsPageLoading: (val: boolean) => void;
}

export const DEFAULT_PAGE_LOADING_CONTEXT: PageLoadingContextValue = {
  isPageLoading: false,
  setIsPageLoading: () => {},
};

export const PageLoadingContext = createContext<PageLoadingContextValue>(
  DEFAULT_PAGE_LOADING_CONTEXT
);

export const PageLoadingProvider: React.FC<{
  value?: PageLoadingContextValue | null;
  children: React.ReactNode;
}> = ({ value, children }) => {
  const safeValue = useMemo<PageLoadingContextValue>(() => {
    if (!value || typeof value !== 'object') {
      return DEFAULT_PAGE_LOADING_CONTEXT;
    }
    return {
      isPageLoading: Boolean(value.isPageLoading),
      setIsPageLoading:
        typeof value.setIsPageLoading === 'function'
          ? value.setIsPageLoading
          : DEFAULT_PAGE_LOADING_CONTEXT.setIsPageLoading,
    };
  }, [value?.isPageLoading, value?.setIsPageLoading]);

  return (
    <PageLoadingContext.Provider value={safeValue}>
      {children}
    </PageLoadingContext.Provider>
  );
};

export const usePageLoading = (): PageLoadingContextValue => {
  const ctx = useContext(PageLoadingContext);
  if (!ctx || typeof ctx !== 'object') {
    return DEFAULT_PAGE_LOADING_CONTEXT;
  }
  return {
    isPageLoading: Boolean(ctx.isPageLoading),
    setIsPageLoading:
      typeof ctx.setIsPageLoading === 'function'
        ? ctx.setIsPageLoading
        : DEFAULT_PAGE_LOADING_CONTEXT.setIsPageLoading,
  };
};
