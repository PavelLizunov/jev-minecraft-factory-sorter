#!/usr/bin/env python3
"""
Ingest and Jev-validate legendary mod additions:
Draconic Evolution, Ender IO, Blood Magic, Avaritia, Twilight Forest.
"""
from validate_and_enrich_with_jev import (
    DATA_FILE, ASSET_FILE, process_candidate
)
import json
from concurrent.futures import ThreadPoolExecutor

LEGENDARY_CANDIDATES = [
    # Draconic Evolution
    {"id": "draconicevolution:draconic_core", "name": "Draconic Core", "mod": "Draconic Evolution", "description": "A fundamental energy-infused crafting component used to craft Draconic Evolution machinery and stabilize vanilla mob spawners.", "wikiFile": "File:Item Draconic Core.png"},
    {"id": "draconicevolution:chaos_shard", "name": "Chaos Shard", "mod": "Draconic Evolution", "description": "An endgame cosmic crystal fragment mined from Chaos Island cores after defeating the Chaos Guardian boss, vital for chaotic fusion.", "wikiFile": "File:Item Chaos Shard.png"},
    {"id": "draconicevolution:energy_storage_core", "name": "Energy Core", "mod": "Draconic Evolution", "description": "The central multiblock controller block capable of storing quintillions of Redstone Flux across multi-tier spherical forcefields.", "wikiFile": "File:Block Energy Core (Draconic Evolution).png"},
    {"id": "draconicevolution:crafting_injector", "name": "Fusion Crafting Injector", "mod": "Draconic Evolution", "description": "A pedestaled energy injector placed around a Fusion Crafting Core to channel immense RF during high-tier awakened fusion rituals.", "wikiFile": "File:Block Basic Fusion Crafting Injector.png"},
    {"id": "draconicevolution:awakened_core", "name": "Awakened Core", "mod": "Draconic Evolution", "description": "An advanced awakened draconium and nether star core synthesized through fusion crafting for endgame draconic gear and reactors.", "wikiFile": "File:Item Awakened Core.png"},

    # Ender IO
    {"id": "enderio:block_alloy_smelter", "name": "Alloy Smelter", "mod": "Ender IO", "description": "An electric furnace and metallurgical mixer that combines metals into advanced alloys like Energetic Alloy, Vibrant Alloy, and Dark Steel.", "wikiFile": "File:Block Alloy Smelter (EnderIO).png"},
    {"id": "enderio:block_stirling_generator", "name": "Stirling Generator", "mod": "Ender IO", "description": "A thermal generator that burns solid fuels to generate Redstone Flux, upgradeable with tiered capacitors for boosted output and efficiency.", "wikiFile": "File:Block Stirling Generator.png"},
    {"id": "enderio:block_transceiver", "name": "Dimensional Transceiver", "mod": "Ender IO", "description": "An interdimensional quantum buffer that wirelessly teleports energy, fluids, and items across infinite distances and dimensions on private channels.", "wikiFile": "File:Block Dimensional Transceiver.png"},
    {"id": "enderio:block_crafter", "name": "Crafter", "mod": "Ender IO", "description": "An automated crafting workstation that consumes RF energy to automatically assemble programmed recipes from its internal inventory buffer.", "wikiFile": "File:Block Crafter (EnderIO).png"},
    {"id": "enderio:block_cap_bank", "name": "Capacitor Bank", "mod": "Ender IO", "description": "A modular multiblock energy storage accumulator that combines stored Redstone Flux and I/O rates seamlessly when placed together.", "wikiFile": "File:Block Capacitor Bank.png"},

    # Blood Magic
    {"id": "bloodmagic:altar", "name": "Blood Altar", "mod": "Blood Magic", "description": "The sacred stone altar of Blood Magic that gathers Life Essence from sacrifices to infuse blood orbs, slates, and mystical artifacts.", "wikiFile": "File:Block Blood Altar.png"},
    {"id": "bloodmagic:master_ritual_stone", "name": "Master Ritual Stone", "mod": "Blood Magic", "description": "The central nexus block of multiblock rituals, consuming network Life Essence with an Activation Crystal to sustain magical fields.", "wikiFile": "File:Block Master Ritual Stone.png"},
    {"id": "bloodmagic:ritual_stone", "name": "Ritual Stone", "mod": "Blood Magic", "description": "A runic structural stone inscribed with elemental runes to construct complex multi-block ritual arrays.", "wikiFile": "File:Block Ritual Stone.png"},
    {"id": "bloodmagic:blood_rune", "name": "Blood Rune", "mod": "Blood Magic", "description": "A carved slate block placed in tiered rings around the Blood Altar to augment capacity, operational speed, and sacrifice yield.", "wikiFile": "File:Block Blood Rune.png"},
    {"id": "bloodmagic:incense_altar", "name": "Incense Altar", "mod": "Blood Magic", "description": "A tranquil ritual structure that burns incense to empower the Sacrificial Dagger, multiplying Life Essence generated per self-sacrifice.", "wikiFile": "File:Block Incense Altar.png"},

    # Avaritia
    {"id": "avaritia:dire_crafting", "name": "Dire Crafting Table", "mod": "Avaritia", "description": "An eighty-one slot nine-by-nine crafting workstation required to forge endgame singularity catalysts, cosmic armor, and infinity tools.", "wikiFile": "File:Block Dire Crafting Table.png"},
    {"id": "avaritia:neutron_collector", "name": "Neutron Collector", "mod": "Avaritia", "description": "A cosmic condensing array that slowly draws ambient spatial radiation over minutes to condense solid piles of raw neutrons passively.", "wikiFile": "File:Block Neutron Collector.png"},
    {"id": "avaritia:extreme_crafting_table", "name": "Extreme Crafter", "mod": "Avaritia", "description": "An automated 9x9 crafting engine that automates complex cosmic recipes without requiring tedious manual player inventory placement.", "wikiFile": "File:Block Extreme Crafter.png"},
    {"id": "avaritia:infinity_block", "name": "Infinity Block", "mod": "Avaritia", "description": "A shimmering cosmic storage block compacted from nine Infinity Ingots, completely indestructible to any tool or explosion.", "wikiFile": "File:Block Infinity Block.png"},
    {"id": "avaritia:neutronium_block", "name": "Neutronium Block", "mod": "Avaritia", "description": "An ultra-dense black storage block formed from nine Neutronium Ingots, offering extreme blast resistance and high mass.", "wikiFile": "File:Block Neutronium Block.png"},

    # Twilight Forest Trophies
    {"id": "twilightforest:hydra_trophy", "name": "Hydra Trophy", "mod": "Twilight Forest", "description": "A ferocious multi-headed fire breathing boss trophy severed upon conquering the swamp-dwelling Hydra of the Twilight Forest.", "wikiFile": "File:Block Hydra Trophy.png"},
    {"id": "twilightforest:naga_trophy", "name": "Naga Trophy", "mod": "Twilight Forest", "description": "A decorative serpentine stone trophy claimed after slaying the armored labyrinth Naga boss in the enchanted Twilight Forest courtyard.", "wikiFile": "File:Block Naga Trophy.png"},
    {"id": "twilightforest:lich_trophy", "name": "Lich Trophy", "mod": "Twilight Forest", "description": "An arcane skeletal trophy awarded after breaking through the protective shields of the Twilight Lich atop his grand dark tower.", "wikiFile": "File:Block Lich Trophy.png"},
    {"id": "twilightforest:ur_ghast_trophy", "name": "Ur-Ghast Trophy", "mod": "Twilight Forest", "description": "A weeping ghostly trophy torn from the apex of the Dark Tower after shooting down the titanic weeping Ur-Ghast boss.", "wikiFile": "File:Block Ur-Ghast Trophy.png"},
    {"id": "twilightforest:snow_queen_trophy", "name": "Snow Queen Trophy", "mod": "Twilight Forest", "description": "An icy crystalline trophy claimed atop the Aurora Palace upon defeating the levitating Snow Queen of the glacier biome.", "wikiFile": "File:Block Snow Queen Trophy.png"}
]

def main():
    print(f"Validating {len(LEGENDARY_CANDIDATES)} legendary candidates with Jev System 1...")
    with ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(process_candidate, LEGENDARY_CANDIDATES))

    approved = [r for r in results if r is not None]
    print(f"\n[JEV VALIDATED] Approved {len(approved)} legendary items!")

    blocks = json.loads(DATA_FILE.read_text())
    existing = {b["id"]: b for b in blocks}
    manifest = json.loads(ASSET_FILE.read_text())
    asset_map = {a["id"]: a for a in manifest["assets"]}

    added = 0
    for res in approved:
        item = res["item"]
        asset = res["asset"]
        cid = item["id"]
        if cid in existing:
            existing[cid].update(item)
        else:
            blocks.append(item)
            existing[cid] = item
            added += 1
        asset_map[cid] = asset

    DATA_FILE.write_text(json.dumps(blocks, indent=2, ensure_ascii=False) + "\n")
    manifest["assets"] = list(asset_map.values())
    ASSET_FILE.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"Updated catalog: {len(blocks)} total items (+{added} added)")

if __name__ == "__main__":
    main()