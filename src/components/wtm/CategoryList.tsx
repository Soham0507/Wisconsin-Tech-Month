"use client";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface Category {
  id: string | number;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  featured?: boolean;
}

export interface CategoryListProps {
  title: string;
  subtitle?: string;
  categories: Category[];
  headerIcon?: React.ReactNode;
  className?: string;
}

export const CategoryList = ({
  title,
  subtitle,
  categories,
  headerIcon,
  className,
}: CategoryListProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | number | null>(null);

  return (
    <section className={cn("w-full", className)}>
      <div className="mx-auto max-w-5xl px-5">
        {/* Header */}
        <div className="mb-10 text-center">
          {headerIcon && (
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
              {headerIcon}
            </div>
          )}
          <h2 className="font-display text-3xl font-bold md:text-4xl">{title}</h2>
          {subtitle && (
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* List */}
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-background/40">
          {categories.map((category) => {
            const active = hoveredItem === category.id;
            return (
              <li
                key={category.id}
                onMouseEnter={() => setHoveredItem(category.id)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={category.onClick}
                className={cn(
                  "group relative cursor-pointer px-6 py-5 transition-colors",
                  active ? "bg-primary/5" : "hover:bg-primary/5",
                  category.featured && "bg-primary/[0.03]",
                )}
              >
                {/* Corner brackets */}
                {active && (
                  <>
                    <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l-2 border-t-2 border-primary" />
                    <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r-2 border-t-2 border-primary" />
                    <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b-2 border-l-2 border-primary" />
                    <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b-2 border-r-2 border-primary" />
                  </>
                )}

                <div className="flex items-center justify-between gap-6">
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "font-display text-lg font-semibold transition-colors",
                        active ? "text-primary" : "text-foreground",
                      )}
                    >
                      {category.title}
                    </div>
                    {category.subtitle && (
                      <div className="mt-1 text-sm text-muted-foreground">
                        {category.subtitle}
                      </div>
                    )}
                  </div>

                  {category.icon && (
                    <div
                      className={cn(
                        "flex-shrink-0 text-primary transition-all duration-200",
                        active
                          ? "translate-x-0 opacity-100"
                          : "translate-x-2 opacity-0",
                      )}
                    >
                      {category.icon}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default CategoryList;
