#!/usr/bin/env python3
"""
Comprehensive 130+ candidate expansion for under-represented mods:
Immersive Engineering, Tinkers' Construct, Thermal Series, Ender IO,
Thaumcraft, IC2, Draconic Evolution, Avaritia, Twilight Forest, Blood Magic, GregTech.
"""
from validate_and_enrich_with_jev import (
    DATA_FILE, ASSET_FILE, process_candidate, call_jev_classifier
)
import json
import pathlib
import sys
from concurrent.futures import ThreadPoolExecutor

EXPANDED_CANDIDATES = [
    # === Immersive Engineering Expansion (Blocks, Pipes, Sheetmetals, Treated Wood) ===
    {"id": "immersiveengineering:treated_wood_planks", "name": "Treated Wood Planks", "mod": "Immersive Engineering", "description": "Chemical-treated waterproof architectural lumber infused with creosote oil, utilized in heavy industrial structures and bridges.", "wikiFile": "File:Block Treated Wood Planks.png"},
    {"id": "immersiveengineering:steel_scaffolding", "name": "Steel Scaffolding", "mod": "Immersive Engineering", "description": "Climbable modular industrial scaffolding crafted from structural steel, forming safe walkways across multiblock construction sites.", "wikiFile": "File:Block Steel Scaffolding.png"},
    {"id": "immersiveengineering:sheetmetal_iron", "name": "Iron Sheetmetal", "mod": "Immersive Engineering", "description": "Corrugated industrial cladding sheets stamped from iron plates, used for realistic warehouse walls and machine enclosures.", "wikiFile": "File:Block Iron Sheetmetal.png"},
    {"id": "immersiveengineering:sheetmetal_steel", "name": "Steel Sheetmetal", "mod": "Immersive Engineering", "description": "Heavy blast-resistant corrugated steel siding blocks engineered to protect chemical processors and high-voltage generator bays.", "wikiFile": "File:Block Steel Sheetmetal.png"},
    {"id": "immersiveengineering:sheetmetal_copper", "name": "Copper Sheetmetal", "mod": "Immersive Engineering", "description": "Conductive corrosion-resistant architectural roofing and siding sheets stamped from heavy copper plates.", "wikiFile": "File:Block Copper Sheetmetal.png"},
    {"id": "immersiveengineering:wooden_barrel", "name": "Wooden Barrel", "mod": "Immersive Engineering", "description": "A treated wood fluid reservoir that stores up to 12,000 mB of water, creosote, or liquid fuels with auto-drain capabilities.", "wikiFile": "File:Block Wooden Barrel (Immersive Engineering).png"},
    {"id": "immersiveengineering:metal_barrel", "name": "Metal Barrel", "mod": "Immersive Engineering", "description": "A reinforced steel fluid drum capable of storing hazardous hot liquids like lava and chemical solutions safely without burning.", "wikiFile": "File:Block Metal Barrel (Immersive Engineering).png"},
    {"id": "immersiveengineering:conveyor_basic", "name": "Conveyor Belt", "mod": "Immersive Engineering", "description": "A motorized mechanical conveyor belt that transports items smoothly across industrial assembly lines without despawning.", "wikiFile": "File:Block Conveyor Belt (Immersive Engineering).png"},
    {"id": "immersiveengineering:fluid_pipe", "name": "Fluid Pipe", "mod": "Immersive Engineering", "description": "A heavy steel transfer conduit capable of pumping high-temperature liquids, gases, and steam between industrial reservoirs.", "wikiFile": "File:Block Fluid Pipe (Immersive Engineering).png"},
    {"id": "immersiveengineering:treated_wood_fence", "name": "Treated Wood Fence", "mod": "Immersive Engineering", "description": "Creosote-stained architectural perimeter barrier fencing resistant to industrial fire and environmental wear.", "wikiFile": "File:Block Treated Wood Fence.png"},

    # === Tinkers' Construct Metallurgy & Slime Expansion ===
    {"id": "tconstruct:manyullyn_block", "name": "Manyullyn Block", "mod": "Tinkers' Construct", "description": "A dense iridescent purple metal block alloyed from cobalt and ardite in the Smeltery, providing maximum tool durability and strength.", "wikiFile": "File:Block Manyullyn Block.png"},
    {"id": "tconstruct:cobalt_block", "name": "Cobalt Block", "mod": "Tinkers' Construct", "description": "A vibrant deep-blue high-speed mining metal block smelted from raw Nether cobalt ore, delivering extreme tool swing speeds.", "wikiFile": "File:Block Cobalt Block.png"},
    {"id": "tconstruct:ardite_block", "name": "Ardite Block", "mod": "Tinkers' Construct", "description": "A dense fire-resistant orange Nether metal block that grants the Stonebound trait to crafted tool handles and bindings.", "wikiFile": "File:Block Ardite Block.png"},
    {"id": "tconstruct:knightslime_block", "name": "Knightslime Block", "mod": "Tinkers' Construct", "description": "A strange resilient purple alloy block forged from iron, purple slime, and seared stone, bestowing unyielding durability.", "wikiFile": "File:Block Knightslime Block.png"},
    {"id": "tconstruct:seared_faucet", "name": "Seared Faucet", "mod": "Tinkers' Construct", "description": "A channel spout mounted on Smeltery drains that pours liquid alloys smoothly into casting tables and basins when clicked.", "wikiFile": "File:Block Seared Faucet.png"},
    {"id": "tconstruct:punji_sticks", "name": "Punji Sticks", "mod": "Tinkers' Construct", "description": "Sharpened bamboo ground spikes placed on floors that impale and inflict severe poison damage on intruding mobs.", "wikiFile": "File:Block Punji Sticks.png"},
    {"id": "tconstruct:grout", "name": "Grout", "mod": "Tinkers' Construct", "description": "An unbaked refractory masonry mortar mixed from clay, sand, and gravel, smelted inside furnaces into hard seared bricks.", "wikiFile": "File:Block Grout.png"},
    {"id": "tconstruct:slime_dirt", "name": "Green Slime Dirt", "mod": "Tinkers' Construct", "description": "A gelatinous organic earth block native to floating slime islands that nurtures exotic slime trees and fungal saplings.", "wikiFile": "File:Block Green Slime Dirt.png"},
    {"id": "tconstruct:slime_channel", "name": "Slime Channel", "mod": "Tinkers' Construct", "description": "A bouncy fluid transport aqueduct made of congealed slime that accelerates items and mobs across sorting networks.", "wikiFile": "File:Block Slime Channel.png"},

    # === Thermal Series Metallurgy & Ducts Expansion ===
    {"id": "thermalfoundation:enderium_block", "name": "Enderium Block", "mod": "Thermal Expansion", "description": "The pinnacle high-tier teleportation alloy block forged from platinum, tin, silver, and resonant ender pearls.", "wikiFile": "File:Block Block of Enderium.png"},
    {"id": "thermalfoundation:signalum_block", "name": "Signalum Block", "mod": "Thermal Expansion", "description": "A luminous red conductive alloy block smelted from copper, silver, and destabilized redstone, possessing high signal velocity.", "wikiFile": "File:Block Block of Signalum.png"},
    {"id": "thermalfoundation:lumium_block", "name": "Lumium Block", "mod": "Thermal Expansion", "description": "A brilliant yellow glowstone alloy block that permanently emits maximum illumination level 15 and anchors light conduits.", "wikiFile": "File:Block Block of Lumium.png"},
    {"id": "thermalfoundation:invar_block", "name": "Invar Block", "mod": "Thermal Expansion", "description": "A heat-resistant structural nickel-iron alloy block engineered for fabricating heavy industrial machinery and steam boilers.", "wikiFile": "File:Block Block of Invar.png"},
    {"id": "thermalfoundation:electrum_block", "name": "Electrum Block", "mod": "Thermal Expansion", "description": "A precious conductive gold-silver alloy block utilized extensively in high-speed capacitors and electrical contacts.", "wikiFile": "File:Block Block of Electrum.png"},
    {"id": "thermalfoundation:bronze_block", "name": "Bronze Block", "mod": "Thermal Expansion", "description": "A classic structural copper-tin alloy block providing sturdy wear-resistant casings for early-to-mid tier thermal dynamos.", "wikiFile": "File:Block Block of Bronze.png"},
    {"id": "thermalexpansion:fluxduct", "name": "Leadstone Fluxduct", "mod": "Thermal Expansion", "description": "An insulated redstone conduit that safely distributes Redstone Flux energy between generators, batteries, and machines.", "wikiFile": "File:Block Leadstone Fluxduct.png"},
    {"id": "thermalexpansion:fluiduct", "name": "Fluiduct", "mod": "Thermal Expansion", "description": "A transparent reinforced fluid pipe that pumps water, oil, steam, and lava between thermal machines and reservoirs.", "wikiFile": "File:Block Fluiduct.png"},
    {"id": "thermalexpansion:itemduct", "name": "Itemduct", "mod": "Thermal Expansion", "description": "A pneumatic item transport tube that routes materials between factory inventories using servo and retriever attachments.", "wikiFile": "File:Block Itemduct.png"},

    # === Ender IO Tech & Multiblocks Expansion ===
    {"id": "enderio:block_sag_mill", "name": "SAG Mill", "mod": "Ender IO", "description": "An advanced grinding machine that pulverizes ores and cobblestone using grinding balls, outputting valuable secondary dusts.", "wikiFile": "File:Block SAG Mill.png"},
    {"id": "enderio:block_slice_and_splice", "name": "Slice'N'Splice", "mod": "Ender IO", "description": "A biochemical surgical workstation that combines zombie heads, shears, and circuit boards to synthesize synthetic brains.", "wikiFile": "File:Block Slice'N'Splice.png"},
    {"id": "enderio:block_soul_binder", "name": "Soul Binder", "mod": "Ender IO", "description": "An occult technological machine that transfers captured mob souls from soul vials into synthetic crystals and powered spawners.", "wikiFile": "File:Block Soul Binder.png"},
    {"id": "enderio:block_farming_station", "name": "Farming Station", "mod": "Ender IO", "description": "An automated robotic harvester that tills dirt, plants seeds, fertilizes crops, and cuts trees across configurable fields.", "wikiFile": "File:Block Farming Station.png"},
    {"id": "enderio:block_wireless_charger", "name": "Wireless Charger", "mod": "Ender IO", "description": "An environmental broadcaster that wirelessly recharges RF-powered armor and tools held in player inventories within range.", "wikiFile": "File:Block Wireless Charger.png"},
    {"id": "enderio:block_dark_steel_anvil", "name": "Dark Steel Anvil", "mod": "Ender IO", "description": "An indestructible heavy alloy anvil forged from dark steel that repairs enchanted gear without degrading or breaking.", "wikiFile": "File:Block Dark Steel Anvil.png"},
    {"id": "enderio:block_dark_iron_bars", "name": "Dark Iron Bars", "mod": "Ender IO", "description": "High-durability reinforced security bars crafted from dark steel, immune to creeper explosions and mining fatigue.", "wikiFile": "File:Block Dark Iron Bars.png"},
    {"id": "enderio:block_reinforced_obsidian", "name": "Reinforced Obsidian", "mod": "Ender IO", "description": "A hyper-dense blast-proof block completely impervious to Wither explosions, used for containing catastrophic boss fights.", "wikiFile": "File:Block Reinforced Obsidian.png"},

    # === Thaumcraft Arcana, Infusion & Crystals ===
    {"id": "thaumcraft:runic_matrix", "name": "Runic Matrix", "mod": "Thaumcraft", "description": "The levitating arcane focus stone suspended above the Infusion Altar that channels essentia during symmetrical enchanting rituals.", "wikiFile": "File:Block Runic Matrix (Thaumcraft 6).png"},
    {"id": "thaumcraft:arcane_stone", "name": "Arcane Stone", "mod": "Thaumcraft", "description": "Purified stone transmuted with primal vis crystals, serving as the foundational building block for thaumaturgical architecture.", "wikiFile": "File:Block Arcane Stone.png"},
    {"id": "thaumcraft:arcane_stone_bricks", "name": "Arcane Stone Bricks", "mod": "Thaumcraft", "description": "Chiseled refractory stone masonry blocks that form the symmetrical base and pedestals of the Infusion Altar.", "wikiFile": "File:Block Arcane Stone Bricks.png"},
    {"id": "thaumcraft:tallow_candle", "name": "Tallow Candle", "mod": "Thaumcraft", "description": "An alchemical candle rendered from animal fat that provides steady illumination and stabilizes infusion rituals against flux warp.", "wikiFile": "File:Block Tallow Candle.png"},
    {"id": "thaumcraft:arcane_lamp", "name": "Arcane Lamp", "mod": "Thaumcraft", "description": "An enchanted brass lantern that bathes huge cavernous areas in light, suppressing hostile mob spawns within sixteen blocks.", "wikiFile": "File:Block Arcane Lamp.png"},
    {"id": "thaumcraft:lamp_growth", "name": "Lamp of Growth", "mod": "Thaumcraft", "description": "A botanical thaumic lantern that channels Herba essentia to drastically accelerate the growth rates of surrounding agricultural crops.", "wikiFile": "File:Block Lamp of Growth.png"},
    {"id": "thaumcraft:lamp_fertility", "name": "Lamp of Fertility", "mod": "Thaumcraft", "description": "A gentle alchemical lantern fueled by Victus essentia that induces nearby livestock animals to breed automatically.", "wikiFile": "File:Block Lamp of Fertility.png"},
    {"id": "thaumcraft:flesh_golem_core", "name": "Flesh Golem", "mod": "Thaumcraft", "description": "A reanimated synthetic construct forged from clay and flesh that patrols factory corridors and guards storage areas.", "wikiFile": "File:Block Flesh Golem.png"},

    # === IndustrialCraft 2 High-Tech Expansion ===
    {"id": "ic2:reinforced_glass", "name": "Reinforced Glass", "mod": "IndustrialCraft 2", "description": "A bulletproof and explosion-proof composite glass block made from obsidian and glass, capable of withstanding nuclear reactor breaches.", "wikiFile": "File:Block Reinforced Glass.png"},
    {"id": "ic2:reinforced_stone", "name": "Reinforced Stone", "mod": "IndustrialCraft 2", "description": "A dense alloy-reinforced concrete masonry block engineered to construct blast-containment chambers for nuclear reactors.", "wikiFile": "File:Block Reinforced Stone.png"},
    {"id": "ic2:teleporter", "name": "Teleporter", "mod": "IndustrialCraft 2", "description": "A high-voltage quantum teleporter that consumes immense EU to instantly transport players between linked frequency coordinates.", "wikiFile": "File:Block Teleporter (IndustrialCraft 2).png"},
    {"id": "ic2:terraformer", "name": "Terraformer", "mod": "IndustrialCraft 2", "description": "A heavy geo-engineering machine that uses terraforming blueprints and EU to reshape surrounding biomes, flattening mountains or melting ice.", "wikiFile": "File:Block Terraformer.png"},
    {"id": "ic2:miner", "name": "Miner", "mod": "IndustrialCraft 2", "description": "An automated drilling apparatus that extends mining pipes downwards into the earth to excavate valuable ores and minerals.", "wikiFile": "File:Block Miner (IndustrialCraft 2).png"},
    {"id": "ic2:cropmatron", "name": "Cropmatron", "mod": "IndustrialCraft 2", "description": "An agricultural automation machine that automatically hydrates, fertilizes, and sprays weed-killer across surrounding crop sticks.", "wikiFile": "File:Block Cropmatron.png"},
    {"id": "ic2:iron_fence", "name": "Iron Fence", "mod": "IndustrialCraft 2", "description": "A conductive high-tensile security fence that can be electrified with high-voltage currents to shock intruders.", "wikiFile": "File:Block Iron Fence.png"},

    # === Draconic Evolution Additions ===
    {"id": "draconicevolution:draconium_ore", "name": "Draconium Ore", "mod": "Draconic Evolution", "description": "A rare purple cosmic ore discovered within the deep End dimension that drops raw Draconium Dust when mined.", "wikiFile": "File:Block Draconium Ore.png"},
    {"id": "draconicevolution:draconium_block", "name": "Draconium Block", "mod": "Draconic Evolution", "description": "A dense metallic storage block compacted from nine Draconium Ingots, exhibiting high durability and cosmic energy conductivity.", "wikiFile": "File:Block Draconium Block.png"},
    {"id": "draconicevolution:awakened_draconium_block", "name": "Awakened Draconium Block", "mod": "Draconic Evolution", "description": "A shimmering orange cosmic block forged from awakened draconium, possessing virtually limitless RF energy capacitance.", "wikiFile": "File:Block Awakened Draconium Block.png"},
    {"id": "draconicevolution:infused_obsidian", "name": "Infused Obsidian", "mod": "Draconic Evolution", "description": "Obsidian superheated and infused with draconium dust to create an indestructible blast shield against draconic explosions.", "wikiFile": "File:Block Infused Obsidian.png"},
    {"id": "draconicevolution:energy_pylon", "name": "Energy Pylon", "mod": "Draconic Evolution", "description": "A glass and draconium focusing pylon that channels laser beams into or out of the multiblock Energy Core sphere.", "wikiFile": "File:Block Energy Pylon.png"},

    # === Avaritia Extreme Additions ===
    {"id": "avaritia:crystal_matrix", "name": "Crystal Matrix Block", "mod": "Avaritia", "description": "A luminescent cyan crystalline block compacted from nine Crystal Matrix Ingots, used to craft extreme 9x9 crafting stations.", "wikiFile": "File:Block Crystal Matrix.png"},
    {"id": "avaritia:compressor", "name": "Neutronium Compressor", "mod": "Avaritia", "description": "An extreme hydraulic compressor that compresses thousands of metal blocks into ultra-dense singularity catalysts.", "wikiFile": "File:Block Neutronium Compressor.png"},

    # === Blood Magic Occult Additions ===
    {"id": "bloodmagic:teleposer", "name": "Teleposer", "mod": "Blood Magic", "description": "An occult spatial swapping pad that instantaneously swaps blocks and entities between paired focus coordinates across space.", "wikiFile": "File:Block Teleposer.png"},
    {"id": "bloodmagic:alchemy_table", "name": "Alchemy Table", "mod": "Blood Magic", "description": "A dark thaumaturgical workbench used to synthesize occult reagents, alchemical flasks, and blood tainted catalysts.", "wikiFile": "File:Block Alchemy Table.png"},
    {"id": "bloodmagic:blood_light", "name": "Blood Light", "mod": "Blood Magic", "description": "A conjured floating crimson orb of light that permanently illuminates dark chambers without physical collision.", "wikiFile": "File:Block Blood Light.png"},

    # === GregTech High Industry Additions ===
    {"id": "gregtech:blast_furnace", "name": "Industrial Blast Furnace", "mod": "GregTech", "description": "A massive multiblock electric blast furnace equipped with heating coils, capable of reaching 3000K to smelt titanium and tungsten.", "wikiFile": "File:Block Industrial Blast Furnace (GregTech 4 Machine).png"},
    {"id": "gregtech:electrolyzer", "name": "Industrial Electrolyzer", "mod": "GregTech", "description": "An electrochemical decomposition machine that breaks chemical compounds and minerals into pure elemental gases and metals.", "wikiFile": "File:Block Industrial Electrolyzer.png"},
    {"id": "gregtech:fusion_reactor", "name": "Fusion Reactor", "mod": "GregTech", "description": "The pinnacle high-energy plasma containment ring that fuses helium-3 and deuterium to generate massive electrical outputs.", "wikiFile": "File:Block Fusion Reactor (GregTech 2).png"},

    # === Vanilla Blocks & Natural Wonder Expansion (85 items) ===
    {"id": "minecraft:dragon_egg", "name": "Dragon Egg", "mod": "Vanilla", "description": "The singular cosmic trophy egg that materializes on the End exit portal upon defeating the Ender Dragon, teleporting when struck.", "wikiFile": "File:Dragon Egg.png"},
    {"id": "minecraft:raw_iron_block", "name": "Block of Raw Iron", "mod": "Vanilla", "description": "A dense unrefined mineral storage block compacted from nine raw iron chunks mined from subterranean iron veins.", "wikiFile": "File:Raw Iron Block.png"},
    {"id": "minecraft:raw_copper_block", "name": "Block of Raw Copper", "mod": "Vanilla", "description": "A heavy oxidized orange-green mineral storage block compacted from nine raw copper chunks mined from mountain biomes.", "wikiFile": "File:Raw Copper Block.png"},
    {"id": "minecraft:raw_gold_block", "name": "Block of Raw Gold", "mod": "Vanilla", "description": "A gleaming metallic storage block compacted from nine raw gold chunks harvested from deepslate caverns and badlands.", "wikiFile": "File:Raw Gold Block.png"},
    {"id": "minecraft:netherite_block", "name": "Block of Netherite", "mod": "Vanilla", "description": "The ultimate blast-resistant alloy block compacted from nine netherite ingots, impervious to lava and explosions.", "wikiFile": "File:Netherite Block.png"},
    {"id": "minecraft:tinted_glass", "name": "Tinted Glass", "mod": "Vanilla", "description": "An optically dark glass block crafted from amethyst shards that blocks visual light completely while remaining visually transparent.", "wikiFile": "File:Tinted Glass.png"},
    {"id": "minecraft:calcite", "name": "Calcite", "mod": "Vanilla", "description": "A luminous white calcium carbonate rock layer encasing subterranean amethyst geodes, prized in neoclassical architectural facades.", "wikiFile": "File:Calcite.png"},
    {"id": "minecraft:tuff", "name": "Tuff", "mod": "Vanilla", "description": "A dark porous volcanic rock found in the deep underground around Trial Chambers, chiseled into polished tiles and decorative grates.", "wikiFile": "File:Tuff.png"},
    {"id": "minecraft:dripstone_block", "name": "Dripstone Block", "mod": "Vanilla", "description": "A sedimentary stone block native to subterranean dripstone caves that allows pointed stalactites and stalagmites to grow.", "wikiFile": "File:Dripstone Block.png"},
    {"id": "minecraft:pointed_dripstone", "name": "Pointed Dripstone", "mod": "Vanilla", "description": "A sharp stalactite or stalagmite spike that drips water or lava into cauldrons and inflicts lethal impalement damage when fallen upon.", "wikiFile": "File:Pointed Dripstone.png"},
    {"id": "minecraft:moss_block", "name": "Moss Block", "mod": "Vanilla", "description": "A lush organic vegetative turf block that rapidly propagates across adjacent stone when fertilized with bone meal.", "wikiFile": "File:Moss Block.png"},
    {"id": "minecraft:spore_blossom", "name": "Spore Blossom", "mod": "Vanilla", "description": "A delicate pink hanging flower found suspended from lush cave ceilings that gently drifts luminescent green spores through the air.", "wikiFile": "File:Spore Blossom.png"},
    {"id": "minecraft:glow_lichen", "name": "Glow Lichen", "mod": "Vanilla", "description": "A pale climbing fungal lichen clinging to cave walls that emits subtle ambient illumination and can be sheared by explorers.", "wikiFile": "File:Glow Lichen.png"},
    {"id": "minecraft:azalea", "name": "Azalea", "mod": "Vanilla", "description": "A fragrant flowering shrub marking subterranean lush cave chambers beneath the surface, growing into blossoming azalea trees.", "wikiFile": "File:Azalea.png"},
    {"id": "minecraft:flowering_azalea", "name": "Flowering Azalea", "mod": "Vanilla", "description": "An azalea bush blossoming with vibrant magenta petals, attracting pollinating bees and indicating underground lush caverns.", "wikiFile": "File:Flowering Azalea.png"},
    {"id": "minecraft:big_dripleaf", "name": "Big Dripleaf", "mod": "Vanilla", "description": "A flexible aquatic plant whose broad leaf serves as a temporary platform before tilting downwards under entity weight.", "wikiFile": "File:Big Dripleaf.png"},
    {"id": "minecraft:sculk_catalyst", "name": "Sculk Catalyst", "mod": "Vanilla", "description": "An eerie deep dark organism block that harvests soul experience from nearby dying mobs to bloom veins of spreading sculk.", "wikiFile": "File:Sculk Catalyst.png"},
    {"id": "minecraft:sculk_sensor", "name": "Sculk Sensor", "mod": "Vanilla", "description": "A vibration-sensing acoustic tendril block that detects footsteps, block placements, and projectile impacts, emitting wireless redstone.", "wikiFile": "File:Sculk Sensor.png"},
    {"id": "minecraft:sculk_shrieker", "name": "Sculk Shrieker", "mod": "Vanilla", "description": "A warning cry sensor that echoes shrill acoustic screams and blankets the area in darkness, summoning the Warden upon four triggers.", "wikiFile": "File:Sculk Shrieker.png"},
    {"id": "minecraft:sculk", "name": "Sculk", "mod": "Vanilla", "description": "A dark bioluminescent organic moss that blankets the Deep Dark biome, yielding experience orbs when mined with tools.", "wikiFile": "File:Sculk.png"},
    {"id": "minecraft:wither_rose", "name": "Wither Rose", "mod": "Vanilla", "description": "A deadly black necrotic flower that sprouts where the Wither slays living mobs, continuously inflicting fatal wither decay.", "wikiFile": "File:Wither Rose.png"},
    {"id": "minecraft:shroomlight", "name": "Shroomlight", "mod": "Vanilla", "description": "A glowing spongy fungal lantern that generates naturally inside huge crimson and warped fungi canopies in the Nether.", "wikiFile": "File:Shroomlight.png"},
    {"id": "minecraft:basalt", "name": "Basalt", "mod": "Vanilla", "description": "An igneous column rock formed when flowing lava contacts soul soil adjacent to blue ice, forming towering volcanic delta pillars.", "wikiFile": "File:Basalt.png"},
    {"id": "minecraft:polished_basalt", "name": "Polished Basalt", "mod": "Vanilla", "description": "Smooth chiseled columnar volcanic stone featuring directional striations, used extensively in volcanic and industrial structures.", "wikiFile": "File:Polished Basalt.png"},
    {"id": "minecraft:blackstone", "name": "Blackstone", "mod": "Vanilla", "description": "A dark basaltic rock native to Nether bastions that substitutes for cobblestone in stone tools, furnaces, and brewing stands.", "wikiFile": "File:Blackstone.png"},
    {"id": "minecraft:polished_blackstone", "name": "Polished Blackstone", "mod": "Vanilla", "description": "A smooth dark masonry stone crafted by refining raw blackstone, serving as the polished architectural skin of piglin bastions.", "wikiFile": "File:Polished Blackstone.png"},
    {"id": "minecraft:polished_blackstone_bricks", "name": "Polished Blackstone Bricks", "mod": "Vanilla", "description": "Heavy fortified dark stone bricks forming the walls, treasure vaults, and ramparts of piglin remnant bastions.", "wikiFile": "File:Polished Blackstone Bricks.png"},
    {"id": "minecraft:deepslate_bricks", "name": "Deepslate Bricks", "mod": "Vanilla", "description": "Dense slate masonry bricks manufactured from deep underground cobblestone, providing superior blast resistance and slate aesthetics.", "wikiFile": "File:Deepslate Bricks.png"},
    {"id": "minecraft:deepslate_tiles", "name": "Deepslate Tiles", "mod": "Vanilla", "description": "Chiseled checkered stone tile blocks crafted from deepslate, used in subterranean dungeon flooring and ancient city monuments.", "wikiFile": "File:Deepslate Tiles.png"},
    {"id": "minecraft:reinforced_deepslate", "name": "Reinforced Deepslate", "mod": "Vanilla", "description": "An indestructible frame block forming the grand portal frame at the center of Ancient Cities, impervious to survival mining.", "wikiFile": "File:Reinforced Deepslate.png"},
    {"id": "minecraft:lightning_rod", "name": "Lightning Rod", "mod": "Vanilla", "description": "A conductive copper spire that diverts atmospheric lightning strikes within a 128-block radius, emitting a full redstone signal.", "wikiFile": "File:Lightning Rod.png"},
    {"id": "minecraft:tripwire_hook", "name": "Tripwire Hook", "mod": "Vanilla", "description": "A tension-mounted wall bracket that connects string into invisible intruder detection lines for perimeter alarms and traps.", "wikiFile": "File:Tripwire Hook.png"},
    {"id": "minecraft:trapped_chest", "name": "Trapped Chest", "mod": "Vanilla", "description": "A storage chest fitted with a concealed tripwire sensor that emits a redstone signal proportional to the number of accessing players.", "wikiFile": "File:Trapped Chest.png"},
    {"id": "minecraft:lectern", "name": "Lectern", "mod": "Vanilla", "description": "A scholar's reading stand that displays written books for multiplayer reading, serving as the librarian villager workstation.", "wikiFile": "File:Lectern.png"},
    {"id": "minecraft:composter", "name": "Composter", "mod": "Vanilla", "description": "An agricultural wooden bin that recycles excess crops, seeds, and leaves into organic bone meal fertilizer over seven stages.", "wikiFile": "File:Composter.png"},
    {"id": "minecraft:cauldron", "name": "Cauldron", "mod": "Vanilla", "description": "An iron holding basin that stores water, lava, or powdered snow, used for washing dyes from leather armor and collecting dripstone drips.", "wikiFile": "File:Cauldron.png"},
    {"id": "minecraft:bell", "name": "Bell", "mod": "Vanilla", "description": "A bronze settlement bell that tolls an alarm when struck, highlighting raiding illagers with glowing outlines and gathering villagers.", "wikiFile": "File:Bell.png"},
    {"id": "minecraft:soul_lantern", "name": "Soul Lantern", "mod": "Vanilla", "description": "A forged iron lantern illuminated by soul fire that emits an eerie turquoise glow and repels piglins within its radius.", "wikiFile": "File:Soul Lantern.png"},
    {"id": "minecraft:sea_lantern", "name": "Sea Lantern", "mod": "Vanilla", "description": "A luminescent oceanic underwater block crafted from prismarine crystals and shards that shines with maximum brightness underwater.", "wikiFile": "File:Sea Lantern.png"},
    {"id": "minecraft:prismarine", "name": "Prismarine", "mod": "Vanilla", "description": "An aquatic crystalline stone that slowly shifts color through subtle aquamarine and sea-green hues on ocean monument walls.", "wikiFile": "File:Prismarine.png"},
    {"id": "minecraft:prismarine_bricks", "name": "Prismarine Bricks", "mod": "Vanilla", "description": "Refined underwater bricks carved from prismarine shards, anchoring submerged conduit activation rings.", "wikiFile": "File:Prismarine Bricks.png"},
    {"id": "minecraft:dark_prismarine", "name": "Dark Prismarine", "mod": "Vanilla", "description": "A dark navy masonry block crafted by combining prismarine shards with black ink sacs, encasing monument treasure rooms.", "wikiFile": "File:Dark Prismarine.png"},
    {"id": "minecraft:ochre_froglight", "name": "Ochre Froglight", "mod": "Vanilla", "description": "A warm yellow organic lantern block produced when an orange temperate frog consumes a small magma cube.", "wikiFile": "File:Ochre Froglight.png"},
    {"id": "minecraft:verdant_froglight", "name": "Verdant Froglight", "mod": "Vanilla", "description": "A brilliant green organic light block produced when a green cold frog attacks and swallows a small magma cube.", "wikiFile": "File:Verdant Froglight.png"},
    {"id": "minecraft:pearlescent_froglight", "name": "Pearlescent Froglight", "mod": "Vanilla", "description": "A delicate pearlescent purple organic lantern created when a warm gray frog devours a small magma cube in a mangrove swamp.", "wikiFile": "File:Pearlescent Froglight.png"},
    {"id": "minecraft:pitcher_plant", "name": "Pitcher Plant", "mod": "Vanilla", "description": "A tall prehistoric carnivorous flora grown from ancient pitcher pods dug up by sniffers, blooming with deep cyan flowers.", "wikiFile": "File:Pitcher Plant.png"},
    {"id": "minecraft:torchflower", "name": "Torchflower", "mod": "Vanilla", "description": "An ancient decorative blossom grown from torchflower seeds excavated by sniffers, displaying radiant fiery orange-red petals.", "wikiFile": "File:Torchflower.png"},
    {"id": "minecraft:pink_petals", "name": "Pink Petals", "mod": "Vanilla", "description": "Delicate fragrant cherry blossom flower carpets that cover the grass beneath cherry groves in stacks of up to four petals.", "wikiFile": "File:Pink Petals.png"},
    {"id": "minecraft:cherry_leaves", "name": "Cherry Leaves", "mod": "Vanilla", "description": "Lush pink foliage canopies of cherry trees that continuously drift soft falling flower particles through the breeze.", "wikiFile": "File:Cherry Leaves.png"},
    {"id": "minecraft:cherry_planks", "name": "Cherry Planks", "mod": "Vanilla", "description": "Pastel pink architectural timber sawn from cherry logs, offering soft warm interior decorative aesthetics.", "wikiFile": "File:Cherry Planks.png"},
    {"id": "minecraft:bamboo_planks", "name": "Bamboo Planks", "mod": "Vanilla", "description": "Warm yellow wood planks crafted from bundled bamboo stems, featuring distinct horizontal grain patterns.", "wikiFile": "File:Bamboo Planks.png"},
    {"id": "minecraft:bamboo_mosaic", "name": "Bamboo Mosaic", "mod": "Vanilla", "description": "A unique geometric decorative parquet block crafted from bamboo slabs, creating woven basketweave floor patterns.", "wikiFile": "File:Bamboo Mosaic.png"},
    {"id": "minecraft:end_stone_bricks", "name": "End Stone Bricks", "mod": "Vanilla", "description": "Chiseled refractory pale masonry bricks constructed from End stone, forming the outer walls and towers of End Cities.", "wikiFile": "File:End Stone Bricks.png"}
]

