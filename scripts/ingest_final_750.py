#!/usr/bin/env python3
"""
Final Batch Ingestion to cross 750+ verified catalog entries.
Ingests 39 verified mineral blocks, Botania flowers, and Create contraptions.
"""
from validate_and_enrich_with_jev import (
    DATA_FILE, ASSET_FILE, process_candidate
)
import json
from concurrent.futures import ThreadPoolExecutor

FINAL_CANDIDATES = [
    # === Vanilla Mineral Blocks ===
    {"id": "minecraft:diamond_block", "name": "Block of Diamond", "mod": "Vanilla", "description": "A precious solid storage block crafted from nine diamonds, used to power beacons and decorate high-tier structures.", "wikiFile": "File:Block of Diamond.png"},
    {"id": "minecraft:emerald_block", "name": "Block of Emerald", "mod": "Vanilla", "description": "A brilliant green currency storage block crafted from nine emeralds, symbolizing wealth and fueling beacon pyramids.", "wikiFile": "File:Block of Emerald.png"},
    {"id": "minecraft:gold_block", "name": "Block of Gold", "mod": "Vanilla", "description": "A dense shiny metal storage block crafted from nine gold ingots, prized for beacon bases and pacifying nearby piglins.", "wikiFile": "File:Block of Gold.png"},
    {"id": "minecraft:iron_block", "name": "Block of Iron", "mod": "Vanilla", "description": "A heavy structural metal block crafted from nine iron ingots, forming the core construction material for iron golems and anvils.", "wikiFile": "File:Block of Iron.png"},
    {"id": "minecraft:copper_block", "name": "Block of Copper", "mod": "Vanilla", "description": "A solid orange metal block crafted from nine copper ingots that gradually oxidizes over time into exposed, weathered, and oxidized green.", "wikiFile": "File:Block of Copper.png"},
    {"id": "minecraft:redstone_block", "name": "Block of Redstone", "mod": "Vanilla", "description": "A permanently powered redstone power source block crafted from nine redstone dust that constantly emits power level 15 on all faces.", "wikiFile": "File:Block of Redstone.png"},
    {"id": "minecraft:lapis_block", "name": "Block of Lapis Lazuli", "mod": "Vanilla", "description": "A deep azure decorative gemstone storage block crafted from nine lapis lazuli gems, essential for enchanting altar setups.", "wikiFile": "File:Block of Lapis Lazuli.png"},
    {"id": "minecraft:coal_block", "name": "Block of Coal", "mod": "Vanilla", "description": "A compacted carbon fuel block crafted from nine coal pieces that smelts up to eighty items inside furnaces with prolonged burn time.", "wikiFile": "File:Block of Coal.png"},
    {"id": "minecraft:amethyst_block", "name": "Block of Amethyst", "mod": "Vanilla", "description": "A decorative purple crystalline block crafted from four amethyst shards, emitting chiming bell-like musical resonances when walked on.", "wikiFile": "File:Block of Amethyst.png"},
    {"id": "minecraft:netherite_block", "name": "Block of Netherite", "mod": "Vanilla", "description": "The ultimate blast-resistant alloy block compacted from nine netherite ingots, impervious to lava and explosions.", "wikiFile": "File:Block of Netherite.png"},
    {"id": "minecraft:raw_iron_block", "name": "Block of Raw Iron", "mod": "Vanilla", "description": "A dense unrefined mineral storage block compacted from nine raw iron chunks mined from subterranean iron veins.", "wikiFile": "File:Block of Raw Iron.png"},
    {"id": "minecraft:raw_copper_block", "name": "Block of Raw Copper", "mod": "Vanilla", "description": "A heavy oxidized orange-green mineral storage block compacted from nine raw copper chunks mined from mountain biomes.", "wikiFile": "File:Block of Raw Copper.png"},
    {"id": "minecraft:raw_gold_block", "name": "Block of Raw Gold", "mod": "Vanilla", "description": "A gleaming metallic storage block compacted from nine raw gold chunks harvested from deepslate caverns and badlands.", "wikiFile": "File:Block of Raw Gold.png"},

    # === Botania Botanical Flowers ===
    {"id": "botania:hydroangeas", "name": "Hydroangeas", "mod": "Botania", "description": "A mystical passive generating flower that drinks water from adjacent water source blocks to generate steady mana before withering.", "wikiFile": "File:Item Hydroangeas.png"},
    {"id": "botania:thermalily", "name": "Thermalily", "mod": "Botania", "description": "A fiery volcanic generating flower that absorbs adjacent lava source blocks to generate enormous bursts of mana, cooling down between feedings.", "wikiFile": "File:Item Thermalily.png"},
    {"id": "botania:gourmaryllis", "name": "Gourmaryllis", "mod": "Botania", "description": "A gourmet generating flower that devours cooked foods dropped nearby, producing mana proportional to the food nutrition and saturation.", "wikiFile": "File:Item Gourmaryllis.png"},
    {"id": "botania:munchdew", "name": "Munchdew", "mod": "Botania", "description": "A forestry generating flower that consumes surrounding tree leaves from tree canopies, converting natural foliage into mana.", "wikiFile": "File:Item Munchdew.png"},
    {"id": "botania:entropinnyum", "name": "Entropinnyum", "mod": "Botania", "description": "An explosive generating flower that absorbs the blast force of nearby detonating primed TNT blocks, turning catastrophic explosions into mana.", "wikiFile": "File:Item Entropinnyum.png"},
    {"id": "botania:spectrolus", "name": "Spectrolus", "mod": "Botania", "description": "A polychromatic generating flower that consumes colored wool blocks matching its cyclic color spectrum to generate heavy surges of mana.", "wikiFile": "File:Item Spectrolus.png"},
    {"id": "botania:clayconia", "name": "Clayconia", "mod": "Botania", "description": "A functional flower that transmutes nearby sand and water into valuable clay balls, enabling automated clay farming.", "wikiFile": "File:Item Clayconia.png"},
    {"id": "botania:hopperhock", "name": "Hopperhock", "mod": "Botania", "description": "A vacuum functional flower that gathers loose dropped items from the ground within its radius and sorts them into adjacent chests.", "wikiFile": "File:Item Hopperhock.png"},
    {"id": "botania:jaded_amaranthus", "name": "Jaded Amaranthus", "mod": "Botania", "description": "A mystical cultivating flower that expends mana to spontaneously grow vibrant mystical Botania flowers on surrounding dirt and grass.", "wikiFile": "File:Item Jaded Amaranthus.png"},
    {"id": "botania:solegnolia", "name": "Solegnolia", "mod": "Botania", "description": "A magnetic dampening flower that disables the attraction of Magnet rings within its vicinity, preventing automated farms from pulling items.", "wikiFile": "File:Item Solegnolia.png"},
    {"id": "botania:agricarnation", "name": "Agricarnation", "mod": "Botania", "description": "An agricultural functional flower that consumes mana to emit growth pulses that drastically accelerate the maturation of nearby crops.", "wikiFile": "File:Item Agricarnation.png"},

    # === Create Contraptions & Mechanics ===
    {"id": "create:cuckoo_clock", "name": "Cuckoo Clock", "mod": "Create", "description": "A decorative wooden kinetic wall clock that chimes and displays animated figures at noon and dusk matching the in-game sun cycle.", "wikiFile": "File:Block Cuckoo Clock.png"},
    {"id": "create:windmill_bearing", "name": "Windmill Bearing", "mod": "Create", "description": "A mechanical bearing that attaches to sail contraptions, capturing atmospheric wind to generate continuous rotational kinetic power.", "wikiFile": "File:Block Windmill Bearing.png"},
    {"id": "create:mechanical_bearing", "name": "Mechanical Bearing", "mod": "Create", "description": "A rotational bearing block that rotates attached structures and blocks continuously or within defined degree bounds via kinetic input.", "wikiFile": "File:Block Mechanical Bearing.png"},
    {"id": "create:rope_pulley", "name": "Rope Pulley", "mod": "Create", "description": "A kinetic winding spool that raises or lowers attached multi-block contraptions smoothly using coiled rope.", "wikiFile": "File:Block Rope Pulley.png"},
    {"id": "create:gantry_carriage", "name": "Gantry Carriage", "mod": "Create", "description": "A horizontal transit mount that rides along gantry shafts, translating shaft rotation into precise linear carriage displacement.", "wikiFile": "File:Block Gantry Carriage.png"},
    {"id": "create:piston_extension_pole", "name": "Piston Extension Pole", "mod": "Create", "description": "A modular mechanical extension shaft attached behind mechanical pistons to lengthen their maximum push and pull stroke distance.", "wikiFile": "File:Block Piston Extension Pole.png"},
    {"id": "create:linear_chassis", "name": "Linear Chassis", "mod": "Create", "description": "A lightweight structural framing block used to assemble contiguous linear contraptions, bonding blocks across its glue faces.", "wikiFile": "File:Block Linear Chassis.png"},
    {"id": "create:radial_chassis", "name": "Radial Chassis", "mod": "Create", "description": "A circular structural hub block used to assemble rotating windmill and turntable contraptions radiating outward from a center.", "wikiFile": "File:Block Radial Chassis.png"},
    {"id": "create:redstone_contact", "name": "Redstone Contact", "mod": "Create", "description": "A flat electrical contact pad that completes a circuit and transmits a redstone pulse when contacting a matching contact face.", "wikiFile": "File:Block Redstone Contact.png"},
    {"id": "create:contraption_controls", "name": "Contraption Controls", "mod": "Create", "description": "The command console steering cabin block mounted on assembled trains and airships, allowing players to drive moving contraptions.", "wikiFile": "File:Block Contraption Controls.png"},
    {"id": "create:analog_lever", "name": "Analog Lever", "mod": "Create", "description": "An adjustable indicator switch that can be set to emit any discrete redstone signal strength from zero to fifteen.", "wikiFile": "File:Block Analog Lever.png"},
    {"id": "create:chute", "name": "Chute", "mod": "Create", "description": "A downward gravity item drop conduit that rapidly transfers items between vertical containers and conveyor belts.", "wikiFile": "File:Block Chute.png"},
    {"id": "create:gearbox", "name": "Gearbox", "mod": "Create", "description": "A versatile kinetic transmission casing that relays rotational power around ninety-degree corners or reverses shaft orientation.", "wikiFile": "File:Block Gearbox (Create).png"},
    {"id": "create:clutch", "name": "Clutch", "mod": "Create", "description": "A redstone-controlled kinetic clutch that halts downstream rotational transmission when activated with a redstone current.", "wikiFile": "File:Block Clutch (Create).png"},

    # === Additional Blocks to exceed 750+ ===
    {"id": "minecraft:quartz_block", "name": "Block of Quartz", "mod": "Vanilla", "description": "A pristine smooth white architectural stone block smelted from Nether quartz crystals, popular for palatial structures.", "wikiFile": "File:Block of Quartz.png"},
    {"id": "minecraft:quartz_pillar", "name": "Quartz Pillar", "mod": "Vanilla", "description": "A classical fluted vertical column block carved from Nether quartz, used in monumental temple and column architecture.", "wikiFile": "File:Quartz Pillar.png"},
    {"id": "minecraft:cut_copper", "name": "Cut Copper", "mod": "Vanilla", "description": "Cleanly carved square copper floor tiles crafted by stonecutting copper blocks, aging through beautiful oxidation stages.", "wikiFile": "File:Cut Copper.png"},
    {"id": "minecraft:chiseled_copper", "name": "Chiseled Copper", "mod": "Vanilla", "description": "Intricately carved ornamental copper masonry block featuring concentric mechanical patterns found inside Trial Chambers.", "wikiFile": "File:Chiseled Copper.png"},
    {"id": "minecraft:copper_door", "name": "Copper Door", "mod": "Vanilla", "description": "A stylish paneled metal entrance door crafted from copper ingots that can be opened manually by players or triggered via redstone.", "wikiFile": "File:Copper Door.png"},
    {"id": "minecraft:copper_trapdoor", "name": "Copper Trapdoor", "mod": "Vanilla", "description": "A horizontal hinged copper hatch that provides access to ladders and vertical shafts, aging naturally through oxidation.", "wikiFile": "File:Copper Trapdoor.png"},
    {"id": "minecraft:waxed_copper_grate", "name": "Waxed Copper Grate", "mod": "Vanilla", "description": "A honeycomb-sealed ventilated copper grating that permanently resists oxidation, allowing light and water to flow freely.", "wikiFile": "File:Waxed Copper Grate.png"},
    {"id": "minecraft:tuff_bricks", "name": "Tuff Bricks", "mod": "Vanilla", "description": "Fortified volcanic stone masonry bricks manufactured from deepslate tuff, forming the interior chambers of Trial Chambers.", "wikiFile": "File:Tuff Bricks.png"},
    {"id": "minecraft:polished_tuff", "name": "Polished Tuff", "mod": "Vanilla", "description": "A smooth polished dark grey volcanic rock block suitable for durable dungeon and fortress floors.", "wikiFile": "File:Polished Tuff.png"},
    {"id": "minecraft:chiseled_tuff", "name": "Chiseled Tuff", "mod": "Vanilla", "description": "Carved decorative volcanic masonry blocks adorned with geometric relief glyphs discovered within ancient Trial Chambers.", "wikiFile": "File:Chiseled Tuff.png"},
    {"id": "minecraft:chiseled_tuff_bricks", "name": "Chiseled Tuff Bricks", "mod": "Vanilla", "description": "Ornate structural tuff masonry bricks carved with trial chamber heraldic emblems and structural reliefs.", "wikiFile": "File:Chiseled Tuff Bricks.png"}
]

def main():
    print(f"Loaded {len(FINAL_CANDIDATES)} candidates for final expansion.")
    blocks = json.loads(DATA_FILE.read_text()) if DATA_FILE.exists() else []
    existing = {b["id"]: b for b in blocks}
    manifest = json.loads(ASSET_FILE.read_text()) if ASSET_FILE.exists() else {"assets": []}
    asset_map = {a["id"]: a for a in manifest["assets"]}

    print(f"Starting Jev System 1 validation and asset download for {len(FINAL_CANDIDATES)} items...")
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(process_candidate, FINAL_CANDIDATES))

    approved = [r for r in results if r is not None]
    print(f"\n[JEV VALIDATED] Successfully approved & enriched {len(approved)} items!")

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