"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { APP_CATALOG } from "@/lib/constants/app-catalog";
import type { AppId } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
  exit: { opacity: 0 },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export function DeskCenter() {
  const [open, setOpen] = useState(false);
  const addApp = useWorkspaceStore((s) => s.addApp);

  const handleSelect = (id: AppId) => {
    addApp(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-border/80 bg-background/60 backdrop-blur-md hover:bg-accent/80"
        >
          <LayoutGrid className="size-4" />
          Desk
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[360px] border-border/80 bg-card/70 p-0 shadow-xl backdrop-blur-xl"
      >
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="rounded-lg"
          >
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader className="pb-2 pt-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Add an app to your workspace
                </p>
              </CardHeader>
              <CardContent className="pb-4">
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-3 gap-2"
                >
                  {APP_CATALOG.map((app) => (
                    <motion.button
                      key={app.id}
                      type="button"
                      variants={item}
                      onClick={() => handleSelect(app.id)}
                      className="flex flex-col items-center justify-center rounded-lg border border-border/60 bg-background/50 px-3 py-4 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-accent/60"
                    >
                      {app.name}
                    </motion.button>
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
