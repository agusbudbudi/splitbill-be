import React, { useState, useEffect } from "react";
import { Plus, Trash2, ShieldAlert, ShieldCheck } from "lucide-react";
import { apiFetch } from "../lib/api";
import { Button, Input, Spinner } from "./ui";

const OPERATOR_OPTIONS = [
  { id: "eq", label: "Sama Dengan (==)" },
  { id: "ne", label: "Tidak Sama (!=)" },
  { id: "gt", label: "Lebih Besar (>)" },
  { id: "gte", label: "Lebih Besar / Sama (>=)" },
  { id: "lt", label: "Lebih Kecil (<)" },
  { id: "lte", label: "Lebih Kecil / Sama (<=)" },
  { id: "contains", label: "Mengandung kata" },
];

export default function DynamicSegmentBuilder({ value, onChange }) {
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize value if empty
  const segment = value || { included: [], excluded: [] };

  useEffect(() => {
    const fetchVars = async () => {
      try {
        const res = await apiFetch("/api/segment-variables");
        const json = await res.json();
        if (json.success) setVariables(json.data);
      } catch (e) {
        console.error("Failed to load variables", e);
      } finally {
        setLoading(false);
      }
    };
    fetchVars();
  }, []);

  const handleChange = (type, newGroups) => {
    onChange({ ...segment, [type]: newGroups });
  };

  const addGroup = (type) => {
    const newGroups = [...(segment[type] || [])];
    newGroups.push({
      operator: "AND",
      rules: [{ field: variables[0]?.field || "", operator: "eq", value: "" }],
    });
    handleChange(type, newGroups);
  };

  const removeGroup = (type, groupIndex) => {
    const newGroups = [...segment[type]];
    newGroups.splice(groupIndex, 1);
    handleChange(type, newGroups);
  };

  const addRule = (type, groupIndex) => {
    const newGroups = [...segment[type]];
    newGroups[groupIndex].rules.push({
      field: variables[0]?.field || "",
      operator: "eq",
      value: "",
    });
    handleChange(type, newGroups);
  };

  const removeRule = (type, groupIndex, ruleIndex) => {
    const newGroups = [...segment[type]];
    newGroups[groupIndex].rules.splice(ruleIndex, 1);
    
    // Auto-remove group if empty
    if (newGroups[groupIndex].rules.length === 0) {
      newGroups.splice(groupIndex, 1);
    }
    
    handleChange(type, newGroups);
  };

  const updateRule = (type, groupIndex, ruleIndex, field, val) => {
    const newGroups = [...segment[type]];
    let parsedValue = val;
    
    // Automatically cast value if variable type is number
    if (field === 'value') {
      const currentField = newGroups[groupIndex].rules[ruleIndex].field;
      const varDef = variables.find(v => v.field === currentField);
      if (varDef && varDef.type === "number" && val !== "") {
        parsedValue = Number(val);
      }
    }
    
    newGroups[groupIndex].rules[ruleIndex][field] = parsedValue;
    handleChange(type, newGroups);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground bg-muted/30 rounded-md">
        <Spinner size="sm" /> Memuat variabel...
      </div>
    );
  }

  const renderGroup = (type, group, groupIndex) => (
    <div key={groupIndex} className="bg-white border border-border rounded-md p-4 mb-3 shadow-sm relative">
      {groupIndex > 0 && (
        <div className="absolute -top-[21px] left-4 bg-muted text-xs font-bold px-2 py-0.5 rounded border border-border uppercase tracking-wide">
          OR
        </div>
      )}
      
      <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
        <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
          Grup Kondisi {groupIndex + 1}
        </span>
        <button
          type="button"
          onClick={() => removeGroup(type, groupIndex)}
          className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
          title="Hapus Grup"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="space-y-3">
        {group.rules.map((rule, ruleIndex) => {
          const varDef = variables.find(v => v.field === rule.field);
          return (
            <div key={ruleIndex} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              {ruleIndex > 0 && (
                <div className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded hidden sm:block uppercase">
                  AND
                </div>
              )}
              
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                <select
                  value={rule.field}
                  onChange={(e) => updateRule(type, groupIndex, ruleIndex, "field", e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-sm text-sm focus:outline-none focus:border-primary"
                >
                  {variables.map((v) => (
                    <option key={v.field} value={v.field}>
                      {v.label} {v.entity === 'Aggregate' ? '(Agregasi)' : ''}
                    </option>
                  ))}
                </select>

                <select
                  value={rule.operator}
                  onChange={(e) => updateRule(type, groupIndex, ruleIndex, "operator", e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-sm text-sm focus:outline-none focus:border-primary"
                >
                  {OPERATOR_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>

                {varDef?.type === "enum" ? (
                  <select
                    value={rule.value}
                    onChange={(e) => updateRule(type, groupIndex, ruleIndex, "value", e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-sm text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Pilih value...</option>
                    {varDef.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : varDef?.type === "boolean" ? (
                  <select
                    value={rule.value === true ? "true" : rule.value === false ? "false" : ""}
                    onChange={(e) => updateRule(type, groupIndex, ruleIndex, "value", e.target.value === "true")}
                    className="w-full px-3 py-2 bg-input border border-border rounded-sm text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Pilih...</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <input
                    type={varDef?.type === "number" ? "number" : "text"}
                    value={rule.value}
                    onChange={(e) => updateRule(type, groupIndex, ruleIndex, "value", e.target.value)}
                    placeholder="Value..."
                    className="w-full px-3 py-2 bg-input border border-border rounded-sm text-sm focus:outline-none focus:border-primary"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => removeRule(type, groupIndex, ruleIndex)}
                className="text-muted-foreground hover:text-red-500 p-2 sm:p-1.5 shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-dashed border-border">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => addRule(type, groupIndex)}
          className="h-7 text-xs"
        >
          Tambah Aturan AND
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 bg-muted/10 p-5 rounded-lg border border-border">
      {/* INCLUDED SEGMENTS */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="text-emerald-500" size={18} />
          <h3 className="font-bold text-sm text-foreground">Included Segments</h3>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            User WAJIB memenuhi kriteria ini
          </span>
        </div>
        
        {(!segment.included || segment.included.length === 0) ? (
          <div className="text-sm text-muted-foreground italic mb-3">Semua user akan ditargetkan jika kosong.</div>
        ) : (
          segment.included.map((group, i) => renderGroup("included", group, i))
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => addGroup("included")}
          className="text-xs bg-white"
        >
          Tambah Grup OR (Included)
        </Button>
      </div>

      <hr className="border-border" />

      {/* EXCLUDED SEGMENTS */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="text-red-500" size={18} />
          <h3 className="font-bold text-sm text-foreground">Excluded Segments</h3>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            User akan diabaikan jika memenuhi ini
          </span>
        </div>

        {(!segment.excluded || segment.excluded.length === 0) ? (
          <div className="text-sm text-muted-foreground italic mb-3">Tidak ada user yang dikecualikan.</div>
        ) : (
          segment.excluded.map((group, i) => renderGroup("excluded", group, i))
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => addGroup("excluded")}
          className="text-xs bg-white"
        >
          Tambah Grup OR (Excluded)
        </Button>
      </div>
    </div>
  );
}
