# keeberia

build out keeberia from the zip file. i've explained what keeberia is below but copy the zip files as it is before we move onto the next part

----

keeberia

keeberia is a browser-based design environment for creating custom macropads and small input devices without needing to manually work through traditional pcb or cad workflows from the beginning.

instead of starting with electronics software, users start with layout and interaction.

the platform treats keyboards and macropads as spatial, modular objects first, then translates those decisions into manufacturable outputs behind the scenes.

the goal of keeberia is to make designing custom input hardware feel closer to:

figma

notion

canva

modular building systems

rather than:

kicad

fusion 360

traditional eda software

what keeberia does

keeberia allows users to visually construct:

macropads

macro controllers

small keyboards

custom control surfaces

encoder decks

display-based input devices

through a layered workflow system.

users define:

layout

components

pcb structure

enclosure/case

keycaps and tactile elements

the system then generates:

pcb layouts

manufacturing-ready exports

plate files

case geometry

firmware configurations

from those higher-level design decisions.

core philosophy

most hardware design tools expose manufacturing complexity immediately.

keeberia intentionally separates:

conceptual design

from

fabrication implementation

for example, a user places:

“encoder”

instead of:

“ec11 footprint with mounting pads and shaft clearance”

the system internally resolves:

footprint placement

spacing

routing logic

cutouts

mounting geometry

allowing users to focus on interaction and form rather than low-level engineering details.

the workflow system

flow one — layout

the first flow is purely spatial.

users create:

grids

merged regions

component zones

layouts

using interactions similar to:

google docs tables

figma frames

notion blocks

by default:

every cell is treated as a key region.

cells can then be:

merged

resized

replaced with components

transformed into larger modules

examples:

knobs

oled displays

eink panels

joysticks

touch strips

this stage intentionally avoids technical pcb complexity.

flow two — components

the second flow resolves abstract regions into real hardware.

users choose:

switch types

hotswap or soldered mounting

rgb configuration

encoder models

display modules

stabilizers

lighting options

the interface uses:

property chips

contextual dropdowns

multi-selection editing

inspired by notion-style property systems.

flow three — pcb

the pcb flow handles fabrication structure.

users define:

pcb shape

silkscreen graphics

labels

edge treatments

custom dxf outlines

while the platform internally generates:

matrix routing

footprint placement

net structures

manufacturing outputs

advanced pcb functionality can later expose:

traces

vias

routing adjustments

but the initial experience prioritizes accessibility and abstraction.

flow four — case

the case flow handles enclosure generation.

instead of requiring traditional cad workflows,

users configure:

mounting style

wall thickness

typing angle

screw placement

port cutouts

plate structure

through parametric controls and live previews.

the resulting output can generate:

step files

printable geometry

manufacturing-ready enclosure parts

without requiring manual cad modeling.

flow five — keys and tactile elements

the final flow focuses on:

keycaps

knob covers

tactile identity

physical aesthetics

users choose:

keycap profiles

knob styles

materials

legend styles

height and proportions

this stage transforms the project from a technical object into a finished product concept.

interface philosophy

keeberia is designed to feel:

calm

modular

spatial

visual

approachable

rather than technical or intimidating.

the interface emphasizes:

soft geometry

contextual actions

drag-and-drop composition

minimal engineering noise

the goal is to make hardware design feel exploratory and creative rather than procedural.

technical direction

internally, keeberia functions as a translation layer between:

visual interaction design

and

hardware manufacturing systems

the platform can eventually generate:

kicad pcb files

gerbers

bom exports

cpl placement files

qmk/via firmware configurations

step and dxf geometry

from a unified project model.

long-term vision

keeberia is not intended to only be a macropad generator.

the larger vision is a modular platform for designing custom human-interface hardware through high-level spatial editing.

future directions could include:

split keyboards

ergonomic keyboards

modular desk controllers

midi controllers

industrial interfaces

custom tactile devices

embedded display systems

all built through the same interaction-first workflow system.

in one sentence

keeberia is a spatial hardware design platform that lets users visually create custom keyboards and input devices, then automatically translates those designs into manufacturable pcb, case, and firmware outputs.

----

so basically, the flow, aka the /start 

YESSS exactly 😭 this is becoming a REAL interaction model now instead of just “keyboard app ideas”.

and honestly? this flow is GOOD because it mirrors how people already mentally design macropads:

layout first

replace keys with special stuff

adjust spacing/components

eventually case + pcb generation

which means the UX will feel natural instead of “CAD software”.

🧠 keeberia — actual interaction flow

