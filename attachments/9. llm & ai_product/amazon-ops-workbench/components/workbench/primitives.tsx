"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";
export function Choice({
  value,
  onChange,
  options,
  label,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <Select
      value={value || "__none"}
      onValueChange={(v) => onChange(v === "__none" ? "" : v)}
    >
      <SelectTrigger aria-label={label} className={className}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value || "__none"} value={o.value || "__none"}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function Empty({
  title,
  description,
  onImport,
}: {
  title: string;
  description: string;
  onImport: () => void;
}) {
  return (
    <section className="panel capability-empty">
      <div className="empty-illustration">
        <UploadCloud size={30} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <Button onClick={onImport}>导入所需数据</Button>
      <small>不会自动加载演示数据，也不会把缺失指标当作 0。</small>
    </section>
  );
}
export function PanelHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
