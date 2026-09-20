#!/usr/bin/env python3
"""
Candidate Batch Definition and Orchestrator for Jev System 1 Ingestion.
Feeds 120 diverse blocks and mobs into validate_and_enrich_with_jev.py
"""
import json
import pathlib
import sys
from concurrent.futures import ThreadPoolExecutor

from validate_and_enrich_with_jev import (
    ROOT, DATA_FILE, ASSET_FILE, process_candidate
)

CANDIDATES = [
    # === Immersive Engineering Heavy Machinery & Multiblocks ===
    {"id": "immersiveengineering:arc_furnace", "name": "Arc Furnace", "mod": "Immersive Engineering", "description": "A massive multiblock machine that uses consumable graphite electrodes and immense electrical power to smelt steel and high-tier alloys.", "wikiFile": "File:Block Arc Furnace.png"},
    {"id": "immersiveengineering:crusher", "name": "Crusher", "mod": "Immersive Engineering", "description": "A heavy industrial grinder multiblock powered by electricity that pulverizes raw ores into dusts for doubled processing yield.", "wikiFile": "File:Block Crusher (Immersive Engineering).png"},
    {"id": "immersiveengineering:diesel_generator", "name": "Diesel Generator", "mod": "Immersive Engineering", "description": "A massive nine-block combustion engine multiblock that burns biodiesel and refined fuels to produce high-voltage power.", "wikiFile": "File:Block Diesel Generator (Immersive Engineering).png"},
    {"id": "immersiveengineering:metal_press", "name": "Metal Press", "mod": "Immersive Engineering", "description": "An automated multiblock stamping machine that utilizes interchangeable molding plates and conveyors to shape ingots into plates, wires, and gears.", "wikiFile": "File:Block Metal Press.png"},
    {"id": "immersiveengineering:dynamo", "name": "Kinetic Dynamo", "mod": "Immersive Engineering", "description": "Converts mechanical rotational kinetic energy into electrical power when driven from its front face by connected water wheels.", "wikiFile": "File:Block Kinetic Dynamo.png"},
    {"id": "immersiveengineering:heavy_engineering", "name": "Heavy Engineering Block", "mod": "Immersive Engineering", "description": "A durable structural component block crafted from steel and pistons, serving as a core foundation for industrial multiblock machinery.", "wikiFile": "File:Block Heavy Engineering Block.png"},
    {"id": "immersiveengineering:light_engineering", "name": "Light Engineering Block", "mod": "Immersive Engineering", "description": "A mechanical framing block crafted with iron and copper components, utilized extensively in lighter multiblock machine assemblies.", "wikiFile": "File:Block Light Engineering Block (Immersive Engineering).png"},
    {"id": "immersiveengineering:rs_engineering", "name": "Redstone Engineering Block", "mod": "Immersive Engineering", "description": "A specialized control block combining redstone circuitry with iron sheetmetal, providing logic control in formed multiblocks.", "wikiFile": "File:Block Redstone Engineering Block.png"},
    {"id": "immersiveengineering:radiator", "name": "Radiator Block", "mod": "Immersive Engineering", "description": "A heat-dissipating structural block constructed from steel plates and copper coils, required for diesel generator cooling arrays.", "wikiFile": "File:Block Radiator Block.png"},
    {"id": "immersiveengineering:thermoelectric_generator", "name": "Thermoelectric Generator", "mod": "Immersive Engineering", "description": "Produces passive electrical energy via the Seebeck effect when placed between contrasting hot and cold temperature gradients.", "wikiFile": "File:Block Thermoelectric Generator.png"},
    {"id": "immersiveengineering:coke_oven", "name": "Coke Oven", "mod": "Immersive Engineering", "description": "A primitive three-by-three multiblock assembled from coke bricks that bakes coal into coal coke fuel while collecting creosote oil.", "wikiFile": "File:Block Coke Oven (Immersive Engineering).png"},
    {"id": "immersiveengineering:blast_furnace", "name": "Crude Blast Furnace", "mod": "Immersive Engineering", "description": "A refractory brick furnace multiblock that smelts iron into steel ingots and slag using coal coke without requiring electricity.", "wikiFile": "File:Block Crude Blast Furnace.png"},

    # === Tinkers' Construct Smeltery & Metallurgy ===
    {"id": "tconstruct:smeltery_controller", "name": "Smeltery Controller", "mod": "Tinkers' Construct", "description": "The command block of the Smeltery multiblock structure, burning lava to melt raw metals and ores into liquid alloys.", "wikiFile": "File:Block Smeltery Controller.png"},
    {"id": "tconstruct:seared_drain", "name": "Seared Drain", "mod": "Tinkers' Construct", "description": "A channeled fluid interface block embedded in the Smeltery wall that outputs molten metals into casting faucets, tables, and basins.", "wikiFile": "File:Block Seared Drain.png"},
    {"id": "tconstruct:seared_tank", "name": "Seared Tank", "mod": "Tinkers' Construct", "description": "A heat-resistant glass and stone reservoir holding lava to fuel the Smeltery or store molten metallic alloys.", "wikiFile": "File:Block Seared Tank.png"},
    {"id": "tconstruct:casting_table", "name": "Casting Table", "mod": "Tinkers' Construct", "description": "A stone pedestal that accepts reusable sand or gold casts to pour molten metal into pickaxe heads, sword blades, and tool parts.", "wikiFile": "File:Block Casting Table.png"},
    {"id": "tconstruct:casting_basin", "name": "Casting Basin", "mod": "Tinkers' Construct", "description": "A large rectangular stone vat that cools full liquid metal volumes into solid storage blocks of iron, bronze, and manyullyn.", "wikiFile": "File:Block Casting Basin.png"},
    {"id": "tconstruct:seared_glass", "name": "Seared Glass", "mod": "Tinkers' Construct", "description": "A transparent high-durability viewing window that withstands extreme furnace heat and seamlessly integrates into Smeltery multiblock walls.", "wikiFile": "File:Block Seared Glass.png"},
    {"id": "tconstruct:seared_bricks", "name": "Seared Bricks", "mod": "Tinkers' Construct", "description": "Heat-treated refractory masonry blocks forming the floor, walls, and interior molten reservoir of the modular Smeltery.", "wikiFile": "File:Block Seared Bricks.png"},
    {"id": "tconstruct:part_builder", "name": "Part Builder", "mod": "Tinkers' Construct", "description": "A specialized carpentry station that carves wood, stone, flint, and bone materials into modular tool components using patterns.", "wikiFile": "File:Block Part Builder.png"},
    {"id": "tconstruct:tinker_station", "name": "Tinker Station", "mod": "Tinkers' Construct", "description": "The primary assembly anvil where crafted tool heads, handles, and bindings are combined into customizable pickaxes, broadswords, and axes.", "wikiFile": "File:Block Tinker Station.png"},
    {"id": "tconstruct:crafting_station", "name": "Crafting Station", "mod": "Tinkers' Construct", "description": "An upgraded crafting workbench that retains its crafting grid contents when closed and interfaces with adjacent inventory chests.", "wikiFile": "File:Block Crafting Station.png"},

    # === Thermal Expansion Advanced Industrial Machines ===
    {"id": "thermalexpansion:phytogenic_insolator", "name": "Phytogenic Insolator", "mod": "Thermal Expansion", "description": "An RF-powered horticultural chamber that rapidly cultivates crops, trees, and magical flora using water and Phyto-Gro fertilizer.", "wikiFile": "File:Block Phytogenic Insolator.png"},
    {"id": "thermalexpansion:centrifugal_separator", "name": "Centrifugal Separator", "mod": "Thermal Expansion", "description": "A high-speed industrial centrifuge that separates complex mixtures, fluids, and raw ores into clean constituent byproducts.", "wikiFile": "File:Block Centrifugal Separator.png"},
    {"id": "thermalexpansion:fractionating_still", "name": "Fractionating Still", "mod": "Thermal Expansion", "description": "A fractional distillation tower that refines heavy crude oils and bio-fluids into high-octane fuels, light naphtha, and lubricants.", "wikiFile": "File:Block Fractionating Still.png"},
    {"id": "thermalexpansion:compactor", "name": "Compactor", "mod": "Thermal Expansion", "description": "An industrial hydraulic press that stamps metal ingots into dense plates, gears, and structural coins with high electrical efficiency.", "wikiFile": "File:Block Compactor.png"},
    {"id": "thermalexpansion:alchemical_imbuer", "name": "Alchemical Imbuer", "mod": "Thermal Expansion", "description": "An automated brewing vat that infuses liquid reagents and essences to mass-produce potions, splash brews, and lingering concoctions.", "wikiFile": "File:Block Alchemical Imbuer.png"},
    {"id": "thermalexpansion:resonant_cell", "name": "Resonant Energy Cell", "mod": "Thermal Expansion", "description": "The highest tier Redstone Flux energy storage accumulator, holding 40,000,000 RF with configurable multi-face I/O transfer rates.", "wikiFile": "File:Block Resonant Energy Cell.png"},
    {"id": "thermalexpansion:portable_tank", "name": "Portable Tank", "mod": "Thermal Expansion", "description": "A modular fluid containment cylinder that retains its stored liquids when harvested, stacking vertically to form multi-block columns.", "wikiFile": "File:Block Portable Tank.png"},
    {"id": "thermalexpansion:tesseract", "name": "Tesseract", "mod": "Thermal Expansion", "description": "An interdimensional frequency-locked relay capable of instantly transmitting energy, fluids, and items across infinite distances wirelessly.", "wikiFile": "File:Block Tesseract.png"},
    {"id": "thermalexpansion:energy_infuser", "name": "Energy Infuser", "mod": "Thermal Expansion", "description": "An inductive charging station that rapidly replenishes energy reserves in RF-powered flux capacitors, tools, armor, and weapons.", "wikiFile": "File:Block Energy Infuser.png"},
    {"id": "thermalexpansion:aqueous_accumulator", "name": "Aqueous Accumulator", "mod": "Thermal Expansion", "description": "An automated water collection pump that generates an infinite passive water supply without power when placed between two water source blocks.", "wikiFile": "File:Block Aqueous Accumulator.png"},
    {"id": "thermalexpansion:decoctive_diffuser", "name": "Decoctive Diffuser", "mod": "Thermal Expansion", "description": "An atmospheric dispersal unit that aerosolizes potion fluids into wide ambient status effect clouds for defensive or restorative fields.", "wikiFile": "File:Block Decoctive Diffuser.png"},

    # === Applied Energistics 2 Quantum & Spatial Logistics ===
    {"id": "appliedenergistics2:quantum_link", "name": "Quantum Link Chamber", "mod": "AE2", "description": "The central receiver of the Quantum Network Bridge multiblock that holds an Entangled Singularity to bridge ME networks across dimensions.", "wikiFile": "File:Block Quantum Link Chamber.png"},
    {"id": "appliedenergistics2:quantum_ring", "name": "Quantum Ring", "mod": "AE2", "description": "Forms the eight-block outer ring around the Quantum Link Chamber, routing power, channels, and dense cables into the quantum bridge.", "wikiFile": "File:Block Quantum Ring.png"},
    {"id": "appliedenergistics2:spatial_pylon", "name": "Spatial Pylon", "mod": "AE2", "description": "Defines the boundary planes of a Spatial IO containment field, powering the dimensional displacement of physical blocks into Spatial Cells.", "wikiFile": "File:Block Spatial Pylon.png"},
    {"id": "appliedenergistics2:security_station", "name": "ME Security Terminal", "mod": "AE2", "description": "Registers biometric player security cards and links wireless terminals to manage user permissions and access rights on an ME network.", "wikiFile": "File:Block Security Terminal.png"},
    {"id": "appliedenergistics2:crafting_monitor", "name": "ME Crafting Monitor", "mod": "AE2", "description": "A visual status display block integrated into an ME Crafting CPU that displays real-time item counts and remaining progress for crafting jobs.", "wikiFile": "File:Block Crafting Monitor.png"},
    {"id": "appliedenergistics2:molecular_assembler", "name": "Molecular Assembler", "mod": "AE2", "description": "An automated robotic fabricator that instantly crafts patterned items using energy and items provided by attached ME Pattern Providers.", "wikiFile": "File:Block Molecular Assembler.png"},
    {"id": "appliedenergistics2:vibration_chamber", "name": "Vibration Chamber", "mod": "AE2", "description": "A thermal furnace generator that burns solid fuels to generate AE network energy, dissipating heat and scaling power output dynamically.", "wikiFile": "File:Block Vibration Chamber.png"},
    {"id": "appliedenergistics2:dense_energy_cell", "name": "Dense Energy Cell", "mod": "AE2", "description": "An ultra-capacity energy accumulator holding 1.6M AE energy units to absorb heavy power spikes from spatial drives and auto-crafting CPUs.", "wikiFile": "File:Block Dense Energy Cell.png"},
    {"id": "appliedenergistics2:quartz_glass", "name": "Quartz Glass", "mod": "AE2", "description": "A reinforced translucent structural glass crafted from pulverized certus quartz dust, utilized in high-tier storage housings.", "wikiFile": "File:Block Quartz Glass.png"},
    {"id": "appliedenergistics2:charger", "name": "Charger", "mod": "AE2", "description": "A motorized charging dock that infuses Certus Quartz crystals with energy to produce Charged Certus Quartz and powers hand-held AE tools.", "wikiFile": "File:Block Charger.png"},

    # === Create Mod Kinetic Additions ===
    {"id": "create:elevator_pulley", "name": "Elevator Pulley", "mod": "Create", "description": "A kinetic winding spool that hoists attached carriage contraptions vertically using ropes, supporting multi-floor elevator networks.", "wikiFile": "File:Block Elevator Pulley.png"},
    {"id": "create:portable_storage_interface", "name": "Portable Storage Interface", "mod": "Create", "description": "A logistic docking pad that temporarily connects moving train and cart contraption inventories to stationary factory belt networks.", "wikiFile": "File:Block Portable Storage Interface.png"},
    {"id": "create:redstone_link", "name": "Redstone Link", "mod": "Create", "description": "A wireless redstone transmitter and receiver tuned using two dual-item frequency channels to broadcast signals without wiring.", "wikiFile": "File:Block Redstone Link.png"},
    {"id": "create:pulse_repeater", "name": "Pulse Repeater", "mod": "Create", "description": "A compact redstone logic gate that transforms sustained input signals into single calibrated one-tick output pulses.", "wikiFile": "File:Block Pulse Repeater.png"},
    {"id": "create:powered_latch", "name": "Powered Latch", "mod": "Create", "description": "A bistable redstone flip-flop memory latch that toggles between active and inactive states upon receiving separate set and reset pulses.", "wikiFile": "File:Block Powered Latch.png"},
    {"id": "create:track_switch", "name": "Track Switch", "mod": "Create", "description": "A railway junction mechanism that steers advancing train locomotives onto diverging track branches via redstone or manual switching.", "wikiFile": "File:Block Track Switch.png"},
    {"id": "create:smart_chute", "name": "Smart Chute", "mod": "Create", "description": "A vertical item dropper tube equipped with a filtering window and stack extraction regulation to govern downward item transfers.", "wikiFile": "File:Block Smart Chute.png"},
    {"id": "create:brass_tunnel", "name": "Brass Tunnel", "mod": "Create", "description": "An intelligent conveyor cover that sorts, splits, synchronizes, and routes item flows across multiple parallel conveyor lines.", "wikiFile": "File:Block Brass Tunnel.png"},
    {"id": "create:andesite_tunnel", "name": "Andesite Tunnel", "mod": "Create", "description": "A rugged stone belt enclosure that covers conveyor lines, preventing external entity interference and keeping item transit orderly.", "wikiFile": "File:Block Andesite Tunnel.png"},
    {"id": "create:clockwork_bearing", "name": "Clockwork Bearing", "mod": "Create", "description": "A precision rotational bearing that rotates connected structures like clock hands, precisely synchronized to the in-game sun and moon.", "wikiFile": "File:Block Clockwork Bearing.png"},

    # === Botania Exotic Mana & Terrasteel Crafting ===
    {"id": "botania:terra_plate", "name": "Terrestrial Agglomeration Plate", "mod": "Botania", "description": "A stone ritual plate placed above Livingrock that absorbs vast mana through Sparks to forge Manasteel and diamonds into Terrasteel ingots.", "wikiFile": "File:Block Terrestrial Agglomeration Plate.png"},
    {"id": "botania:elven_gateway_core", "name": "Elven Gateway Core", "mod": "Botania", "description": "The central nexus block of the Portal to Alfheim multiblock that stabilizes trans-dimensional trade with the distant elven civilization.", "wikiFile": "File:Block Elven Gateway Core.png"},
    {"id": "botania:natura_pylon", "name": "Natura Pylon", "mod": "Botania", "description": "A crystalline mana focusing pylon placed atop Mana Pools to open and maintain the stable interdimensional portal to Alfheim.", "wikiFile": "File:Block Natura Pylon.png"},
    {"id": "botania:gaia_pylon", "name": "Gaia Pylon", "mod": "Botania", "description": "An advanced ritual pylon infused with Elementium and Pixie Dust, placed around active Beacons to summon the formidable Guardian of Gaia boss.", "wikiFile": "File:Block Gaia Pylon.png"},
    {"id": "botania:livingrock", "name": "Livingrock", "mod": "Botania", "description": "Stone infused with mystical botanical energy by a Pure Daisy, serving as the foundational crafting material for all Botania devices.", "wikiFile": "File:Block Livingrock.png"},
    {"id": "botania:shimmerrock", "name": "Shimmerrock", "mod": "Botania", "description": "An iridescent luminescent stone transmuted by throwing Livingrock into a catalyst-boosted Mana Pool, used in high-tier elven architecture.", "wikiFile": "File:Block Shimmerrock.png"},
    {"id": "botania:corporea_index", "name": "Corporea Index", "mod": "Botania", "description": "A floating telepathic inventory terminal that listens to nearby player chat commands to automatically extract items from linked corporea chests.", "wikiFile": "File:Block Corporea Index.png"},
    {"id": "botania:rosa_arcana", "name": "Rosa Arcana", "mod": "Botania", "description": "A generating flower that siphons nearby player experience levels and converts raw knowledge into substantial surges of mana.", "wikiFile": "File:Block Rosa Arcana.png"},
    {"id": "botania:kekimurus", "name": "Kekimurus", "mod": "Botania", "description": "A voracious generating flower that devours placed cake slices in its vicinity to generate immense bursts of mana for adjacent spreaders.", "wikiFile": "File:Block Kekimurus.png"},
    {"id": "botania:dandelifeon", "name": "Dandelifeon", "mod": "Botania", "description": "An intricate endgame generating flower that simulates cellular automata on a 25x25 grid, generating massive mana when elder cells reach its center.", "wikiFile": "File:Block Dandelifeon.png"},

    # === Thaumcraft Arcane Devices & Relics ===
    {"id": "thaumcraft:arcane_levitator", "name": "Arcane Levitator", "mod": "Thaumcraft", "description": "An enchanted propulsion apparatus that emits an upward vertical beam of mystical air, gently lifting players and entities through multi-floor towers.", "wikiFile": "File:Block Arcane Levitator (Thaumcraft 4).png"},
    {"id": "thaumcraft:essentia_mirror", "name": "Essentia Mirror", "mod": "Thaumcraft", "description": "A paired trans-dimensional magical looking-glass that teleports distilled liquid essentia directly across space to infusion altars without piping.", "wikiFile": "File:Block Essentia Mirror.png"},
    {"id": "thaumcraft:vis_relay", "name": "Vis Relay", "mod": "Thaumcraft", "description": "A chiseled crystal node that connects local aura conduits, beaming ambient vis energy through the air between workbenches and stabilizers.", "wikiFile": "File:Block Vis Relay.png"},
    {"id": "thaumcraft:node_stabilizer", "name": "Node Stabilizer", "mod": "Thaumcraft", "description": "A heavy runic iron cradle placed beneath magical aura nodes to prevent them from fading, corrupting, or being damaged by over-drawing.", "wikiFile": "File:Block Node Stabilizer.png"},
    {"id": "thaumcraft:void_metal_block", "name": "Void Metal Block", "mod": "Thaumcraft", "description": "A dark alien metallic block forged from void seeds extracted from eldritch outer realms, featuring self-repairing properties and high warp aura.", "wikiFile": "File:Block Void Metal Block.png"},
    {"id": "thaumcraft:nitor", "name": "Nitor", "mod": "Thaumcraft", "description": "A magical floating eternal flame that emits permanent maximum luminance level 15 without consuming fuel or burning adjacent combustible blocks.", "wikiFile": "File:Block Nitor.png"},
    {"id": "thaumcraft:amber_block", "name": "Amber Block", "mod": "Thaumcraft", "description": "A polished translucent resin gemstone block crafted from subterranean amber chunks, prized in high-status architectural and runic construction.", "wikiFile": "File:Block Amber Block.png"},
    {"id": "thaumcraft:greatwood_planks", "name": "Greatwood Planks", "mod": "Thaumcraft", "description": "Dense, dark-tinted structural timber sawn from ancient magical Greatwood trees, offering elevated blast resistance and aesthetic richness.", "wikiFile": "File:Block Greatwood Planks.png"},
    {"id": "thaumcraft:silverwood_planks", "name": "Silverwood Planks", "mod": "Thaumcraft", "description": "Pure shimmering white enchanted timber sawn from Silverwood trees, naturally purifying the ambient local aura and resisting magical taint.", "wikiFile": "File:Block Silverwood Planks.png"},
    {"id": "thaumcraft:warded_glass", "name": "Warded Glass", "mod": "Thaumcraft", "description": "Supernaturally reinforced transparent glass that is completely impervious to Wither explosions, TNT blasts, and mining without magical tools.", "wikiFile": "File:Block Warded Glass.png"},

    # === Vanilla 1.20 - 1.21 Trial Chambers & Archeology ===
    {"id": "minecraft:crafter", "name": "Crafter", "mod": "Vanilla", "description": "A redstone-powered automated crafting table that crafts items automatically upon receiving a redstone pulse, configurable with toggled slot locks.", "wikiFile": "File:Crafter.png"},
    {"id": "minecraft:heavy_core", "name": "Heavy Core", "mod": "Vanilla", "description": "An extremely dense, heavy metallic artifact discovered inside ominous trial chamber vaults, combined with a breeze rod to forge the devastating Mace.", "wikiFile": "File:Heavy Core.png"},
    {"id": "minecraft:vault", "name": "Vault", "mod": "Vanilla", "description": "A mysterious locked treasure monument inside Trial Chambers that ejects unique personal loot when unlocked with a Trial Key by each player once.", "wikiFile": "File:Vault.png"},
    {"id": "minecraft:trial_spawner", "name": "Trial Spawner", "mod": "Vanilla", "description": "A challenge spawner in subterranean Trial Chambers that scales monster waves according to player count, ejecting trial keys and rewards upon victory.", "wikiFile": "File:Trial Spawner.png"},
    {"id": "minecraft:copper_grate", "name": "Copper Grate", "mod": "Vanilla", "description": "A decorative ventilated structural block that allows light and water to pass through freely while preventing physical entities from crossing.", "wikiFile": "File:Copper Grate.png"},
    {"id": "minecraft:copper_bulb", "name": "Copper Bulb", "mod": "Vanilla", "description": "A bistable toggleable light block that turns on or off permanently with each redstone pulse, glowing brighter or dimmer depending on oxidation stage.", "wikiFile": "File:Copper Bulb.png"},
    {"id": "minecraft:decorated_pot", "name": "Decorated Pot", "mod": "Vanilla", "description": "An archeological clay vessel crafted from pottery sherds found in trail ruins, storing up to a full stack of items and breaking with projectile hits.", "wikiFile": "File:Decorated Pot.png"},
    {"id": "minecraft:suspicious_sand", "name": "Suspicious Sand", "mod": "Vanilla", "description": "A fragile sedimentary desert block containing hidden ancient artifacts, sniffer eggs, and pottery sherds that can be carefully excavated with a brush.", "wikiFile": "File:Suspicious Sand.png"},
    {"id": "minecraft:chiseled_bookshelf", "name": "Chiseled Bookshelf", "mod": "Vanilla", "description": "A functional wooden bookshelf that physically stores up to six books or enchanted tomes, emitting comparator signals based on the last slotted book.", "wikiFile": "File:Chiseled Bookshelf.png"},

    # === Nether & End Rare Monument Blocks ===
    {"id": "minecraft:respawn_anchor", "name": "Respawn Anchor", "mod": "Vanilla", "description": "Charged with glowstone to establish a respawn location in the Nether dimension, but explodes catastrophically if activated in the Overworld or End.", "wikiFile": "File:Respawn Anchor.png"},
    {"id": "minecraft:crying_obsidian", "name": "Crying Obsidian", "mod": "Vanilla", "description": "A luminous, tear-weeping obsidian variant salvaged from ruined Nether portals, essential as the primary casing for crafting respawn anchors.", "wikiFile": "File:Crying Obsidian.png"},
    {"id": "minecraft:lodestone", "name": "Lodestone", "mod": "Vanilla", "description": "Crafted using netherite ingots and chiseled stone, tuning any compass to point unerringly toward its placed dimensional coordinates.", "wikiFile": "File:Lodestone.png"},
    {"id": "minecraft:soul_campfire", "name": "Soul Campfire", "mod": "Vanilla", "description": "A campfire constructed from soul sand that burns with intense turquoise flames, deterring piglins and dealing double damage to walking mobs.", "wikiFile": "File:Soul Campfire.png"},
    {"id": "minecraft:end_portal_frame", "name": "End Portal Frame", "mod": "Vanilla", "description": "An indestructible stronghold ring monument that holds an Eye of Ender, opening the starry dimensional gateway to the End when twelve are placed.", "wikiFile": "File:End Portal Frame.png"},
    {"id": "minecraft:chorus_flower", "name": "Chorus Flower", "mod": "Vanilla", "description": "A delicate purple blossom that grows atop chorus plants on End islands, shootable with bows to safely harvest without felling the plant stem.", "wikiFile": "File:Chorus Flower.png"},
    {"id": "minecraft:purpur_pillar", "name": "Purpur Pillar", "mod": "Vanilla", "description": "A carved architectural column block manufactured from popped chorus fruit, forming the iconic towering monuments of End Cities.", "wikiFile": "File:Purpur Pillar.png"},
    {"id": "minecraft:shulker_box", "name": "Shulker Box", "mod": "Vanilla", "description": "A revolutionary dimensional storage chest crafted from shulker shells that retains its internal item inventory completely when broken or carried.", "wikiFile": "File:Shulker Box.png"},
    {"id": "minecraft:ender_chest", "name": "Ender Chest", "mod": "Vanilla", "description": "An obsidian storage chest linked to a private, interdimensional personal inventory accessible from any matching container across all dimensions.", "wikiFile": "File:Ender Chest.png"},
    {"id": "minecraft:gilded_blackstone", "name": "Gilded Blackstone", "mod": "Vanilla", "description": "A dark bastion masonry block laced with visible veins of raw gold, dropping gold nuggets when mined and triggering aggressive piglin defense.", "wikiFile": "File:Gilded Blackstone.png"},

    # === Mobs, Nether Hunters & Boss Trophies ===
    {"id": "minecraft:piglin_brute_spawn_egg", "name": "Piglin Brute Spawn Egg", "mod": "Vanilla", "description": "Spawns a ferocious golden-axe wielding bastion defender that charges intruders instantly, refuses to barter, and cannot be distracted by gold.", "wikiFile": "File:Piglin Brute Spawn Egg.png"},
    {"id": "minecraft:zombified_piglin_spawn_egg", "name": "Zombified Piglin Spawn Egg", "mod": "Vanilla", "description": "Spawns an undead golden-sword carrying pigman in the Nether that remains neutral until struck, triggering a terrifying pack-wide swarm frenzy.", "wikiFile": "File:Zombified Piglin Spawn Egg.png"},
    {"id": "minecraft:endermite_spawn_egg", "name": "Endermite Spawn Egg", "mod": "Vanilla", "description": "Spawns a small purple parasitic insectoid that rarely emerges from thrown ender pearls, acting as irresistible hostile bait for Enderman farms.", "wikiFile": "File:Endermite Spawn Egg.png"},
    {"id": "minecraft:cave_spider_spawn_egg", "name": "Cave Spider Spawn Egg", "mod": "Vanilla", "description": "Spawns a miniature venomous subterranean spider native to abandoned mineshafts that slips through compact one-block gaps and inflicts poison.", "wikiFile": "File:Cave Spider Spawn Egg.png"},
    {"id": "minecraft:vex_spawn_egg", "name": "Vex Spawn Egg", "mod": "Vanilla", "description": "Spawns an ethereal winged demon summoned by evokers that phases through solid terrain walls while wielding an iron sword.", "wikiFile": "File:Vex Spawn Egg.png"},
    {"id": "minecraft:bat_spawn_egg", "name": "Bat Spawn Egg", "mod": "Vanilla", "description": "Spawns a tiny nocturnal flying mammal that navigates subterranean caverns and sleeps upside down suspended from ceiling stone blocks.", "wikiFile": "File:Bat Spawn Egg.png"},
    {"id": "minecraft:donkey_spawn_egg", "name": "Donkey Spawn Egg", "mod": "Vanilla", "description": "Spawns a tamable equine pack animal that can be equipped with a saddle and wooden chests to carry mobile storage across wilderness expeditions.", "wikiFile": "File:Donkey Spawn Egg.png"},
    {"id": "minecraft:mule_spawn_egg", "name": "Mule Spawn Egg", "mod": "Vanilla", "description": "Spawns a sterile equine hybrid bred from horse and donkey parents that carries attached chest inventories with swift overland riding speeds.", "wikiFile": "File:Mule Spawn Egg.png"},
    {"id": "minecraft:parrot_spawn_egg", "name": "Parrot Spawn Egg", "mod": "Vanilla", "description": "Spawns a colorful tropical bird that mimics sounds of nearby hostile monsters, perches on player shoulders, and dances to jukebox music discs.", "wikiFile": "File:Parrot Spawn Egg.png"},
    {"id": "minecraft:ocelot_spawn_egg", "name": "Ocelot Spawn Egg", "mod": "Vanilla", "description": "Spawns an elusive jungle predator that gains player trust when offered raw fish and scares away menacing creepers and aerial phantoms.", "wikiFile": "File:Ocelot Spawn Egg.png"},
    {"id": "minecraft:drowned_spawn_egg", "name": "Drowned Spawn Egg", "mod": "Vanilla", "description": "Spawns an underwater undead zombie that swims swiftly through oceans and rivers, hurling deadly loyalty tridents and dropping copper ingots.", "wikiFile": "File:Drowned Spawn Egg.png"},
    {"id": "minecraft:husk_spawn_egg", "name": "Husk Spawn Egg", "mod": "Vanilla", "description": "Spawns a sun-resistant desert mummy zombie that inflicts hunger on melee contact and transforms into a regular zombie if submerged in water.", "wikiFile": "File:Husk Spawn Egg.png"},

    # === Additional Batch to exceed 600+ items ===
    {"id": "minecraft:enchanting_table", "name": "Enchanting Table", "mod": "Vanilla", "description": "A mystic workstation with an obsidian pedestal and floating book that expends player experience levels and lapis to imbue tools with magical enchantments.", "wikiFile": "File:Enchanting Table.png"},
    {"id": "minecraft:brewing_stand", "name": "Brewing Stand", "mod": "Vanilla", "description": "An alchemical heat apparatus fueled by blaze powder that distills Nether wart and potion ingredients into mystical consumable and splash draughts.", "wikiFile": "File:Brewing Stand.png"},
    {"id": "minecraft:beacon", "name": "Beacon", "mod": "Vanilla", "description": "A celestial pyramid apex crystal forged from a Nether Star and obsidian that projects an infinite skyward beam, bestowing permanent status boosts across settlements.", "wikiFile": "File:Beacon.png"},
    {"id": "minecraft:conduit", "name": "Conduit", "mod": "Vanilla", "description": "An underwater oceanic artifact activated by surrounding prismarine rings that grants limitless water breathing, enhanced night vision, and attacks submerged hostiles.", "wikiFile": "File:Conduit.png"},
    {"id": "minecraft:target", "name": "Target", "mod": "Vanilla", "description": "A hay-lined redstone detection block that emits a temporary redstone signal whose strength scales up to 15 proportional to projectile accuracy toward its bullseye.", "wikiFile": "File:Target.png"},
    {"id": "minecraft:daylight_detector", "name": "Daylight Detector", "mod": "Vanilla", "description": "A quartz solar panel sensor that measures ambient celestial light levels, outputting variable redstone power during daylight or inverted night hours.", "wikiFile": "File:Daylight Detector.png"},
    {"id": "minecraft:dispenser", "name": "Dispenser", "mod": "Vanilla", "description": "A motorized mechanical container crafted with a bow that fires arrows, launches fireworks, empties fluid buckets, or places armor on nearby entities when signaled.", "wikiFile": "File:Dispenser.png"},
    {"id": "minecraft:dropper", "name": "Dropper", "mod": "Vanilla", "description": "A simplified redstone mechanical hopper that gently ejects stored inventory items as loose pickups or pushes them directly into adjacent container blocks.", "wikiFile": "File:Dropper.png"},
    {"id": "minecraft:observer", "name": "Observer", "mod": "Vanilla", "description": "A directional optic sensor block that detects state changes and block updates immediately facing its eye, emitting a strong one-tick redstone pulse.", "wikiFile": "File:Observer.png"},
    {"id": "minecraft:piston", "name": "Piston", "mod": "Vanilla", "description": "A wooden mechanical push arm that extends when powered by redstone to push up to twelve adjacent blocks forward along its alignment axis.", "wikiFile": "File:Piston.png"},
    {"id": "minecraft:sticky_piston", "name": "Sticky Piston", "mod": "Vanilla", "description": "A slime-coated mechanical push arm that extends to push blocks and adheres to the front face to pull the attached block backward upon retraction.", "wikiFile": "File:Sticky Piston.png"},
    {"id": "minecraft:hopper", "name": "Hopper", "mod": "Vanilla", "description": "An iron funnel mechanism that funnels falling items into its internal inventory and automatically transfers items between connected chests and furnaces.", "wikiFile": "File:Hopper.png"},
    {"id": "minecraft:note_block", "name": "Note Block", "mod": "Vanilla", "description": "A musical acoustic instrument block that produces pitched musical notes when powered by redstone, changing timbre based on the material block underneath.", "wikiFile": "File:Note Block.png"},
    {"id": "minecraft:jukebox", "name": "Jukebox", "mod": "Vanilla", "description": "An ornate wooden acoustic player that plays collectible music discs throughout the surrounding area, emitting comparator redstone signals based on disc track.", "wikiFile": "File:Jukebox.png"},
    {"id": "minecraft:amethyst_cluster", "name": "Amethyst Cluster", "mod": "Vanilla", "description": "The final luminous growth stage of crystalline amethyst that forms on budding amethyst blocks, dropping four amethyst shards when harvested with an iron pickaxe.", "wikiFile": "File:Amethyst Cluster.png"},
    {"id": "minecraft:budding_amethyst", "name": "Budding Amethyst", "mod": "Vanilla", "description": "A delicate subterranean geode core block that periodically sprouts growing amethyst crystals on its faces, dropping nothing if broken even with Silk Touch.", "wikiFile": "File:Budding Amethyst.png"},
    {"id": "minecraft:mud_bricks", "name": "Mud Bricks", "mod": "Vanilla", "description": "Refined structural masonry bricks manufactured from compacted clay mud and wheat straw, offering warm earth-toned architectural aesthetics.", "wikiFile": "File:Mud Bricks.png"},
    {"id": "minecraft:mangrove_roots", "name": "Mangrove Roots", "mod": "Vanilla", "description": "Dense fibrous organic root blocks supporting swamp mangrove trees that can be waterlogged and provide distinctive organic structural scaffolding.", "wikiFile": "File:Mangrove Roots.png"},
    {"id": "minecraft:sculk_vein", "name": "Sculk Vein", "mod": "Vanilla", "description": "Luminescent creeping tendrils that sprawl across subterranean cave surfaces around deep dark catalysts, transmitting vibrations along connected stone.", "wikiFile": "File:Sculk Vein.png"},

    # === Mekanism High-Tech Additions ===
    {"id": "mekanism:fission_reactor_casing", "name": "Fission Reactor Casing", "mod": "Mekanism", "description": "Heavy lead-lined radiation shielding blocks that form the external containment shell of industrial nuclear fission reactor multiblocks.", "wikiFile": "File:Block Fission Reactor Casing.png"},
    {"id": "mekanism:solar_neutron_activator", "name": "Solar Neutron Activator", "mod": "Mekanism", "description": "A solar irradiation tower that captures celestial radiation to irradiate nuclear gases, converting nuclear waste into tritium and polonium isotopes.", "wikiFile": "File:Block Solar Neutron Activator.png"},
    {"id": "mekanism:isotopic_centrifuge", "name": "Isotopic Centrifuge", "mod": "Mekanism", "description": "A high-speed isotopic gas centrifuge that separates nuclear fuel isotopes, isolating fissile materials from raw actinide solutions.", "wikiFile": "File:Block Isotopic Centrifuge.png"},
    {"id": "mekanism:pressurized_reaction_chamber", "name": "Pressurized Reaction Chamber", "mod": "Mekanism", "description": "An advanced pressurized autoclave that combines solid reagents, liquids, and pressurized gases under high temperature to produce HDPE pellets.", "wikiFile": "File:Block Pressurized Reaction Chamber.png"},
    {"id": "mekanism:fluidic_plenisher", "name": "Fluidic Plenisher", "mod": "Mekanism", "description": "An automated hydraulic pumping mechanism that drains liquid lakes and fills underground chasms with source blocks of water or lava.", "wikiFile": "File:Block Fluidic Plenisher.png"},
    {"id": "mekanism:teleporter", "name": "Teleporter", "mod": "Mekanism", "description": "An advanced spatial displacement portal that instantly teleports players between synchronized frequency channels across coordinates and dimensions.", "wikiFile": "File:Block Teleporter.png"},

    # === Additional Create & Botania Additions ===
    {"id": "create:gearshift", "name": "Gearshift", "mod": "Create", "description": "A kinetic control transmission block that reverses the rotational direction of connected output shafts whenever signaled by an active redstone current.", "wikiFile": "File:Block Gearshift.png"},
    {"id": "create:clutch", "name": "Clutch", "mod": "Create", "description": "A kinetic disengagement transmission that halts rotational power transfer downstream when powered with redstone, decoupling industrial machinery safely.", "wikiFile": "File:Block Clutch.png"},
    {"id": "create:encased_fan", "name": "Encased Fan", "mod": "Create", "description": "A high-speed directional air impeller that blows or pulls items and entities, bulk-washing with water or smelting through lava streams.", "wikiFile": "File:Block Encased Fan.png"},
    {"id": "botania:alchemy_catalyst", "name": "Alchemy Catalyst", "mod": "Botania", "description": "A transmutive pedestal placed beneath Mana Pools that unlocks alchemical transmutation recipes, converting copper to iron and Netherrack to quartz.", "wikiFile": "File:Block Alchemy Catalyst.png"},
    {"id": "botania:conjuration_catalyst", "name": "Conjuration Catalyst", "mod": "Botania", "description": "A potent magical pedestal placed under Mana Pools that duplicates resource materials like redstone, glowstone, and leaves in exchange for mana.", "wikiFile": "File:Block Conjuration Catalyst.png"},
    {"id": "botania:tiny_potato", "name": "Tiny Potato", "mod": "Botania", "description": "An adorable sentient decorative companion block that bounces joyfully when right-clicked and can be customized with named item name tags.", "wikiFile": "File:Block Tiny Potato.png"}
]

