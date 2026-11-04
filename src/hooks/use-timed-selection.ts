'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

export function useTimedSelection(count: number, duration = 12000, initialIndex = 0) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [cycle, setCycle] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const sectionRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const elapsedRef = useRef(0);
  const isRunning = isInView && isDocumentVisible;

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), {
      threshold: 0.2,
    });
    observer.observe(element);
    const updateVisibility = () => setIsDocumentVisible(!document.hidden);
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    elapsedRef.current = 0;
    if (progressRef.current) progressRef.current.style.transform = 'scaleX(0)';
  }, [activeIndex, cycle]);

  useEffect(() => {
    if (!isRunning) return;
    let frameId = 0;
    let previousTime: number | undefined;
    function advance(time: number) {
      if (previousTime !== undefined) elapsedRef.current += time - previousTime;
      previousTime = time;
      const progress = Math.min(elapsedRef.current / duration, 1);
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
      if (progress === 1) {
        setActiveIndex((index) => (index + 1) % count);
        return;
      }
      frameId = requestAnimationFrame(advance);
    }
    frameId = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frameId);
  }, [activeIndex, cycle, isRunning, count, duration]);

  function selectIndex(index: number) {
    setActiveIndex(index);
    setCycle((value) => value + 1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      nextIndex = (index + 1) % count;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + count) % count;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = count - 1;
    } else {
      return;
    }
    event.preventDefault();
    selectIndex(nextIndex);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [nextIndex]?.focus();
  }

  return { activeIndex, sectionRef, progressRef, selectIndex, handleKeyDown };
}
