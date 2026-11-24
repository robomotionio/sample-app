# Glacier Global — design notes

Taken from glacierglobal.com (the theme's Elementor global tokens and the
computed styles of the live homepage, 2026-11-20).

## Palette

| Token | Hex | Where the site uses it |
|---|---|---|
| Chocolate | `#411900` | All body text and headings; the dark "stats" band behind the big numbers |
| Navy | `#0D3F62` | Primary buttons, links, the accent colour |
| Ocean | `#296A98` | Secondary blue surfaces |
| Cream | `#FFF8D7` | Warm section backgrounds; the big numbers on the chocolate band |
| Vanilla | `#FDFBE2` | Lighter cream wash (used at 80 %) |
| Pistachio | `#93C572` / `#A9D17A` | The round arrow at the end of every button; green section |
| Strawberry | `#FA0536` | 1 px outline around each stat block |
| Lemon | `#FFFF65` | Small highlights |
| Ice | `#95C9CD` | Cool mint-blue accent |
| Lavender | `#BDBCE3` | Soft accent |
| White | `#FFFFFF` | Page and product image backgrounds |

Neutral text on light surfaces is chocolate, never grey-blue. There is no
purple or indigo gradient anywhere on the site.

## Type

- **Lato** for everything. Its weight carries the hierarchy:
  - 300 Light for the big headlines: H1 80 px / 95 %, H2 44 px / 120 %.
  - 400 for body: 18 px / 140 %, and 16 px small.
  - 900 Black for numbers and short emphasis: 60 px stats, 20–22 px card titles.
- **Eyebrow labels**: Lato 400, 18 px, UPPERCASE, letter-spacing 5 %, chocolate
  (or tan `#E6D5C3` on dark). They sit above headings ("ABOUT US", "OUR PRODUCTS").
- **Playfair Display 900** is loaded as the accent serif and used sparingly.

## Shapes and surfaces

- **Buttons are pills** (radius 100 px): navy fill, white Lato Bold 16 px,
  24 px padding on the left, with a 48 px pistachio circle holding a white
  arrow on the right edge. The outline variant has a 1 px navy border.
- **Radii vary on purpose**: 24 px on the hero video, 16 px on cards and
  photos, 12 px on stat blocks, 8–10 px on media frames and product tiles.
- **Stats**: a chocolate band; each number is cream Lato Black 60 px with
  its unit attached ("450m", "€582m") and a short caption under it, inside
  a 12 px outline in strawberry.
- **Shadows** are rare and soft. Product shots sit on white tiles.
- Product families named on the site: Extruded sticks, Cones, Bonbons & bars,
  Tubs, pots & cups.

## Tone

Warm, cheerful and confident, but B2B-professional. There is plenty of
space, large light headlines, and colour used in bold blocks rather than
gradients.

## How the app maps it

All colours, the font and the radius are kit tokens (`--rm-*`), redefined
once in `app/src/index.css`; `app.json`'s `theme.accent` is the navy.
Screens use only the kit's token class names, never a raw colour.