def main():
    print(f"Loaded {len(CANDIDATES)} candidates for Jev validation & ingestion.")
    current_blocks = json.loads(DATA_FILE.read_text()) if DATA_FILE.exists() else []
    existing_map = {b["id"]: b for b in current_blocks}
    print(f"Current catalog size: {len(current_blocks)}")

    manifest = json.loads(ASSET_FILE.read_text()) if ASSET_FILE.exists() else {"assets": []}
    asset_map = {a["id"]: a for a in manifest.get("assets", [])}

    # Filter out items that are already fully present and have local texture
    candidates_to_process = []
    for c in CANDIDATES:
        cid = c["id"]
        if cid not in existing_map or not (ROOT / "public" / existing_map[cid]["texture"].lstrip("/")).exists():
            candidates_to_process.append(c)
        else:
            # Upgrade existing item if needed
            candidates_to_process.append(c)

    print(f"Processing {len(candidates_to_process)} candidate items through Jev System 1 validation...")

    # Process sequentially or with bounded workers to ensure clean Jev responses
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(process_candidate, candidates_to_process))

    approved = [r for r in results if r is not None]
    print(f"\n[JEV VALIDATION COMPLETE] Successfully approved & enriched {len(approved)} items!")

    added_count = 0
    updated_count = 0
    for res in approved:
        item = res["item"]
        asset = res["asset"]
        cid = item["id"]

        if cid in existing_map:
            existing_map[cid].update(item)
            updated_count += 1
        else:
            current_blocks.append(item)
            existing_map[cid] = item
            added_count += 1

        asset_map[cid] = asset

    # Commit updated catalog
    DATA_FILE.write_text(json.dumps(current_blocks, indent=2, ensure_ascii=False) + "\n")
    manifest["assets"] = list(asset_map.values())
    ASSET_FILE.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")

    print(f"Catalog successfully updated to {len(current_blocks)} items! (+{added_count} new, {updated_count} upgraded)")

if __name__ == "__main__":
    main()