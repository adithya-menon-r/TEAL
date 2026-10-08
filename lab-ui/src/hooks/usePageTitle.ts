import { useEffect } from 'react';

const DEFAULT_TITLE = 'Lab Environment · TEAL';

export function usePageTitle(title: string = DEFAULT_TITLE) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous || DEFAULT_TITLE;
    };
  }, [title]);
}
