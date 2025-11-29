# StylIQ Agents Guide

## Overview
- **Purpose** – `STYLE_AGENTS` is the curated roster of stylist personas that power wardrobe prompts, personalization logic, and front-end controls. Each agent captures a coherent vibe (color palette, fit, fabric, and pairing heuristics) so downstream scoring can stay consistent.
- **Primary source** – Definitions live in `apps/backend-nest/src/wardrobe/logic/style-agents.ts` and are typed by `UserStyle` from `apps/backend-nest/src/wardrobe/logic/style.ts`.
- **Consumers** – Prompts (`apps/backend-nest/src/wardrobe/prompts/outfitPrompt.ts`), wardrobe services, and UI affordances like `OutfitTuningControls` import the map to surface agent-specific copy and filters.

## Current Agents (TL;DR)
| Id | Name | Dress Bias | Keywords | Notable Rules |
| --- | --- | --- | --- | --- |
| agent1 | Power Tailoring (Tom Ford) | Business | Structured, Sharp, Evening | High contrast, structured shoulders, `mustPair.blazer → oxfords/wholecuts` |
| agent2 | Minimal Luxe (The Row) | BusinessCasual | Minimal, Quiet Luxury | Low contrast, patternless, natural shoulder |
| agent3 | Heritage Americana | SmartCasual | Preppy, Ivy, Timeless | Tweed/oxford fabrics, loafers/derbies with sportcoats |
| agent4 | Rock Slim (Hedi) | UltraCasual | Slim, Rock, Monochrome | Skinny fits, leather jacket → boots, statement jewelry |
| agent5 | Quiet Cashmere (Cucinelli) | SmartCasual | Soft Tailoring, Tonal | Taupe/stone palette, soft shoulders, cashmere-heavy |
| agent6 | Avant-Garde Monochrome (Rick Owens) | UltraCasual | Draped, Stacked | Relaxed tops + slim bottoms, chunky boots, high layer tolerance |
| agent7 | Street Luxury (Virgil Abloh) | Casual | Statement, Graphic | Bold palette, hoodie → sneakers, avoid blazer + oxfords |
| agent8 | Soft Italian Sprezzatura | BusinessCasual | Unstructured, Sprezzatura | Natural shoulder, loafers with sportcoats |
| agent9 | Sport-Tech Urban (Acronym) | Casual | Technical, Utility | Gore-tex palette, shell → sneakers, avoid sport coat + dress shoes |
| agent10 | Modern Business Casual (Theory) | BusinessCasual | Clean, Office-Ready | Natural shoulder, derbies/loafers with sportcoats |
| agent11 | Mediterranean Linen | SmartCasual | Resort, Linen | Low contrast, airy fabrics, warm-climate palette |
| agent12 | Editorial Classic | Business | Iconic, Photogenic | Structured tailoring, blazer → oxfords/loafers, hoodie + dress shoes forbidden |

## Field Reference
- **Color & fabric** – `preferredColors`, `avoidColors`, `palette`, `preferredFabrics`, `avoidFabrics` drive scoring multipliers and palette nudges.
- **Fit & structure** – `topsFit`, `bottomsFit`, `outerShoulder`, `structureBalance` enforce silhouette alignment; values must match `FitLevel`/`BottomsFit` unions in `style.ts`.
- **Heuristics** – `mustPair` and `avoidPair` provide subcategory rules that the wardrobe service enforces before surfacing looks.
- **Tolerance flags** – `contrastTarget`, `layerTolerance`, `footwearLast`, `jewelryTolerance`, `beltRequiredWhen` control final adjustments in scoring and copy.

## Adding or Updating Agents
1. **Define the profile** – Edit `apps/backend-nest/src/wardrobe/logic/style-agents.ts` and add/update the `STYLE_AGENTS` entry. Stick to the existing schema so TypeScript catches any typos.
2. **Adjust prompts/UI if needed** – If the new agent introduces fresh concepts (e.g., new `dressBias` or pairing rules), update consumers such as `apps/backend-nest/src/wardrobe/prompts/outfitPrompt.ts` and `apps/frontend/src/components/OutfitTuningControls/OutfitTuningControls.tsx`.
3. **Test scoring** – Run the wardrobe service/unit tests or manual API hits to confirm the agent influences outfit generation as expected, especially when relying on new palette or pairing constraints.

## Tips
- Keep `fashionGoals`, `lifestyle`, and `styleKeywords` punchy—copy surfaces directly in UI and LLM prompts.
- Favor lowercase strings inside `palette`/pairing maps; helper functions lowercase before comparisons.
- When experimenting, set `STYLE_DEBUG=true` to inspect scoring traces that show how each field affected recommendation weights.
