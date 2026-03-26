/**
 * Token counting script using tiktoken
 * Run with: node count-tokens.js
 */

const { encodingForModel } = require('js-tiktoken');

const text = `=== Thorn_the_Wild_Character_Sheet.pdf ===


Thorn the Wild Hero IMAGE GENERATION DETAILS Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, crisp sprite outlines, dithered shading, low-resolution retro fantasy aesthetic. Druid Halfling: A small and cheerful race known for their luck and love of comfort.. A guardian of nature who wields primal magic., depicted in a distinctly medieval high-fantasy world. Placed in a medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Retro SNES/Genesis style, no modern objects or technology. Cinematic composition. --style raw CHARACTER DETAILS Race: n/a Sex: n/a STATISTICS HP: 24/24 AC: 15 ATK: +4 DMG: d8 DESCRIPTION A guardian of nature who wields primal magic. ABILITIES

Thorn Whip (Attack) Create a long, vine-like whip covered in thorns. - Damage: 1d6 - Attack Roll: d20 Cure Wounds (Healing) A creature you touch regains hit points through natural magic. - Healing: 1d8+3 Goodberry (Healing) Create berries that restore hit points when consumed. - Healing: 1d4+1 2025 OpenRAG

=== Brother_Marcus_Character_Sheet.pdf ===


Brother Marcus Hero IMAGE GENERATION DETAILS Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, dithered shading, low-resolution retro fantasy aesthetic. Cleric Firbolg: A gentle giant race with a deep connection to nature and the ability to become invisible.. A holy warrior who channels divine power., depicted in a distinctly medieval high-fantasy world. Placed in a expansive medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Position the character in the lower third of the frame, (facing the camera), viewed from a pulled-back wide-angle perspective showing expansive landscape surrounding them. The character should occupy only 60-70% of the composition, with dominant landscape and sky filling the remainder. Retro SNES/Genesis style, no modern objects or technology. --style raw CHARACTER DETAILS Race: n/a Sex: n/a STATISTICS HP: 26/26 AC: 16 ATK: +4 DMG: d8 DESCRIPTION A holy warrior who channels divine power.

ABILITIES Guided Strike (Attack) Channel divine power to guide your weapon to its target. - Damage: 1d8 - Attack Roll: d20 Cure Wounds (Healing) A creature you touch regains hit points through divine magic. - Healing: 1d8+3 Healing Word (Healing) A creature of your choice regains hit points with a word. - Healing: 1d4+3 2025 OpenRAG

=== Starfire_Character_Sheet.pdf ===


Starfire Hero IMAGE GENERATION DETAILS Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, crisp sprite outlines, dithered shading, low-resolution retro fantasy aesthetic. Sorcerer Kalashtar: A race with a connection to the plane of dreams, able to communicate telepathically.. A spellcaster with innate magical power., depicted in a distinctly medieval high-fantasy world. Placed in a medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Retro SNES/Genesis style, no modern objects or technology. Cinematic composition. --style raw CHARACTER DETAILS Race: n/a Sex: n/a STATISTICS HP: 20/20 AC: 13 ATK: +3 DMG: d6 DESCRIPTION A spellcaster with innate magical power. ABILITIES

Chaos Bolt (Attack) Hurl a bolt of chaotic energy at your target. - Damage: 2d8 - Attack Roll: Automatic Fire Bolt (Attack) Hurl a mote of fire at a creature or object. - Damage: 1d10 - Attack Roll: d20 Vampiric Touch (Healing) Channel life force to heal yourself through magical means. - Healing: 1d8+2 2025 OpenRAG

=== Thorin_Ironfist_Character_Sheet.pdf ===


Thorin Ironfist Custom Hero IMAGE GENERATION DETAILS Setting/Theme: Medieval Fantasy Description: Classic medieval high-fantasy setting with castles, magic, and ancient ruins Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, dithered shading, low-resolution retro medieval high-fantasy aesthetic. Human male A burly fighter with a strong build, standing tall with short-cropped black hair and piercing blue eyes, clad in chainmail armor and wielding a hefty longsword., depicted in a distinctly medieval high-fantasy world. Placed in a expansive medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Position the character in the lower third of the frame, (facing the camera), viewed from a pulled-back wide-angle perspective showing expansive landscape surrounding them. The character should occupy only 60-70% of the composition, with dominant landscape and sky filling the remainder. Retro SNES/Genesis style, no modern objects or technology. CHARACTER DETAILS Race: Human Sex: male STATISTICS HP: 28/28 AC: 16 ATK: +4 DMG: d10

DESCRIPTION A burly fighter with a strong build, standing tall with short-cropped black hair and piercing blue eyes, clad in chainmail armor and wielding a hefty longsword. ABILITIES Ironfist Strike (Attack) Thorin delivers a powerful punch with his iron-clad fist, capable of crushing armor and bone alike. - Damage: 2d8 - Attack Roll: d20 Battle Cry (Attack) Thorin lets out a fearsome battle cry, inspiring allies and intimidating foes, dealing automatic damage to nearby enemies. - Damage: 1d6 - Bonus: 1d6 - Attack Roll: Automatic Shield Wall (Healing) Thorin raises his shield to protect himself and nearby allies, granting temporary hit points as a form of healing. - Healing: 1d8+2 Whirlwind Slash (Attack) Thorin spins with his weapon, striking multiple enemies in a wide arc with deadly precision. - Damage: 1d10 - Attack Roll: d20 - Attacks: x2 2025 OpenRAG

=== Crane_the_Graceful_Character_Sheet.pdf ===


Crane the Graceful Hero IMAGE GENERATION DETAILS Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, crisp sprite outlines, dithered shading, low-resolution retro fantasy aesthetic. Monk Kalashtar: A race with a connection to the plane of dreams, able to communicate telepathically.. A master of martial arts and ki energy., depicted in a distinctly medieval high-fantasy world. Placed in a medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Retro SNES/Genesis style, no modern objects or technology. Cinematic composition. --style raw CHARACTER DETAILS Race: Yuan-ti Sex: other STATISTICS HP: 26/26 AC: 16 ATK: +4 DMG: d8 DESCRIPTION A master of martial arts and ki energy. ABILITIES

Flurry of Blows (Attack) Make two unarmed strikes in rapid succession. - Damage: 1d4 - Attack Roll: d20 - Attacks: x2 Stunning Strike (Attack) Strike with focused ki to stun your opponent. - Damage: 1d6 - Attack Roll: d20 Ki Restoration (Healing) Channel your ki energy to restore your body and recover hit points. - Healing: 1d8+2 2025 OpenRAG

=== Berserker_Korg_Character_Sheet.pdf ===


Berserker Korg Hero IMAGE GENERATION DETAILS Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, dithered shading, low-resolution retro fantasy aesthetic. Barbarian Yuan-ti: A serpentine race with resistance to magic and the ability to cast spells. A fierce warrior who fights with primal fury, depicted in a distinctly medieval high-fantasy world. Placed in a expansive medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Position the character in the lower third of the frame, (facing the camera), viewed from a pulled-back wide-angle perspective showing expansive landscape surrounding them. The character should occupy only 60-70% of the composition, with dominant landscape and sky filling the remainder. CHARACTER DETAILS Race: n/a Sex: n/a STATISTICS HP: 35/35 AC: 14 ATK: +5 DMG: d12 DESCRIPTION A fierce warrior who fights with primal fury.

ABILITIES Reckless Attack (Attack) Throw caution to the wind and attack with savage fury. - Damage: 1d12 - Attack Roll: d20 Rage Strike (Attack) Channel your rage into a devastating blow. - Damage: 2d6 - Attack Roll: d20 Primal Resilience (Healing) Tap into your primal strength to recover from wounds through sheer toughness. - Healing: 1d10+2 2025 OpenRAG

=== Lyra_Moonwhisper_Character_Sheet.pdf ===


Lyra Moonwhisper Hero IMAGE GENERATION DETAILS Generation Prompt: A dnd style wizard (alone) CHARACTER DETAILS Race: n/a Sex: n/a STATISTICS HP: 20/20 AC: 12 ATK: +3 DMG: d6 DESCRIPTION A wielder of arcane magic, the Wizard commands powerful spells. ABILITIES Magic Missile (Attack) Three unerring bolts of magical force strike the target. - Damage: 1d4+1 - Attack Roll: Automatic - Attacks: x3

Fireball (Attack) A bright streak flashes from your pointing finger and explodes. - Damage: 3d6 - Attack Roll: Automatic Arcane Recovery (Healing) Channel arcane energy to restore your vitality and recover hit points. - Healing: 1d8+2 2025 OpenRAG

=== Sir_Percival_Character_Sheet.pdf ===


Sir Percival Hero IMAGE GENERATION DETAILS Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, crisp sprite outlines, dithered shading, low-resolution retro fantasy aesthetic. Paladin Aarakocra: A bird-like race with wings, able to fly and known for their connection to the element of air.. A holy warrior who smites evil with divine power., depicted in a distinctly medieval high-fantasy world. Placed in a medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Retro SNES/Genesis style, no modern objects or technology. Cinematic composition. --style raw CHARACTER DETAILS Race: n/a Sex: n/a STATISTICS HP: 30/30 AC: 18 ATK: +5 DMG: d10 DESCRIPTION A holy warrior who smites evil with divine power. ABILITIES

Divine Smite (Attack) Channel divine energy to smite your enemies. - Damage: 1d8 - Bonus: 2d8 - Attack Roll: d20 Lay on Hands (Healing) Touch a creature to restore its hit points through divine power. - Healing: 1d10+5 2025 OpenRAG

=== Gear_the_Builder_Character_Sheet.pdf ===


Gear the Builder Hero IMAGE GENERATION DETAILS Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, dithered shading, low-resolution retro fantasy aesthetic. Artificer Warforged: A constructed race of living machines, created for war but now seeking their own purpose.. A master of magical invention and technology., depicted in a distinctly medieval high-fantasy world. Placed in a expansive medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Position the character in the lower third of the frame, (facing the camera), viewed from a pulled-back wide-angle perspective showing expansive landscape surrounding them. The character should occupy only 60-70% of the composition, with dominant landscape and sky filling the remainder. Retro SNES/Genesis style, no modern objects or technology. --style raw CHARACTER DETAILS Race: n/a Sex: n/a STATISTICS HP: 24/24 AC: 17 ATK: +4 DMG: d8 DESCRIPTION A master of magical invention and technology.

ABILITIES Arcane Weapon (Attack) Infuse a weapon with magical energy to deal extra damage. - Damage: 1d8 - Bonus: 1d6 - Attack Roll: d20 Cure Wounds (Healing) A creature you touch regains hit points through magical tinkering. - Healing: 1d8+2 2025 OpenRAG

=== Raven_the_Cursed_Character_Sheet.pdf ===


Raven the Cursed Hero IMAGE GENERATION DETAILS Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, crisp sprite outlines, dithered shading, low-resolution retro fantasy aesthetic. Warlock Earth Genasi: A genasi with earth elemental heritage, able to move through earth and stone.. A spellcaster who made a pact with otherworldly beings., depicted in a distinctly medieval high-fantasy world. Placed in a medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Retro SNES/Genesis style, no modern objects or technology. Cinematic composition. --style raw CHARACTER DETAILS Race: n/a Sex: n/a STATISTICS HP: 22/22 AC: 13 ATK: +4 DMG: d8 DESCRIPTION A spellcaster who made a pact with otherworldly beings. ABILITIES

Eldritch Blast (Attack) A beam of crackling energy streaks toward a creature. - Damage: 1d10 - Attack Roll: d20 - Attacks: x2 Hex (Attack) Place a curse on a creature that deals extra damage. - Damage: 1d6 - Bonus: 1d6 - Attack Roll: d20 Dark Pact Recovery (Healing) Draw upon your patron's power to restore your vitality. - Healing: 1d8+2 2025 OpenRAG

=== Designer_Character_Sheet.pdf ===


Designer Custom Hero IMAGE GENERATION DETAILS Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, crisp sprite outlines, dithered shading, low-resolution retro fantasy aesthetic. Designer, a charismatic tech-savvy fighter who wields a keyboard and mouse as weapons.??Apparent age: He appears to be in his late 20s to mid-30s.??Facial features: He has a bright, open smile showing his teeth. His face has smooth features, a defined jawline, and short facial stubble. His eyebrows are dark and expressive.??Hair: Dark hair styled neatly, swept to one side with some volume on top.??Skin tone: Light to medium complexion., depicted in a distinctly medieval high-fantasy world. Placed in a medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Retro SNES/Genesis style, no modern objects or technology. Cinematic composition. --style raw CHARACTER DETAILS Race: n/a Sex: n/a STATISTICS HP: 28/28 AC: 15 ATK: +4 DMG: d8 DESCRIPTION Designer, a charismatic tech-savvy fighter who wields a keyboard and mouse as weapons, using his pixel-push attack to disorient foes.

ABILITIES Pixel-Push (Attack) Designer hurls a surge of corrupted pixels at a target, dealing damage and potentially blinding them. - Damage: 1d8 - Bonus: 1d4 - Attack Roll: d20 Code Surge (Attack) Designer unleashes two rapid keystrokes, striking the enemy twice with digital energy. - Damage: 2d6 - Attack Roll: d20 - Attacks: x2 Cursor Shield (Healing) Designer summons a protective cursor that heals allies within its glow. - Healing: 2d8+2 Fix Dev Mistakes (Healing) Designer emits a soothing aura that repairs minor wounds and restores morale. - Healing: 1d6+3 2025 OpenRAG

=== Onyx_Character_Sheet.pdf ===


Onyx Custom Hero IMAGE GENERATION DETAILS Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, dithered shading, low-resolution retro high-fantasy aesthetic. A sly and pretty young woman wielding a diamond blade and golden boomerang, she strikes unseen and disappears into the shadows., depicted in a distinctly high-fantasy world. Placed in a expansive high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Position the character in the lower third of the frame, (facing the camera), viewed from a pulled-back wide-angle perspective showing expansive landscape surrounding them. The character should occupy only 60-70% of the composition, with dominant landscape and sky filling the remainder. Retro SNES/Genesis style, magical technology, enchanted objects, no modern technology. --style raw CHARACTER DETAILS Race: n/a Sex: n/a STATISTICS HP: 25/25 AC: 15 ATK: +4 DMG: d8 DESCRIPTION A sly and pretty young woman wielding a diamond blade and golden boomerang, she strikes unseen and disappears into the shadows.

ABILITIES Diamond Blade Slash (Attack) A swift, razor?sharp strike that shimmers like a diamond. - Damage: 1d10 - Bonus: 1d4 - Attack Roll: d20 Golden Boomerang (Attack) A gleaming boomerang that returns to Onyx, striking twice. - Damage: 1d8 - Attack Roll: d20 - Attacks: x2 Shadow Veil (Healing) A subtle charm that mends wounds and grants a brief moment of safety. - Healing: 2d6+2 Sly Whisper (Attack) A silent, deceptive blow that deals extra damage when the target is unaware. - Damage: 1d6 - Bonus: 1d6 - Attack Roll: Automatic 2025 OpenRAG

=== Kit_Character_Sheet.pdf ===


Kit Custom Hero IMAGE GENERATION DETAILS Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, dithered shading, low-resolution retro sci-fi aesthetic. A sleek car (1982 Pontiac Firebird) from Night Rider with an iconic ((strip of red lights centered on the front of the bumper)) powered by an AI. In the city., depicted in a distinctly sci-fi world. Placed in a expansive sci-fi setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Position the character in the lower third of the frame, (facing the camera), viewed from a pulled-back wide-angle perspective showing expansive landscape surrounding them. The character should occupy only 60-70% of the composition, with dominant city landscape and sky filling the remainder. Retro SNES/Genesis style, advanced science, space technology, alien artifacts. --style raw CHARACTER DETAILS Race: n/a Sex: n/a STATISTICS HP: 28/28 AC: 15 ATK: +4 DMG: d8 DESCRIPTION A sleek car (1982 Pontiac Firebird) from Night Rider with an iconic strip of red lights on the front of the bumper.

ABILITIES Turbo Boost (Attack) Kit slams into the enemy with a burst of speed, dealing kinetic damage. - Damage: 2d8 - Attack Roll: d20 Nitro Pulse (Attack) A rapid double strike that leaves a trail of burning exhaust, adding extra fire damage. - Damage: 1d10 - Bonus: 1d4 - Attack Roll: d20 - Attacks: x2 Revive Engine (Healing) Kit's engine revs to restore vitality, healing allies within a short radius. - Healing: 2d6+2 Shielded Transmission (Attack) A defensive maneuver that automatically damages any attacker who tries to hit Kit. - Damage: 1d6 - Attack Roll: Automatic 2025 OpenRAG

=== Vespera_Darkblade_Character_Sheet.pdf ===


Vespera Darkblade Custom Hero IMAGE GENERATION DETAILS Setting/Theme: Futuristic Sci-Fi Description: Advanced futuristic setting with starships, advanced technology, and space stations Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, dithered shading, low-resolution retro futuristic sci-fi aesthetic. Human female Vespera Darkblade Human: A formidable human female Sith wielding a red saber staff, wearing a long red cape with black futuristic body armor., depicted in a distinctly futuristic sci-fi world. Placed in a expansive futuristic sci-fi setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Position the character in the lower third of the frame, (facing the camera), viewed from a pulled-back wide-angle perspective showing expansive landscape surrounding them. The character should occupy only 60-70% of the composition, with dominant landscape and sky filling the remainder. Retro SNES/Genesis style, advanced technology, holographic displays, energy weapons. CHARACTER DETAILS Race: Human Sex: female STATISTICS HP: 30/30 AC: 16 ATK: +4 DMG: d10

DESCRIPTION Vespera Darkblade Human: A formidable human female Sith wielding a red saber staff, wearing a long red cape with black futuristic body armor. ABILITIES Dual Saber Strike (Attack) Vespera strikes with her dual red lightsaber, delivering two swift and deadly attacks. - Damage: 2d8 - Attack Roll: d20 - Attacks: x2 Force Choke (Attack) Using the dark side of the Force, Vespera chokes her enemy, dealing damage and potentially stunning them. - Damage: 1d10 - Bonus: 1d6 - Attack Roll: d20 Sith Resilience (Healing) Drawing on the dark side, Vespera heals her wounds, restoring her vitality. - Healing: 2d4+2 Saber Deflection (Attack) Vespera deflects incoming attacks with her lightsaber, reflecting damage back to her attacker. - Damage: 1d6 - Attack Roll: Automatic 2025 OpenRAG

=== Sylvan_the_Hunter_Character_Sheet.pdf ===


Sylvan the Hunter Hero IMAGE GENERATION DETAILS Setting/Theme: Medieval Fantasy Description: Classic medieval high-fantasy setting with castles, magic, and ancient ruins Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, dithered shading, low-resolution retro medieval high-fantasy aesthetic. Gnome female A lean 5'9" ranger with sun?tanned skin, short brown hair, amber eyes, wearing a green hooded cloak, leather armor, and a quiver of arrows., depicted in a distinctly medieval high-fantasy world. Placed in a expansive medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Position the character in the lower third of the frame, (facing the camera), viewed from a pulled-back wide-angle perspective showing expansive landscape surrounding them. The character should occupy only 60-70% of the composition, with dominant landscape and sky filling the remainder. Retro SNES/Genesis style, no modern objects or technology. CHARACTER DETAILS Race: Gnome Sex: female STATISTICS HP: 28/28 AC: 15 ATK: +4 DMG: d8 DESCRIPTION A lean 5'9" ranger with sun?tanned skin, short brown hair, amber eyes, wearing a green hooded cloak, leather armor, and a quiver of arrows.

ABILITIES Hunter's Precision (Attack) A focused arrow that seeks the weakest point of the target, dealing extra damage if the target is surprised. - Damage: 1d10 - Attack Roll: d20 Trapper's Ambush (Attack) Rapid twin shots that strike from concealment, with a chance to apply a crippling effect. - Damage: 1d8 - Bonus: 1d4 - Attack Roll: d20 - Attacks: x2 Wilderness Ward (Healing) A soothing burst of natural energy that heals the ranger or an ally within sight. - Healing: 1d8+2 Camouflage Veil (Attack) A quick strike that blends with the surroundings, dealing damage automatically and granting advantage on the next attack. - Damage: 1d6 - Attack Roll: Automatic Echoing Call (Healing) Summons the spirits of the forest to mend wounds of nearby allies. - Healing: 2d4+1 2025 OpenRAG

=== DevRel_erator_Character_Sheet.pdf ===


DevRel-erator Custom Hero IMAGE GENERATION DETAILS Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, crisp sprite outlines, dithered shading, low-resolution retro fantasy aesthetic. DevRel-erator, the charismatic boss who wields the power of demos and presentations, exudes a confident yet slightly surprised demeanor, and commands the battlefield with polished charisma. He wears an NPM/MCP t-shirt and is standing in front of a demo screen speaking to an audience. The screen has js code on it.??small stature and build?Apparent age: He appears to be in his mid-40s to early 50s.??Nose: His nose is straight with a slightly rounded tip and defined bridge.??Mustache: A small, neatly trimmed mustache that runs the full width of his upper lip. It has a natural shape without stylized edges.??Jawline & Chin: A moderately angular jawline with light stubble. His chin is rounded but pronounced enough to give shape to his lower face.??Skin tone: Light complexion., depicted in a distinctly medieval high-fantasy world. Placed in a medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Retro SNES/Genesis style, no modern objects or technology. Cinematic composition. --style raw CHARACTER DETAILS Race: n/a Sex: n/a STATISTICS HP: 28/28 AC: 15 ATK: +4 DMG: d8

DESCRIPTION DevRel-erator, the charismatic boss who wields the power of demos and presentations, exudes a confident yet slightly surprised demeanor, and commands the battlefield with polished charisma. ABILITIES Demo Blast (Attack) Unleashes a burst of code that stuns the enemy. - Damage: 2d8 - Attack Roll: d20 Slide Slide (Attack) Slides a slide across the battlefield, dealing extra damage to those who can't keep up. - Damage: 1d10 - Bonus: 1d4 - Attack Roll: d20 Audience Applause (Healing) The crowd cheers, restoring vitality. - Healing: 2d6+2 Pep Talk (Healing) A pep talk that heals allies and boosts morale. - Healing: 1d8+4 2025 OpenRAG

=== Scanlan_Character_Sheet.pdf ===


Scanlan Custom Hero IMAGE GENERATION DETAILS Setting/Theme: Medieval Fantasy Description: Classic medieval high-fantasy setting with castles, magic, and ancient ruins Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, dithered shading, low-resolution retro medieval high-fantasy aesthetic. Gnome male A charismatic male gnome (clean shaven, young) bard with a flamboyant style, standing short with a lean build, sporting dark hair and mischievous eyes, clad in colorful attire with a lute slung over his shoulder., depicted in a distinctly medieval high-fantasy world. Placed in a expansive medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Position the character in the lower third of the frame, (facing the camera), viewed from a pulled-back wide-angle perspective showing expansive landscape surrounding them. The character should occupy only 60-70% of the composition, with dominant landscape and sky filling the remainder. Retro SNES/Genesis style, no modern objects or technology. CHARACTER DETAILS Race: Gnome Sex: male STATISTICS HP: 25/25 AC: 15 ATK: +4 DMG: d8

DESCRIPTION A charismatic male (clean shaven, young) gnome bard with a flamboyant style, standing short with a lean build, sporting dark hair and mischievous eyes, clad in colorful attire with a lute slung over his shoulder. ABILITIES Scanlan's Hand (Attack) A powerful magical hand that can crush enemies with a mighty grip, summoned by Scanlan's charismatic performance. - Damage: 4d8 - Attack Roll: d20 Bardic Inspiration (Healing) Scanlan plays a rousing tune on his lute, inspiring allies and restoring their vitality. - Healing: 1d8+3 Flamboyant Flourish (Attack) With a dramatic spin and a strum of his lute, Scanlan dazzles his foes, dealing extra damage with his flamboyant style. - Damage: 2d6 - Bonus: 1d6 - Attack Roll: d20 Mischievous Melody (Attack) A playful tune that causes enemies to stumble and falter, dealing automatic damage as they lose their balance. - Damage: 1d10 - Attack Roll: Automatic 2025 OpenRAG

=== Scuba_Instructor_Character_Sheet.pdf ===


Scuba Instructor Custom Hero IMAGE GENERATION DETAILS Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, crisp sprite outlines, dithered shading, low-resolution retro fantasy aesthetic. A female scuba diver in a white suit and pink fins, wielding a knife. Wearing a BC vest and scuba rig with a regulator. Underwater swimming by a reef., depicted in a distinctly medieval high-fantasy world. Placed in a medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Retro SNES/Genesis style, no modern objects or technology. Cinematic composition. --style raw CHARACTER DETAILS Race: n/a Sex: n/a STATISTICS HP: 28/28 AC: 15 ATK: +4 DMG: d8 DESCRIPTION A cheerful female scuba diver in a white suit and pink fins, wielding a knife, who uses fin kicks, holds underwater, creates bubble rings, and rescues allies. ABILITIES

Fin Kick (Attack) A swift fin kick that delivers a bludgeoning blow. - Damage: 1d8 - Attack Roll: d20 Bubble Ring (Attack) Creates a bubble ring that bursts on impact, dealing splash damage. - Damage: 2d6 - Bonus: 1d4 - Attack Roll: d20 Hold Underwater (Attack) A grappling fin that holds the target underwater, restraining them. - Damage: 1d6 - Attack Roll: d20 Rescue (Healing) A quick rescue maneuver that heals allies. - Healing: 2d8+2 Steal Regulator (Attack) Steals breathing apparatus from another player - Damage: 1d12 - Attack Roll: d20 2025 OpenRAG

=== Merry_the_Minstrel_Character_Sheet.pdf ===


Merry the Minstrel Custom Hero IMAGE GENERATION DETAILS Setting/Theme: Medieval Fantasy Description: Classic medieval high-fantasy setting with castles, magic, and ancient ruins Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, dithered shading, low-resolution retro medieval high-fantasy aesthetic. Stout Halfling male A charismatic bard known for enchanting melodies and captivating tales. Merry stands at an average height with a slender build, sporting wavy auburn hair that cascades to his shoulders and bright green eyes that twinkle with mischief. He wears a vibrant tunic adorned with intricate patterns, a leather vest, and carries a lute slung across his back. His fingers are adorned with silver rings, and a dagger is sheathed at his side, hinting at his readiness for adventure., depicted in a distinctly medieval high-fantasy world. Placed in a expansive medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Position the character in the lower third of the frame, (facing the camera), viewed from a pulled-back wide-angle perspective showing expansive landscape surrounding them. The character should occupy only 40-50% of the composition, with dominant landscape and sky filling the remainder. Retro SNES/Genesis style, no modern objects or technology. CHARACTER DETAILS Race: Stout Halfling Sex: male STATISTICS HP: 28/28 AC: 15 ATK: +4

DMG: d8 DESCRIPTION A charismatic bard known for enchanting melodies and captivating tales. Merry stands at an average height with a slender build, sporting wavy auburn hair that cascades to his shoulders and bright green eyes that twinkle with mischief. He wears a vibrant tunic adorned with intricate patterns, a leather vest, and carries a lute slung across his back. His fingers are adorned with silver rings, and a dagger is sheathed at his side, hinting at his readiness for adventure. ABILITIES Melodic Strike (Attack) Merry strikes with a musical flourish, using his instrument as a weapon. - Damage: 1d8 - Attack Roll: d20 Song of Healing (Healing) Merry plays a soothing melody that heals the wounds of his allies. - Healing: 2d4+2 Harmonic Echo (Attack) A resonant chord that echoes through the battlefield, dealing extra damage to a single target. - Damage: 1d6 - Bonus: 1d6 - Attack Roll: d20 Inspiring Anthem (Healing) Merry's rousing anthem invigorates his allies, restoring their vitality. - Healing: 1d8+3 Discordant Chord (Attack) A jarring note that disrupts the enemy's focus, causing significant damage. - Damage: 2d6 - Attack Roll: d20 2025 OpenRAG

=== Azar_Character_Sheet.pdf ===


Azar Custom Hero IMAGE GENERATION DETAILS Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, crisp sprite outlines, dithered shading, low-resolution retro fantasy aesthetic. Azar is a16?year?old mischievous female who moves as fast as light and boasts high armor., isolated character sprite, no background scene, no environment, no setting. Rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Retro SNES/Genesis style. Centered composition, transparent background. --style raw CHARACTER DETAILS Race: n/a Sex: n/a STATISTICS HP: 25/25 AC: 16 ATK: +4 DMG: d8 DESCRIPTION Azar is a16?year?old mischievous female who moves as fast as light and boasts high armor. ABILITIES

Lightstep Dash (Attack) Azar darts forward at the speed of light, striking her target with a burst of radiant energy. - Damage: 1d8+2 - Bonus: 1d4 - Attack Roll: d20 Photon Blade (Attack) She summons a blade of pure photon, slicing through armor with ease. - Damage: 2d6 - Bonus: 1d6 - Attack Roll: d20 Mischief's Glee (Healing) A playful burst of light heals Azar, restoring her vigor. - Healing: 1d6+3 Radiant Shield (Healing) A shimmering barrier of light mends her wounds and bolsters her defenses. - Healing: 1d8+2 2025 OpenRAG

=== Whisper_Nightshade_Character_Sheet.pdf ===


Whisper Nightshade Hero IMAGE GENERATION DETAILS Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, crisp sprite outlines, dithered shading, low-resolution retro fantasy aesthetic. Rogue Tortle: A turtle-like race with a natural shell for protection and a connection to water.. A stealthy combatant who strikes from the shadows., depicted in a distinctly medieval high-fantasy world. Placed in a medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Retro SNES/Genesis style, no modern objects or technology. Cinematic composition. --style raw CHARACTER DETAILS Race: Genasi Sex: other STATISTICS HP: 28/28 AC: 15 ATK: +4 DMG: d6 DESCRIPTION A stealthy combatant who strikes from the shadows. ABILITIES

Shadow Strike (Attack) A precise attack from the shadows, dealing extra damage when the target is unaware. - Damage: 1d8 - Bonus: 2d6 - Attack Roll: d20 Vanish (Attack) Disappear into the shadows and reappear behind the enemy, delivering an automatic strike. - Damage: 1d6 - Attack Roll: Automatic Silent Blade (Attack) A quick and silent attack that leaves the enemy unaware of the source. - Damage: 2d4 - Attack Roll: d20 Shadow's Embrace (Healing) Harness the shadows to heal minor wounds, restoring vitality while remaining hidden. - Healing: 1d8+2 2025 OpenRAG

=== Shadowstrike_Character_Sheet.pdf ===


Shadowstrike Custom Hero IMAGE GENERATION DETAILS Setting/Theme: Medieval Fantasy Description: Classic medieval high-fantasy setting with castles, magic, and ancient ruins Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, dithered shading, low-resolution retro medieval high-fantasy aesthetic. Half-Elf female Shadowstrike Stout Halfling: A hardy halfling with resistance to poison and a strong constitution.. A stealthy combatant who strikes from the shadows, using agility and precision to outmaneuver foes., depicted in a distinctly medieval high-fantasy world. Placed in a expansive medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Position the character in the lower third of the frame, (facing the camera), viewed from a pulled-back wide-angle perspective showing expansive landscape surrounding them. The character should occupy only 60-70% of the composition, with dominant landscape and sky filling the remainder. Retro SNES/Genesis style, no modern objects or technology. CHARACTER DETAILS Race: Half-Elf Sex: female STATISTICS HP: 28/28 AC: 16 ATK: +4 DMG: d8

DESCRIPTION A stealthy combatant who strikes from the shadows, using agility and precision to outmaneuver foes. ABILITIES Shadow Strike (Attack) A precise attack from the shadows, dealing extra damage when the target is unaware. - Damage: 2d6 - Bonus: 1d6 - Attack Roll: d20 Evasive Maneuver (Attack) A rapid series of strikes that allows Shadowstrike to hit twice in quick succession. - Damage: 1d8 - Attack Roll: d20 - Attacks: x2 Veil of Shadows (Healing) Harness the shadows to mend wounds, providing a quick burst of healing. - Healing: 1d8+2 Silent Ambush (Attack) An automatic strike from hiding, catching the enemy completely off guard. - Damage: 3d6 - Attack Roll: Automatic 2025 OpenRAG

=== Simon_Starkiller_Character_Sheet.pdf ===


Simon Starkiller Custom Hero IMAGE GENERATION DETAILS Generation Prompt: 32-bit pixel art with clearly visible chunky pixel clusters, crisp sprite outlines, dithered shading, low-resolution retro fantasy aesthetic. Simon Starkiller, a late-20s hero wielding a laser sword, protected by a puffy jacket that grants extra armor.??Apparent age: He appears to be in his late 20s to mid-30s.??Facial features: He has a well-groomed mustache and a short beard along the jawline. His eyebrows are dark and fairly straight, and he has a defined jaw and cheek structure.??Hair: Dark hair, cut short on the sides with a fade, and longer on top, styled naturally.??Expression/posture: He's looking slightly upward and to his right with a calm, thoughtful, and confident expression.??Skin tone: Light complexion., depicted in a distinctly medieval high-fantasy world. Placed in a medieval high-fantasy setting, rendered with simplified tile-like textures and deliberate low-color shading. Use a cohesive warm earth tones with vibrant accents palette. Retro SNES/Genesis style, no modern objects or technology. Cinematic composition. --style raw CHARACTER DETAILS Race: n/a Sex: n/a STATISTICS HP: 28/28 AC: 15 ATK: +4 DMG: d8

DESCRIPTION Simon Starkiller, a late-20s hero wielding a laser sword, protected by a puffy jacket that grants extra armor. ABILITIES Laser Slash (Attack) A blazing laser sword strike that sears enemies with a burst of radiant energy. - Damage: 2d8 - Bonus: 1d6 - Attack Roll: d20 Puffy Shield (Healing) The puffy jacket radiates a protective warmth, healing allies within its radius. - Healing: 2d6+2 Mustache Whirl (Attack) Spin with razor?sharp mustache, delivering two swift strikes to foes. - Damage: 1d10 - Attack Roll: d20 - Attacks: x2 Calm Resolve (Healing) A calm, thoughtful breath that restores vitality to the hero and nearby allies. - Healing: 1d8+3 2025 OpenRAG`;

console.log('🔢 Token Counting with Tiktoken\n');
console.log('═'.repeat(60));

try {
  // Use GPT-4o encoding (most accurate for modern models)
  const encoder = encodingForModel('gpt-4o');
  
  // Encode the text
  const tokens = encoder.encode(text);
  const tokenCount = tokens.length;
  
  // Calculate statistics
  const charCount = text.length;
  const charsPerToken = (charCount / tokenCount).toFixed(2);
  
  console.log('\n📊 Results:');
  console.log('─'.repeat(60));
  console.log(`Character count: ${charCount.toLocaleString()}`);
  console.log(`Token count:     ${tokenCount.toLocaleString()}`);
  console.log(`Chars/token:     ${charsPerToken}`);
  console.log('─'.repeat(60));
  
  // Show first few tokens as example
  console.log('\n🔍 First 20 tokens (as example):');
  const firstTokens = tokens.slice(0, 20);
  const decodedFirst = encoder.decode(new Uint32Array(firstTokens));
  console.log(`"${decodedFirst}"`);
  
  console.log('\n✅ Token counting complete!');
  
  // Free the encoder
  encoder.free();
  
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

// Made with Bob
