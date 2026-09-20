#!/usr/bin/env python3
"""
Migrates public/data/blocks.json to Taxonomy Version 2 (6 branches):
- ores_and_gems: Resources & Materials
- building_blocks: Construction & Decor
- mechanical_and_logistics: Mechanics & Logistics
- power_and_digital: Power & Digital Systems
- magic_and_ritual: Magic & Rituals
- mob_drops_and_food: Organics, Food & Mobs
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "public/data/blocks.json"

VALID_CATEGORIES = {
    "ores_and_gems",
    "building_blocks",
    "mechanical_and_logistics",
    "power_and_digital",
    "magic_and_ritual",
    "mob_drops_and_food"
}

def determine_v2_category(block):
    bid = block["id"].lower()
    name = block["name"].lower()
    mod = block["mod"]
    desc = block.get("description", "").lower()
    cat = block.get("category", "")

    # 1. Magic & Rituals (Botania magic, Thaumcraft, Blood Magic)
    if mod in ["Blood Magic", "Thaumcraft"] or (mod == "Botania" and not any(k in bid for k in ["livingrock", "shimmerrock", "quartz"])):
        # Check if it's building/decor or raw metal
        if any(k in name for k in ["planks", "wood", "glass", "stone bricks", "pavement", "wall", "stairs", "slab"]):
            return "building_blocks"
        if any(k in name for k in ["amber block", "void metal block"]):
            return "ores_and_gems"
        return "magic_and_ritual"

    # Specific magic items in other mods / vanilla
    if any(k in name for k in ["enchanting table", "brewing stand", "beacon", "conduit", "lodestone", "respawn anchor", "end portal frame"]):
        return "magic_and_ritual"

    # 2. Organics, Food & Mobs
    if (
        "spawn_egg" in bid or "head" in bid or "skull" in bid or "trophy" in bid or
        "spawner" in bid or "egg" in name or
        any(k in name for k in ["apple", "bread", "porkchop", "beef", "chicken", "mutton", "melon", "pumpkin", "carrot", "potato", "beetroot", "sweet berries", "glow berries", "chorus", "flower", "rose", "petals", "leaves", "spore", "moss", "lichen", "roots", "dripleaf", "froglight", "sculk", "slime", "honey", "bone block", "composter", "hay bale"])
    ):
        return "mob_drops_and_food"

    # 3. Resources & Materials (Ores, Ingots, Alloys, Crystals, Dusts)
    if (
        "ore" in bid or "raw" in bid or "cluster" in bid or
        any(k in name for k in [
            "ingot", "nugget", "gem", "crystal", "dust", "debris", "diamond", "emerald",
            "netherite", "amethyst", "lapis", "coal", "copper", "iron", "gold", "redstone block",
            "steel", "bronze", "manyullyn", "cobalt", "ardite", "knightslime", "enderium", "signalum",
            "lumium", "invar", "electrum", "draconium", "neutronium", "infinity block", "chaos shard",
            "heavy core"
        ])
    ):
        if not any(k in name for k in ["door", "trapdoor", "grate", "bars", "scaffolding", "sheetmetal", "pipe", "stairs", "slab"]):
            return "ores_and_gems"

    # 4. Construction & Decor (Building blocks, casings, structural framing, bricks, glass)
    if (
        any(k in name for k in [
            "casing", "planks", "brick", "stone", "glass", "scaffold", "sheetmetal",
            "fence", "wall", "stairs", "slab", "pillar", "basalt", "blackstone",
            "calcite", "tuff", "deepslate", "purpur", "prismarine", "terracotta", "concrete",
            "wool", "shingle", "tile", "gravel", "sand", "dirt", "door", "trapdoor", "grate", "bars"
        ]) or
        any(k in bid for k in ["chassis", "casing", "scaffolding", "sheetmetal", "grout", "bricks", "tiles", "planks", "glass"])
    ):
        return "building_blocks"

    # 5. Mechanics & Logistics (Create kinetic contraptions, physical conveyors, chutes, Tinkers smeltery)
    if (
        mod in ["Create", "Tinkers' Construct"] or
        any(k in name for k in [
            "gear", "press", "wheel", "pulley", "shaft", "belt", "conveyor", "chute", "hopper",
            "bearing", "carriage", "clutch", "piston", "dispenser", "dropper", "faucet", "drain",
            "table", "basin", "fan", "crusher", "cuckoo clock", "mill", "plough", "harvester"
        ]) or
        any(k in bid for k in ["conveyor", "chute", "hopper", "piston", "dispenser", "dropper", "faucet", "drain", "table", "basin", "bearing", "pulley", "press", "gearbox"])
    ):
        return "mechanical_and_logistics"

    # 6. Power & Digital Systems (IC2, Mekanism, Thermal, AE2, Ender IO, GregTech, Draconic, Redstone)
    return "power_and_digital"

def main():
    blocks = json.loads(DATA_FILE.read_text())
    print(f"Migrating {len(blocks)} blocks to 6-branch taxonomy...")

    migrated = []
    stats = {}
    for b in blocks:
        new_cat = determine_v2_category(b)
        assert new_cat in VALID_CATEGORIES, f"Invalid category: {new_cat}"
        b["category"] = new_cat
        migrated.append(b)
        stats[new_cat] = stats.get(new_cat, 0) + 1

    DATA_FILE.write_text(json.dumps(migrated, indent=2, ensure_ascii=False) + "\n")
    print(f"Successfully migrated {len(migrated)} blocks!")
    print("New Category Distribution across 6 branches:")
    for cat, count in sorted(stats.items(), key=lambda x: -x[1]):
        pct = (count / len(migrated)) * 100
        print(f" - {cat:26}: {count:3} items ({pct:.1f}%)")

if __name__ == "__main__":
    main()