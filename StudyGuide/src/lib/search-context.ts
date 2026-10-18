import { createContext, useContext } from "react";

/** Lets any page ask the shell to open the ⌘K palette. */
export const SearchContext = createContext<{ openSearch: () => void }>({
  openSearch: () => {},
});

export function useOpenSearch(): () => void {
  return useContext(SearchContext).openSearch;
}