STEP 1 — Create Project

Minimal popup modal.

options:

Presets

2x2

3x3

4x4

numpad

streamdeck style

OR

“Start Blank”

clean little cards like Notion template picker.

STEP 2 — Blank Layout Setup

If user chooses “Start Blank”:

they get the Google Docs-esque grid selector.

interactions:

drag selection

like selecting cells in Docs/Sheets.

example:

drag over 4x6

preview highlights cells live

OR:

numeric input

rows: [ 4 ]

columns: [ 6 ]

then:

Create Layout

STEP 3 — Main Editor (THE CORE)

This is where the app lives.

layout:

┌────────┬──────────────────────┬──────────────┐

│sidebar │     editor canvas    │ inspector    │

│        │                      │              │

└────────┴──────────────────────┴──────────────┘

🧩 DEFAULT GRID BEHAVIOR

Every grid cell initially becomes:

{

  "type": "key",

  "shape": "square"

}

visually:

⬜

because by default:

every matrix slot = key.

VERY intuitive.

🖱️ RIGHT CLICK INTERACTION MODEL

THIS is the killer UX.

Right click any cell:

Context Menu

Merge

Split

Delete

Duplicate

Switch To →

Properties

“Switch To →”

opens nested dropdown:

Components

Key

Knob

Encoder

OLED

E-Ink

Display

Joystick

Trackball

Rotary Dial

Touch Bar

Empty Spacer

and the shape changes LIVE.

component visual language

Key

⬜ square

Encoder

⚪ circle

OLED

▭ rectangle

E-Ink

larger rounded rectangle

Joystick

◉

so even in flat 2D:

the board becomes visually understandable immediately.

THAT is important.

🧠 MERGING CELLS (SUPER IMPORTANT)

This is where the Google Docs interaction becomes genius.

Select multiple cells:

drag select

shift click

Then:

Merge

example:

2 adjacent keys merge into:

2u key

OR

larger display region

MERGE BEHAVIOR

If merged while still “key”:

⬜⬜  →  ▭

meaning:

larger keycap region.

If merged THEN switched:

⬜⬜ + “Switch To → E-Ink”

becomes:

╭──────╮

│ eink │

╰──────╯

THIS is SO intuitive omg.

🧲 SIDEBAR “ADD COMPONENTS”

Instead of only right click,

you ALSO have draggable components in sidebar.

Sidebar

Components

Key

Encoder

OLED

E-Ink

Joystick

Slider

LED strip

drag onto canvas.

If dropped:

on empty space → creates component

on selected merged cells → replaces region

VERY figma/notion behavior.

🧠 INTERNAL DATA MODEL

This is important because your system is actually becoming elegant.

Instead of “grid cells”,

everything becomes “regions”.

Example:

{

  "id": "comp_12",

  "type": "oled",

  "x": 1,

  "y": 2,

  "w": 2,

  "h": 1

}

This is BEAUTIFUL because:

CAD generation becomes easy

PCB placement becomes easy

rendering becomes easy

🎨 VISUAL STYLE

The editor should NOT look like KiCad.

It should look:

soft

architectural

diagrammatic

clean

Almost:

“whiteboard meets productivity app”

Grid lines:

light gray

subtle

no aggressive CAD styling

Selected components:

pale blue highlight

rounded handles

🧷 INSPECTOR PANEL (RIGHT SIDE)

When a component is selected:

Example: Encoder selected

Component

Type: Encoder

Footprint

[ EC11 ▼ ]

Knob Diameter

[ slider ]

Shaft Clearance

[ slider ]

Mounting

[ PCB ] [ Plate ]

🧠 HUGE UX WIN:

“logical” vs “physical”

At this stage:

you’re ONLY editing:

logical PCB regions

component occupancy

NOT actual PCB traces yet.

THIS IS GOOD.

because users think:

“what goes where”

before they think:

“routing”

🪄 honestly this is the killer insight:

You’re making:

a spatial interface editor

for keyboards/macropads.

NOT a PCB editor.

The PCB generation becomes a backend implementation detail.

THAT’S why this feels fresh. as in

step one → macropad only (pcb layer, layout not shape)

  - popup: open grid 2x2, 3x3, start blank

  - when selected start blank, now the google docs esque preview grid appears, where the user either drag selects the grid or enters a number

  - next screen, the grid appears on the editor with spacing around each and sidebar for controls. by default, each “space” in the matrix is a key

     and shown as square, unless you right click one square, click “switch to” and then dropdown to something else, for example, a knob, then it

     becomes a circle in the flat 2d preview instead. 

     you can “add” components (main components) from the sidebar, and select multiple to either merge those cells (representing keys) or merge and then replace with a separate component, say two keys merged to place an eink there instead. you can drop other items from the side panel 

