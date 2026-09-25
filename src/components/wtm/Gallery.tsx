import * as React from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ImageData {
  id: string;
  src: string;
  alt?: string;
}

interface GalleryContextType {
  selectedImage: ImageData | null;
  setSelectedImage: (image: ImageData | null) => void;
}

const GalleryContext = React.createContext<GalleryContextType | null>(null);

const spring = {
  type: "spring" as const,
  stiffness: 350,
  damping: 35,
  mass: 1,
};

export function Gallery({ children }: { children: React.ReactNode }) {
  const [selectedImage, setSelectedImage] = React.useState<ImageData | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  React.useEffect(() => {
    if (selectedImage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedImage]);

  return (
    <GalleryContext.Provider value={{ selectedImage, setSelectedImage }}>
      {children}
      <GalleryModal />
    </GalleryContext.Provider>
  );
}

export function GalleryGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "columns-1 gap-3 sm:columns-2 md:columns-3 lg:columns-4 [&>*]:mb-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function GalleryImage({
  src,
  alt,
  id,
  className,
}: {
  src: string;
  alt?: string;
  id: string;
  className?: string;
}) {
  const context = React.useContext(GalleryContext);
  if (!context) throw new Error("GalleryImage must be used within a Gallery");

  return (
    <motion.button
      type="button"
      layoutId={`gallery-image-${id}`}
      onClick={() => context.setSelectedImage({ id, src, alt })}
      className={cn(
        "group relative block w-full break-inside-avoid overflow-hidden rounded-xl border border-border/60 bg-surface/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        className,
      )}
      whileHover={{ scale: 1.01 }}
      transition={spring}
    >
      <motion.img
        layoutId={`gallery-image-inner-${id}`}
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        className="h-auto w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </motion.button>
  );
}

function GalleryModal() {
  const context = React.useContext(GalleryContext);
  if (!context) return null;

  const { selectedImage, setSelectedImage } = context;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.y) > 100 || Math.abs(info.velocity.y) > 300) {
      setSelectedImage(null);
    }
  };

  return (
    <AnimatePresence>
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setSelectedImage(null)}
          />

          <motion.div
            className="relative z-10 max-h-full max-w-5xl cursor-grab active:cursor-grabbing"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.3}
            onDragEnd={handleDragEnd}
            onClick={() => setSelectedImage(null)}
          >
            <motion.img
              layoutId={`gallery-image-inner-${selectedImage.id}`}
              src={selectedImage.src}
              alt={selectedImage.alt ?? ""}
              className="max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl"
              transition={spring}
            />
          </motion.div>

          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setSelectedImage(null)}
            aria-label="Close gallery"
            className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80"
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>
      )}
    </AnimatePresence>
  );
}
