# PopPop Math board asset kit

Generated with the built-in image generation tool. Initial artwork for review and integration; not wired into the React app.

- poppop-math-logo.png: logo with transparency and tagline.
- adventure-board-empty.png: 1536 x 1024 board with sixteen blank reward sockets.
- poppop-player-token.png: static character marker with transparency, not an animated sprite sheet.
- board-layout.json: approximate visually checked socket centers as percentages, in adventure travel order, linked to card IDs from the card pack.

## Progress display

Use one unchanged board background. Overlay level labels and interactive buttons at the supplied centers. Use a small PopPop token to indicate the selected/current stop, earned card thumbnails or checks for passed battles, and a separate fluency badge only when earned. Keep accessible names on every button. Preserve the board aspect ratio; avoid cropping because it displaces overlays. Check alignment in the actual app before shipping.

All reward sockets start empty. Empty means unearned, not necessarily locked. Derive availability from the existing game rules: regional battles unlock after their four table bosses, final battle after all three regional wins. The path is visual story order and should not impose additional unlock conditions. Point goals remain separate from adventure completion. A fluency badge remains separate from simply passing a battle.

## Art direction

Logo: PopPop and the unimpressed flamingo above cream/gold PopPop Math lettering, plum outlines, tagline Get Goated at Math, transparent background.
Board: warm ink and gouache African river/savanna, sixteen empty sockets on a four-row serpentine trail, three gold regional sockets and one crowned final socket. No completed markers or fixed player token.
Player token: one waving gray-purple PopPop with cream sticker outline, transparent background.