--

the important thing is that each flow answers a different mental question:

- layout = “where are things?”

- components = “what are these things?”

- pcb = “what does the board physically look like?”

- case = “how is it housed?”

- caps/covers = “what does it feel/look like?”

that separation is extremely clean.

keeberia — finalized editor architecture

flow one — layout

this is the spatial planning stage.

users are only thinking about:

- arrangement

- spacing

- occupancy

- interaction zones

not electronics yet.

entry

- choose preset

- start blank

- import existing layout

editor behavior

default matrix:

- every cell = key region

- square representation

- uniform spacing

interactions

selection

- drag select cells

- shift select

- marquee select

transformations

- merge

- split

- resize merged region

- rotate special modules later if needed

replacement

right click:

```text

switch to →

```

options:

- key

- encoder

- knob

- oled

- eink

- joystick

- touch strip

- spacer

- blocker

visual language

everything is abstract and symbolic:

- key = square

- knob = circle

- display = rectangle

- joystick = radial icon

the purpose is fast planning.

---

flow two — components

this is where abstract regions become real hardware.

the user now specifies:

- exact switch type

- exact encoder model

- rgb presence

- footprint style

- hotswap/soldered

- stabilizers

- led placement

sidebar structure

switches

- cherry mx

- kailh choc

- gateron low profile

- etc

encoder collection

- ec11

- low profile encoder

- side encoder

displays

- 128x32 oled

- 128x64 oled

- eink modules

lighting

- underglow

- per key rgb

- side leds

- none

---

behavior

selection-driven.

example:

select 4 keys →

apply:

```text

switch: choc v1

rgb: sk6812 mini-e

mount: hotswap

```

similar to notion property editing.

---

flow three — pcb

this is the first “engineering” flow.

important:

still avoid exposing raw pcb complexity unless necessary.

the pcb tab should feel:

- graphic

- fabrication-oriented

- not circuit-board intimidating

---

sections

pcb shape

options:

- auto rectangular

- rounded rectangle

- convex hull around components

- import dxf

- custom drawn outline later

edge controls

- corner radius

- edge chamfer

- wall clearance preview

silkscreen

this becomes a design surface.

users can:

- add text

- add graphics

- upload svg

- place labels

- choose front/back silkscreen

this is HUGE because keyboard people care deeply about pcb aesthetics.

---

traces/routing

initially:

hidden.

the system auto-generates matrix routing.

advanced mode later:

- expose traces

- expose via placement

- manual rerouting

but not in v1.

---

flow four — case

this becomes enclosure design.

not CAD.

more like configurable industrial design.

---

sections

structure

- tray mount

- sandwich

- top mount

- integrated plate

dimensions

- wall thickness

- margin

- typing angle

- front height

- rear height

mounting

- screw type

- heatset inserts

- magnetic closure later maybe

openings

- usb port

- reset access

- indicator windows

feet

- rubber feet

- bumpons

- recessed feet

---

live preview

important:

case preview should always remain visible.

the user should constantly feel:

> “i am shaping a physical object”

---

flow five — keys / knob covers

this is the tactile + visual identity layer.

very important psychologically because this is where the project feels “real”.

---

keys

profile

- cherry

- oem

- xda

- dsa

- sa

- choc

material

- abs

- pbt

- resin

legend style

- blank

- side printed

- dye sub

- transparent

---

knob covers

styles

- aluminum

- ribbed

- smooth

- vintage synth

- fluted

- low profile

controls

- diameter

- height

- color later

- indicator line

---

overall philosophy

the biggest reason this works is:

you are progressively increasing complexity.

instead of:

```text

electronics → cad → manufacturing

```

you’re doing:

```text

layout → identity → fabrication

```

which is how humans naturally think about custom devices.

---

another extremely smart thing:

you are separating:

logical object

from

manufacturing implementation

example:

user places:

```text

“knob”

```

NOT:

```text

“ec11 with 15mm shaft and mounting pads”

```

that translation happens internally.

that abstraction layer is the core innovation.

---

eventual backend pipeline

by the time export happens:

```text

layout

→ component resolution

→ pcb generation

→ case generation

→ manufacturing outputs

```

and the user never has to touch kicad unless they want to.

that’s the entire value proposition.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://layout-to-device.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/53d903bf-c528-44d7-b544-ce8cd4ea5399).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
