import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";
import { ChartContainer } from "../chart";

describe("ChartStyle Sanitization & XSS Defense", () => {
  beforeAll(() => {
    // Mock ResizeObserver for Recharts ResponsiveContainer to prevent crashing in JSDOM
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).ResizeObserver;
  });

  it("should render correct styles for normal safe inputs", () => {
    const config = {
      desktop: {
        label: "Desktop",
        color: "#2563eb",
      },
    };

    const { container } = render(
      <ChartContainer id="test-id" config={config}>
        <div />
      </ChartContainer>
    );

    const styleEl = container.querySelector("style");
    expect(styleEl).toBeTruthy();
    expect(styleEl?.textContent).toContain("[data-chart=chart-test-id]");
    expect(styleEl?.textContent).toContain("--color-desktop: #2563eb;");
  });

  it("should sanitize malicious/unsafe characters in chart ID", () => {
    const config = {
      desktop: {
        label: "Desktop",
        color: "#2563eb",
      },
    };

    // Attempt to close styling and inject arbitrary CSS or HTML
    const maliciousId = `test-id] { background: red; } </style><script>console.log("XSS")</script><style>`;

    const { container } = render(
      <ChartContainer id={maliciousId} config={config}>
        <div />
      </ChartContainer>
    );

    const styleEl = container.querySelector("style");
    expect(styleEl).toBeTruthy();

    // The script tag should be completely broken/omitted or sanitized so it does not contain the dangerous string
    expect(styleEl?.textContent).not.toContain("</style>");
    expect(styleEl?.textContent).not.toContain("<script>");

    // The id is sanitized to keep only safe characters (alphanumeric, dash, underscore)
    const expectedSanitizedId = "chart-test-idbackgroundredstylescriptconsolelogXSSscriptstyle";
    expect(styleEl?.textContent).toContain(`[data-chart=${expectedSanitizedId}]`);
  });

  it("should sanitize malicious/unsafe characters in configuration keys", () => {
    const maliciousKey = `desktop; background: url(https://evil.com/leak);`;
    const config = {
      [maliciousKey]: {
        label: "Desktop",
        color: "#2563eb",
      },
    };

    const { container } = render(
      <ChartContainer id="test-id" config={config}>
        <div />
      </ChartContainer>
    );

    const styleEl = container.querySelector("style");
    expect(styleEl).toBeTruthy();

    // Semicolon and spaces are stripped, resulting in a safe CSS variable name
    expect(styleEl?.textContent).not.toContain("background:");
    expect(styleEl?.textContent).not.toContain("url(");
    expect(styleEl?.textContent).toContain("--color-desktopbackgroundurlhttpsevilcomleak");
  });

  it("should sanitize malicious/unsafe characters in color values", () => {
    const config = {
      desktop: {
        label: "Desktop",
        // Attempt CSS injection and style tag closure
        color: `#2563eb; } </style><script>alert('XSS')</script>`,
      },
    };

    const { container } = render(
      <ChartContainer id="test-id" config={config}>
        <div />
      </ChartContainer>
    );

    const styleEl = container.querySelector("style");
    expect(styleEl).toBeTruthy();

    // HTML elements should be stripped
    expect(styleEl?.textContent).not.toContain("</style>");
    expect(styleEl?.textContent).not.toContain("<script>");

    // Check that the rule content is properly sanitized to prevent any escape of the block
    expect(styleEl?.textContent).toContain("--color-desktop: #2563eb  stylescriptalert(XSS)script;");
  });
});
