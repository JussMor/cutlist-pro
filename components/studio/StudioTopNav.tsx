"use client";

import {
  Box,
  Boxes,
  ChevronLeft,
  DraftingCompass,
  DoorClosed,
  DoorOpen,
  MoreVertical,
  Palette,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  useStudioStore,
  type ColorMode,
  type RenderMode,
} from "@/store/studioStore";

import { FurnitureModeSelector } from "./FurnitureModeSelector";
import { StudioTabs } from "./StudioTabs";

const MODES: { id: RenderMode; icon: typeof Box; label: string }[] = [
  { id: "closed", icon: DoorClosed, label: "Closed" },
  { id: "open", icon: DoorOpen, label: "Open" },
  { id: "expanded", icon: Boxes, label: "Expanded" },
];

const COLOR_MODES: { id: ColorMode; icon: typeof Box; label: string }[] = [
  { id: "uncolored", icon: DraftingCompass, label: "Uncolored" },
  { id: "colored", icon: Palette, label: "Colored" },
];

function ViewToolbar({
  activeTab,
  renderMode,
  setRenderMode,
  colorMode,
  setColorMode,
}: {
  activeTab: string;
  renderMode: RenderMode;
  setRenderMode: (m: RenderMode) => void;
  colorMode: ColorMode;
  setColorMode: (m: ColorMode) => void;
}) {
  if (activeTab !== "design") return null;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5 rounded-full bg-[#11151d] p-0.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            title={m.label}
            onClick={() => setRenderMode(m.id)}
            className={cn(
              "flex size-7 items-center justify-center rounded-full transition",
              renderMode === m.id
                ? "bg-[#e8eaee] text-[#0b0e14]"
                : "text-[#9aa4b6] hover:text-[#d7dde9]",
            )}
          >
            <m.icon className="size-4" />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-0.5 rounded-full bg-[#11151d] p-0.5">
        {COLOR_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            title={m.label}
            onClick={() => setColorMode(m.id)}
            className={cn(
              "flex size-7 items-center justify-center rounded-full transition",
              colorMode === m.id
                ? "bg-[#e8eaee] text-[#0b0e14]"
                : "text-[#9aa4b6] hover:text-[#d7dde9]",
            )}
          >
            <m.icon className="size-4" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function StudioTopNav() {
  const router = useRouter();
  const title = useStudioStore((s) => s.doc.title);
  const setTitle = useStudioStore((s) => s.setTitle);
  const activeTab = useStudioStore((s) => s.activeTab);
  const renderMode = useStudioStore((s) => s.renderMode);
  const setRenderMode = useStudioStore((s) => s.setRenderMode);
  const colorMode = useStudioStore((s) => s.colorMode);
  const setColorMode = useStudioStore((s) => s.setColorMode);
  const save = useStudioStore((s) => s.save);
  const publish = useStudioStore((s) => s.publish);
  const newDocument = useStudioStore((s) => s.newDocument);
  const saving = useStudioStore((s) => s.saving);

  const [status, setStatus] = useState<string | null>(null);
  const lastSavedTitleRef = useRef(title);
  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 2500);
  };
  const handleSave = async () => {
    try {
      await save();
      flash("Saved");
    } catch {
      flash("Save failed");
    }
  };
  const handlePublish = async () => {
    try {
      await publish();
      flash("Published");
    } catch {
      flash("Publish failed");
    }
  };
  const handleNewDocument = () => {
    newDocument();
    router.push("/studio");
    flash("New project");
  };

  useEffect(() => {
    if (title === lastSavedTitleRef.current) return;
    const timeout = setTimeout(() => {
      save()
        .then(() => {
          lastSavedTitleRef.current = title;
          flash("Saved");
        })
        .catch(() => flash("Save failed"));
    }, 700);
    return () => clearTimeout(timeout);
  }, [save, title]);

  const moreMenu = (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Menu">
          <MoreVertical className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        <Link
          href="/studio/projects"
          className="block w-full rounded-md px-3 py-2 text-left text-xs text-[#d7dde9] hover:bg-[#11151d]"
        >
          Projects
        </Link>
        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-md px-3 py-2 text-left text-xs text-[#d7dde9] hover:bg-[#11151d]"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => void handlePublish()}
          className="w-full rounded-md px-3 py-2 text-left text-xs text-[#d7dde9] hover:bg-[#11151d]"
        >
          Publish
        </button>
        <button
          type="button"
          onClick={handleNewDocument}
          className="w-full rounded-md px-3 py-2 text-left text-xs text-[#d7dde9] hover:bg-[#11151d]"
        >
          New project
        </button>
      </PopoverContent>
    </Popover>
  );

  return (
    <header className="border-b border-[#1c2330]">
      {/* ── Mobile layout (< md): two rows ── */}
      <div className="md:hidden">
        {/* Row 1: back · title · menu | save */}
        <div className="flex items-center gap-2 px-3 py-2">
          <Link
            href="/"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#9aa4b6] hover:bg-[#11151d] hover:text-[#d7dde9]"
            title="Volver"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => void handleSave()}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.currentTarget.blur();
            }}
            aria-label="Document title"
            className="min-w-0 flex-1 truncate bg-transparent text-sm font-medium text-[#d7dde9] outline-none placeholder:text-[#7d879a]"
          />
          {status && (
            <span className="shrink-0 text-xs text-[#84c7a6]">{status}</span>
          )}
          {moreMenu}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving}
            className="shrink-0 text-xs"
          >
            Save
          </Button>
        </div>
        {/* Row 2: tabs | view toolbar */}
        <div className="flex items-center justify-between gap-2 border-t border-[#1c2330] px-3 py-1.5">
          <StudioTabs />
          <ViewToolbar
            activeTab={activeTab}
            renderMode={renderMode}
            setRenderMode={setRenderMode}
            colorMode={colorMode}
            setColorMode={setColorMode}
          />
        </div>
        {/* Row 3: furniture mode (design only) */}
        {activeTab === "design" && (
          <div className="flex justify-center border-t border-[#1c2330] px-3 py-1.5">
            <FurnitureModeSelector />
          </div>
        )}
      </div>

      {/* ── Desktop layout (≥ md): single row + furniture sub-row ── */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between gap-4 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/"
              className="flex size-7 items-center justify-center rounded-full text-[#9aa4b6] hover:bg-[#11151d] hover:text-[#d7dde9]"
              title="Volver"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => void handleSave()}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.currentTarget.blur();
              }}
              aria-label="Document title"
              className="w-44 truncate bg-transparent text-sm font-medium text-[#d7dde9] outline-none placeholder:text-[#7d879a]"
            />
            {moreMenu}
          </div>

          <StudioTabs />

          <div className="flex items-center gap-2">
            <ViewToolbar
              activeTab={activeTab}
              renderMode={renderMode}
              setRenderMode={setRenderMode}
              colorMode={colorMode}
              setColorMode={setColorMode}
            />
            {status && (
              <span className="text-xs text-[#84c7a6]">{status}</span>
            )}
            <Button
              variant="outline"
              onClick={() => void handleSave()}
              disabled={saving}
              className="gap-1.5"
            >
              Save
            </Button>
            <Button
              onClick={() => void handlePublish()}
              disabled={saving}
              className="gap-1.5 bg-[#e8eaee] text-[#0b0e14] hover:bg-white"
            >
              <Upload className="size-4" />
              Publish
            </Button>
          </div>
        </div>
        {/* Furniture mode sub-row (design only) */}
        {activeTab === "design" && (
          <div className="flex justify-center border-t border-[#1c2330] px-4 py-1.5">
            <FurnitureModeSelector />
          </div>
        )}
      </div>
    </header>
  );
}
