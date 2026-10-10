import React from 'react';

import type { SyntacticBranch, SyntacticToken } from '../../types/bayan';

interface AstNodeProps {
  branch: SyntacticBranch;
  tokens: Record<string, SyntacticToken>;
  depth: number;
}

/**
 * عقدة في شجرة الإعراب. الخط الوظيفي (مسند/مسند إليه) بلون الإبراز
 * على الحافة المنطقية: مسند على النهاية (يسار في RTL) ومسند إليه على
 * البداية — بدل borderLeft/Right الفيزيائيين وقيمة var(--live) الخام
 * التي لم تكن تُنتج أي إطار أصلاً. والظل الخام أُزيل.
 */
const AstNode: React.FC<AstNodeProps> = ({ branch, tokens, depth }) => {
  const hasChildren = branch.children && branch.children.length > 0;

  return (
    <div
      className="relative flex w-full flex-col items-center"
      style={{ marginTop: depth > 0 ? '16px' : '0px' }}
    >
      {/* Node Box */}
      <div
        className="relative min-w-[140px] rounded-lg border border-border bg-background px-4 py-2.5 text-center transition-motion duration-normal hover:border-primary"
        style={{
          borderInlineEnd: branch.role === 'مسند' ? '3px solid hsl(var(--primary))' : undefined,
          borderInlineStart:
            branch.role === 'مسند إليه' ? '3px solid hsl(var(--primary))' : undefined,
        }}
      >
        <span className="block font-mono text-micro uppercase tracking-wide text-muted-foreground">
          {branch.role}
        </span>
        <span className="mt-0.5 block font-amiri text-meta font-medium text-foreground">
          {branch.label}
        </span>
        {branch.value && (
          <span className="mt-1 block border-t border-border/40 pt-1 font-amiri text-mini font-bold text-primary">
            «{branch.value}»
          </span>
        )}
      </div>

      {/* Connection line down to children */}
      {hasChildren && (
        <div className="relative h-4 w-[1px] bg-border/80">
          {/* Connector point */}
          <div className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-border" />
        </div>
      )}

      {/* Children branches */}
      {hasChildren && (
        <div className="relative mt-1 flex w-full flex-row items-start justify-center gap-4 border-t border-border/85 pt-3">
          {branch.children.map((child, idx) => (
            <AstNode key={child.id || idx} branch={child} tokens={tokens} depth={depth + 1} />
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
    <div className="scrollbar-thin w-full overflow-x-auto rounded-xl border border-border/50 bg-muted/30 px-4 py-6">
      <div className="flex min-w-[600px] justify-center">
        <AstNode branch={ast} tokens={tokenMap} depth={0} />
      </div>
    </div>
  );
};
