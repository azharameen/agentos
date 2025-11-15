"use client";

import React from "react";
import {
  SidebarHeader,
  SidebarContent,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KnowledgeBase } from "@/components/knowledge-base";
import { Memory } from "@/components/memory";

export function RightSidebar() {
  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-1">
          <h1 className="truncate text-lg font-semibold">Context</h1>
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent className="p-4">
        <Accordion type="multiple" defaultValue={["rag", "knowledge-base", "memory"]}>
          <AccordionItem value="rag">
            <AccordionTrigger>RAG</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <Input type="search" placeholder="Search in RAG sources..." />
                {/* Add RAG content here */}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="knowledge-base">
            <AccordionTrigger>Knowledge Base</AccordionTrigger>
            <AccordionContent>
              <KnowledgeBase />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="memory">
            <AccordionTrigger>Memory</AccordionTrigger>
            <AccordionContent>
              <Memory />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SidebarContent>
    </>
  );
}