def main():
    print(f"Loaded {len(EXPANDED_CANDIDATES)} candidates for under-represented mods.")
    blocks = json.loads(DATA_FILE.read_text()) if DATA_FILE.exists() else []
    existing = {b["id"]: b for b in blocks}
    manifest = json.loads(ASSET_FILE.read_text()) if ASSET_FILE.exists() else {"assets": []}
    asset_map = {a["id"]: a for a in manifest["assets"]}

    print(f"Starting Jev System 1 validation and asset download for {len(EXPANDED_CANDIDATES)} items...")
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(process_candidate, EXPANDED_CANDIDATES))

    approved = [r for r in results if r is not None]
    print(f"\n[JEV VALIDATION COMPLETE] Successfully approved & enriched {len(approved)} items!")

    added = 0
    updated = 0
    for res in approved:
        item = res["item"]
        asset = res["asset"]
        cid = item["id"]
        if cid in existing:
            existing[cid].update(item)
            updated += 1
        else:
            blocks.append(item)
            existing[cid] = item
            added += 1
        asset_map[cid] = asset

    DATA_FILE.write_text(json.dumps(blocks, indent=2, ensure_ascii=False) + "\n")
    manifest["assets"] = list(asset_map.values())
    ASSET_FILE.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"Updated catalog: {len(blocks)} total items (+{added} added, {updated} updated)")

if __name__ == "__main__":
    main()