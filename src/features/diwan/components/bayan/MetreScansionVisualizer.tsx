import React from "react";
import type { PoeticMeterAnalysis } from "../../types/bayan";

interface MetreScansionVisualizerProps {
  prosody: PoeticMeterAnalysis;
}

export const MetreScansionVisualizer: React.FC<MetreScansionVisualizerProps> = ({ prosody }) => {
  const renderHemistich = (title: string, data: typeof prosody.firstHemistich) => {
    return (
      <div className="space-y-4 p-4 rounded-xl border border-border/40 bg-surface/20">
        <div className="flex justify-between items-center border-b border-border/40 pb-2 mb-3">
          <span className="text-xs font-semibold text-muted-foreground">{title}</span>
          <span className="text-[10px] font-mono bg-live/10 text-live px-2 py-0.5 rounded-full">
            {data.scansionText.split(" ").length} تفعيلات
          </span>
        </div>

        {/* Original Line */}
        <div className="text-base text-foreground font-amiri font-medium tracking-wide">
          {data.text}
        </div>

        {/* Arood Translit Writing */}
        <div className="text-sm text-live/90 font-amiri bg-surface/50 px-3 py-1.5 rounded-md border border-border/30">
          <span className="text-[10px] text-muted-foreground block mb-0.5">الكتابة العروضية:</span>
          {data.scansionText}
        </div>

        {/* Syllables & Symbols Grid */}
        <div className="flex flex-wrap gap-2 pt-2">
          {data.tafilas.map((tafila, idx) => (
            <div key={idx} className="flex-1 min-w-[120px] rounded-lg border border-border bg-surface p-2.5 flex flex-col items-center">
              {/* Tafila Name */}
              <span className="text-sm font-bold text-foreground font-amiri mb-1">
                {tafila.tafilaName}
              </span>

              {/* Symbol Blocks */}
              <div className="flex gap-1.5 justify-center my-2">
                {tafila.symbolPattern.split("").map((sym, symIdx) => (
                  <div
                    key={symIdx}
                    className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-semibold transition-all ${
                      sym === "/"
                        ? "bg-live text-white shadow-sm"
                        : "bg-muted-foreground/15 text-muted-foreground border border-border"
                    }`}
                  >
                    {sym}
                  </div>
                ))}
              </div>

              {/* Syllable details list */}
              <div className="text-[10px] font-mono text-muted-foreground flex flex-wrap gap-1 justify-center max-w-full">
                {tafila.syllables.map((s, sIdx) => (
                  <span key={sIdx} className="px-1 py-0.5 bg-surface/50 rounded" title={s.isMoving ? "متحرك" : "ساكن"}>
                    {s.text}
                  </span>
                ))}
              </div>

              {/* Deviations */}
              {tafila.deviation && (
                <span className="mt-1.5 text-[9px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded-full font-mono">
                  {tafila.deviation}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Meter Header Metadata card */}
      <div className="p-4 rounded-xl border border-live/30 bg-live/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-mono text-live uppercase tracking-wider block font-semibold">بحر البيت الشعري</span>
          <h3 className="text-xl font-bold font-amiri text-foreground mt-0.5">
            {prosody.meterName}
          </h3>
          <p className="text-xs text-muted-foreground font-amiri mt-1 max-w-xl">
            مفتاح البحر: {prosody.keyPoem}
          </p>
        </div>

        <div className="flex flex-row md:flex-col gap-3 md:gap-1.5 items-end">
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block">الروي</span>
            <span className="text-base font-bold text-foreground font-amiri">حرف ({prosody.rhymeLetter})</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block">القافية</span>
            <span className="text-xs font-medium text-live font-amiri">{prosody.rhymeType}</span>
          </div>
        </div>
      </div>

      {/* Split views of Hemistiches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderHemistich("الصدر (الشطر الأول)", prosody.firstHemistich)}
        {renderHemistich("العجز (الشطر الثاني)", prosody.secondHemistich)}
      </div>
    </div>
  );
};
