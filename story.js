/* Project descriptions. Page scenes use these tab labels and body paragraphs. */
window.STORY = {
  radllm: {
    title:'RAD LLM',
    steps:[
      {label:'Chat',text:['RAD LLM is a terminal interface for a local coding agent. The main view keeps the prompt and replies in one place.']},
      {label:'Settings',text:['The interface exposes model selection and coding controls without taking over the chat view.']},
      {label:'File edits',text:['The tool workflow links source reads, edits, tests and diffs. The terminal groups changed files and shows the before-and-after diff.']}
    ]
  },
  xp: {
    title:'XP Rust',
    steps:[
      {label:'Flag',text:['I built an AI-assisted review system for a 2016 Rust server. When a NoClip check flags a player, the review uses a timeline of movement, input timing and server state.']},
      {label:'Review',text:['In this case, the AI found grounded movement and no position discrepancy. It identified lag or a server stall as a plausible explanation and recommended review rather than a penalty.']},
      {label:'The 2016 build',text:['I used Mono mods and IL2CPP to add quality-of-life features to the 2016 build. Custom DLLs and services supported the old client’s Steam-facing functions.']}
    ]
  },
  bunker: {
    title:'Bunker Bound',
    steps:[
      {label:'The bunker',text:['Bunker Bound is a low-poly extraction shooter made in Godot. Players try to escape a bunker, with customisable equipment and multiplayer that combines peer-to-peer connections with a central server.']},
      {label:'Ballistics',text:['Bullets can penetrate materials, deform doors and walls, and leave entry and exit wounds. Blood can transfer to clothing.']},
      {label:'Handling',text:['Rounds move up the magazine as the weapon cycles. Players can pilot FPV drones.']},
      {label:'Dev films',text:['Development footage covers sound propagation, movement, procedural animation, drones and weapon finishes.']}
    ]
  },
  retro: {
    title:'RetroPC',
    steps:[
      {label:'Module',text:['RetroPC is an in-progress modular computer. The R13 memory board is a 69.6 × 30 mm four-layer SRAM module shaped like a PC memory stick. It is not DDR4-compatible.']},
      {label:'Components',text:['The board, pads and traces use the KiCad layout. Component bodies use nominal package models aligned to the footprints.']},
      {label:'Layers',text:['The layout has two outer copper layers and two inner layers. Each is shown in a different colour when separated.']},
      {label:'Storage',text:['The R8 storage card uses four 128-Mbit NOR flash chips and a custom SPI interface. It fits an M.2 form factor but does not use NVMe, PCIe or SATA.']},
      {label:'Storage layers',text:['The separated copper layers show the edge contacts, signal traces, vias and copper fills in the KiCad design.']}
    ]
  }
};
