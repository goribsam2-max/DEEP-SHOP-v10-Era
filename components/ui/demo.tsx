"use client";

import { ArrowRight, Plus, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ButtonIconsDemo() {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-background border rounded-lg m-4 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Button System Demo</h2>
      <div className="flex flex-wrap items-center gap-3">
        <Button><Plus className="mr-1.5 h-4 w-4" />Add item</Button>
        <Button variant="secondary">Continue<ArrowRight className="ml-1.5 h-4 w-4" /></Button>
        <Button variant="outline"><Search className="mr-1.5 h-4 w-4" />Search</Button>
        <Button size="icon" variant="ghost"><Settings /></Button>
        <Button size="sm" variant="secondary"><Plus /></Button>
        <Button size="lg"><ArrowRight /></Button>
      </div>
      
      <h3 className="text-lg font-semibold mt-8 mb-4">Loading States</h3>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled>Save Changes</Button>
        <Button disabled variant="secondary" size="lg">Processing</Button>
        <Button disabled size="icon" variant="outline"><Settings /></Button>
      </div>
    </div>
  );
}

export default ButtonIconsDemo;
