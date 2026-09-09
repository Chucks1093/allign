"use client";

import { useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

interface FormSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  error?: string;
  touched?: boolean;
  className?: string;
  prefix?: ReactNode;
}

export function FormSelector({
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  required = false,
  searchable = true,
  disabled = false,
  error,
  touched = false,
  className,
  prefix,
}: FormSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const id = label.toLowerCase().replace(/\s+/g, "-");
  const hasError = error && touched;

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      (o.description && o.description.toLowerCase().includes(search.toLowerCase()))
  );

  function handleSelect(opt: SelectOption) {
    onChange(opt.value);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="text-[11px] font-mono uppercase tracking-widest text-white/40"
      >
        {label}
        {required && <span className="text-orange-400 ml-1">*</span>}
      </label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <div
              id={id}
              role="button"
              aria-expanded={open}
              aria-disabled={disabled}
            />
          }
          className={cn(
            "flex h-[42px] w-full items-center justify-between rounded-sm border bg-[#0c0c0c] text-[13px] transition-colors outline-none overflow-hidden cursor-pointer",
            hasError
              ? "border-red-500/60"
              : "border-[#2a2a2a] hover:border-white/20",
            !value ? "text-white/20" : "text-white",
            disabled && "opacity-50 pointer-events-none"
          )}
        >
          {prefix}
          <span className="flex-1 flex items-center gap-2 px-3 min-w-0">
            {selected?.icon && (
              <Image
                src={selected.icon}
                alt=""
                width={16}
                height={16}
                className="object-contain shrink-0 opacity-80"
              />
            )}
            {selected ? (
              <span className="truncate">{selected.label}</span>
            ) : (
              <span className="text-white/20">{placeholder}</span>
            )}
          </span>
          <ChevronDown
            size={14}
            strokeWidth={1.5}
            className={cn(
              "text-white/40 shrink-0 transition-transform mr-3",
              open && "rotate-180"
            )}
          />
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={4}
          className="min-w-[var(--anchor-width,240px)] w-full p-0 bg-[#111] border border-[#2a2a2a] rounded-sm shadow-xl"
        >
          {searchable && (
            <div className="border-b border-[#2a2a2a] flex items-center gap-2 px-3">
              <Search size={13} className="text-white/30 shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-9 flex-1 bg-transparent text-[13px] text-white placeholder:text-white/30 outline-none"
              />
            </div>
          )}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="py-4 text-center text-[12px] text-white/30">
                No options found.
              </p>
            )}
            {filtered.map((opt, idx) => {
              const isSelected = selected?.value === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2.5 cursor-pointer text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors",
                    idx < filtered.length - 1 && "border-b border-[#1a1a1a]",
                    isSelected && "bg-white/5 text-white"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {opt.icon && (
                      <Image
                        src={opt.icon}
                        alt=""
                        width={18}
                        height={18}
                        className="object-contain shrink-0 opacity-80"
                      />
                    )}
                    <span>{opt.label}</span>
                    {opt.description && (
                      <span className="text-white/30 text-[11px]">
                        {opt.description}
                      </span>
                    )}
                  </div>
                  <Check
                    size={13}
                    strokeWidth={2.5}
                    className={cn(
                      "text-white/60 shrink-0 ml-2",
                      isSelected ? "opacity-100" : "opacity-0"
                    )}
                  />
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {hasError && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
