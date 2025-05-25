
import { useState, useEffect, RefObject } from 'react';

interface Dimensions {
  width: number;
  height: number;
}

function useResizeObserver<T extends HTMLElement>(ref: RefObject<T>): Dimensions {
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(element);

    // Initial dimensions
    const { width, height } = element.getBoundingClientRect();
    setDimensions({ width, height });


    return () => {
      observer.unobserve(element);
    };
  }, [ref]);

  return dimensions;
}

export default useResizeObserver;
    