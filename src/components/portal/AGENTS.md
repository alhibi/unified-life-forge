# Portal launcher

- Launcher widget material is authored per app in AppTileVisuals (tone 0 = neutral widget, 1–6 = category bodies) and two-column spans come from widgetSpans; this keeps every realm a gap-free multicolour composition instead of one repeated hue.
- Each launcher app draws its own face in AppTileFaces, registered in appTileFaceRegistry (a coverage test requires one per app); faces show live values only from the app's existing data sources and otherwise use real content or pure form, so tiles never invent metrics.
