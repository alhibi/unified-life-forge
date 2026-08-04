import React from "react";
import type { SyntacticBranch, SyntacticToken } from "../../types/bayan";

interface AstNodeProps {
  branch: SyntacticBranch;
  tokens: Record<string, SyntacticToken>;
  depth: number;
}

const AstNode: React.FC<AstNodeProps> = ({ branch, tokens, depth }) => {
  const hasChildren = branch.children && branch.children.length > 0;

  return (
    <div className="flex flex-col items-center relative w-full" style={{ marginTop: depth > 0 ? "16px" : "0px" }}>
      {/* Node Box */}
      <div
        className="px-4 py-2.5 rounded-lg border border-border bg-surface text-center min-w-[140px] shadow-sm relative transition-all duration-300 hover:border-live"
        style={{
          borderLeft: branch.role === "مسند" ? "3px solid var(--live)" : undefined,
          borderRight: branch.role === "مسند إليه" ? "3px solid var(--live)" : undefined,
        }}
      >
        <span className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wide">
          {branch.role}
        </span>
        <span className="block text-sm font-medium text-foreground font-amiri mt-0.5">
          {branch.label}
        </span>
        {branch.value && (
          <span className="block text-xs text-live font-amiri mt-1 border-t border-border/40 pt-1 font-bold">
            «{branch.value}»
          </span>
        )}
      </div>

      {/* Connection line down to children */}
      {hasChildren && (
        <div className="w-[1px] h-4 bg-border/80 relative">
          {/* Connector point */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-border" />
        </div>
      )}

      {/* Children branches */}
      {hasChildren && (
        <div className="flex flex-row justify-center items-start gap-4 mt-1 border-t border-border/85 pt-3 relative w-full">
          {branch.children.map((child, idx) => (
            <AstNode
              key={child.id || idx}
              branch={child}
              tokens={tokens}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface SyntaxTreeVisualizerProps {
  ast: SyntacticBranch;
  tokens: SyntacticToken[];
}

export const SyntaxTreeVisualizer: React.FC<SyntaxTreeVisualizerProps> = ({ ast, tokens }) => {
  const tokenMap = React.useMemo(() => {
    return tokens.reduce<Record<string, SyntacticToken>>((acc, t) => {
      acc[t.id] = t;
      return acc;
    }, {});
  }, [tokens]);

  return (
    <div className="w-full overflow-x-auto py-6 px-4 scrollbar-thin bg-surface/30 rounded-xl border border-border/50">
      <div className="min-w-[600px] flex justify-center">
        <AstNode branch={ast} tokens={tokenMap} depth={0} />
      </div>
    </div>
  );
};
