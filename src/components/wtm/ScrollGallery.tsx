import * as React from "react";
import {
  motion,
  useScroll,
  useTransform,
  type HTMLMotionProps,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface ContainerScrollContextValue {
  scrollYProgress: MotionValue<number>;
}

const ContainerScrollContext = React.createContext<
  ContainerScrollContextValue | undefined
>(undefined);

function useContainerScrollContext() {
  const ctx = React.useContext(ContainerScrollContext);
  if (!ctx) throw new Error("Must be used within <ContainerScroll>");
  return ctx;
}

export function ContainerScroll({
  children,
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start end", "end start"],
  });

  return (
    <ContainerScrollContext.Provider value={{ scrollYProgress }}>
      <div
        ref={scrollRef}
        className={cn("relative min-h-[120vh] w-full", className)}
        style={{ perspective: "1000px", ...style }}
        {...props}
      >
        {children}
      </div>
    </ContainerScrollContext.Provider>
  );
}

export function ContainerSticky({
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "sticky left-0 top-0 h-screen w-full overflow-hidden",
        className,
      )}
      style={{ perspective: "1000px", ...style }}
      {...props}
    />
  );
}

export function GalleryContainer({
  children,
  className,
  style,
  ...props
}: HTMLMotionProps<"div">) {
  const { scrollYProgress } = useContainerScrollContext();
  const rotateX = useTransform(scrollYProgress, [0.15, 0.45], [45, 0]);
  const scale = useTransform(scrollYProgress, [0.45, 0.7], [1.08, 1]);

  return (
    <motion.div
      className={cn(
        "relative grid size-full grid-cols-3 gap-3 md:gap-4",
        className,
      )}
      style={{
        rotateX,
        scale,
        transformStyle: "preserve-3d",
        transformOrigin: "50% 0%",
        willChange: "transform",
        ...style,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function GalleryCol({
  className,
  style,
  yRange = ["0%", "-10%"],
  ...props
}: HTMLMotionProps<"div"> & { yRange?: [string, string] }) {
  const { scrollYProgress } = useContainerScrollContext();
  const y = useTransform(scrollYProgress, [0.45, 1], yRange);

  return (
    <motion.div
      className={cn("relative flex w-full flex-col gap-3 md:gap-4", className)}
      style={{ y, willChange: "transform", ...style }}
      {...props}
    />
  );
}
