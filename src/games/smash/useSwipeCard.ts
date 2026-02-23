import React from "react";

const MOBILE_VIEW_QUERY = "(max-width: 980px)";
const SHUFFLE_SWIPE_MIN_DISTANCE = 120;
const SHUFFLE_SWIPE_MAX_HORIZONTAL_DRIFT = 72;
const SHUFFLE_SWIPE_MIN_VELOCITY = 0.45;

type SwipeDirection = "smash" | "pass";

type UseSwipeCardParams = {
  disabled?: boolean;
  isShuffling?: boolean;
  onSwipe: (direction: SwipeDirection) => void;
  onShuffle: () => void;
  shouldIgnoreEvent?: (target: EventTarget | null) => boolean;
};

type SwipeCardApi = {
  isDragging: boolean;
  status: "" | SwipeDirection;
  transform: string;
  handlers: {
    onPointerDown: React.PointerEventHandler<HTMLElement>;
    onPointerMove: React.PointerEventHandler<HTMLElement>;
    onPointerUp: React.PointerEventHandler<HTMLElement>;
    onPointerCancel: React.PointerEventHandler<HTMLElement>;
  };
};

const isMobileView = () =>
  typeof window !== "undefined" && window.matchMedia(MOBILE_VIEW_QUERY).matches;

export const useSwipeCard = ({
  disabled,
  isShuffling,
  onSwipe,
  onShuffle,
  shouldIgnoreEvent
}: UseSwipeCardParams): SwipeCardApi => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [status, setStatus] = React.useState<"" | SwipeDirection>("");
  const [transform, setTransform] = React.useState("");

  const dragCandidateRef = React.useRef(false);
  const dragStartXRef = React.useRef(0);
  const dragStartYRef = React.useRef(0);
  const dragStartTimeRef = React.useRef(0);
  const pointerIdRef = React.useRef<number | null>(null);

  const reset = React.useCallback(() => {
    setIsDragging(false);
    setStatus("");
    setTransform("");
    dragCandidateRef.current = false;
    pointerIdRef.current = null;
  }, []);

  const onPointerDown: React.PointerEventHandler<HTMLElement> = (event) => {
    if (disabled) return;
    if (shouldIgnoreEvent?.(event.target)) return;
    dragCandidateRef.current = true;
    setIsDragging(false);
    setStatus("");
    dragStartXRef.current = event.clientX;
    dragStartYRef.current = event.clientY;
    dragStartTimeRef.current = performance.now();
    pointerIdRef.current = event.pointerId;
    setTransform("");
  };

  const onPointerMove: React.PointerEventHandler<HTMLElement> = (event) => {
    if (disabled) return;
    if (!dragCandidateRef.current) return;
    const deltaX = event.clientX - dragStartXRef.current;
    const deltaY = event.clientY - dragStartYRef.current;

    if (!isDragging) {
      const horizontal = Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY);
      const vertical = Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX);
      if (!horizontal && vertical) {
        dragCandidateRef.current = false;
        reset();
        return;
      }
      if (!horizontal) return;
      setIsDragging(true);
      try {
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    }

    const rotation = deltaX / 15;
    setTransform(`translateX(${deltaX}px) rotate(${rotation}deg)`);

    if (deltaX > 80) setStatus("smash");
    else if (deltaX < -80) setStatus("pass");
    else setStatus("");
  };

  const onPointerUp: React.PointerEventHandler<HTMLElement> = (event) => {
    if (disabled) return;
    if (!dragCandidateRef.current) return;
    const deltaX = event.clientX - dragStartXRef.current;
    const deltaY = event.clientY - dragStartYRef.current;
    const elapsed = performance.now() - dragStartTimeRef.current;
    const velocity = deltaX / Math.max(elapsed, 1);
    const upwardVelocity = -deltaY / Math.max(elapsed, 1);

    const shouldSwipeRight = deltaX > 120 || velocity > 0.6;
    const shouldSwipeLeft = deltaX < -120 || velocity < -0.6;
    const shouldShuffleUp =
      isMobileView() &&
      !isShuffling &&
      Math.abs(deltaX) < SHUFFLE_SWIPE_MAX_HORIZONTAL_DRIFT &&
      deltaY < -SHUFFLE_SWIPE_MIN_DISTANCE &&
      upwardVelocity > SHUFFLE_SWIPE_MIN_VELOCITY;

    dragCandidateRef.current = false;
    setTransform("");
    setIsDragging(false);
    setStatus("");

    const pointerId = pointerIdRef.current;
    if (pointerId !== null) {
      try {
        if ((event.currentTarget as HTMLElement).hasPointerCapture(pointerId)) {
          (event.currentTarget as HTMLElement).releasePointerCapture(pointerId);
        }
      } catch {
        // ignore
      }
    }
    pointerIdRef.current = null;

    if (shouldSwipeRight) onSwipe("smash");
    else if (shouldSwipeLeft) onSwipe("pass");
    else if (shouldShuffleUp) onShuffle();
  };

  const onPointerCancel: React.PointerEventHandler<HTMLElement> = () => {
    if (!dragCandidateRef.current) return;
    dragCandidateRef.current = false;
    reset();
  };

  React.useEffect(() => reset, [reset]);

  return {
    isDragging,
    status,
    transform,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
  };
};
