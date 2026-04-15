"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTemplates } from "@/lib/hooks/use-templates";
import { TemplateEditor } from "@/components/schedule/template-editor";

export default function TemplateEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { templates, renameTemplate, loadBlocks, addBlock, updateBlock, deleteBlock } = useTemplates();
  const template = templates.find((t) => t.id === id);
  const [name, setName] = useState(template?.name ?? "");

  useEffect(() => {
    if (template) setName(template.name);
  }, [template?.name]);

  return (
    <div className="p-4 lg:p-8 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Link
          href="/schedule/templates"
          aria-label="목록으로"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1f242e]"
        >
          <ArrowLeft size={18} />
        </Link>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name !== template?.name) renameTemplate(id, name.trim());
          }}
          className="flex-1 text-xl font-bold bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none"
        />
      </div>
      <TemplateEditor
        templateId={id}
        loadBlocks={loadBlocks}
        onAdd={addBlock}
        onUpdate={updateBlock}
        onDelete={deleteBlock}
      />
    </div>
  );
}
