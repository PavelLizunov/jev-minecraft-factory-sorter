import os
import json
import hashlib
import urllib.request
import struct
import io

print("=== INGESTING AUTHENTIC MINECRAFT & CREATE MOD ITEMS ===")

CREATE_COMMIT = "fc9535d82a29419164a1e9dc9c678bdcddeab30d"
CREATE_BASE_URL = f"https://raw.githubusercontent.com/Creators-of-Create/Create/{CREATE_COMMIT}/src/main/resources/assets/create/textures/item/"
VANILLA_BASE_URL = "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.2/items/"

ITEMS_DEF = [
    # --- Create Mod Items (Mechanics, Sheets, Ingots, Alloys) ---
    {
        "id": "create:brass_ingot",
        "name": "Brass Ingot",
        "mod": "Create",
        "category": "ores_and_gems",
        "description": "An alloyed ingot of copper and zinc melted in a heated mixer. Fundamental material for Create brass machinery.",
        "url": CREATE_BASE_URL + "brass_ingot.png",
        "filename": "create_brass_ingot.png",
        "isHazard": False
    },
    {
        "id": "create:zinc_ingot",
        "name": "Zinc Ingot",
        "mod": "Create",
        "category": "ores_and_gems",
        "description": "A refined metal ingot obtained by smelting zinc ore. Used to cast brass alloys.",
        "url": CREATE_BASE_URL + "zinc_ingot.png",
        "filename": "create_zinc_ingot.png",
        "isHazard": False
    },
    {
        "id": "create:andesite_alloy",
        "name": "Andesite Alloy",
        "mod": "Create",
        "category": "building_blocks",
        "description": "A dense alloy created by combining andesite rock with iron or zinc. The foundational structural composite of kinetic tech.",
        "url": CREATE_BASE_URL + "andesite_alloy.png",
        "filename": "create_andesite_alloy.png",
        "isHazard": False
    },
    {
        "id": "create:brass_sheet",
        "name": "Brass Sheet",
        "mod": "Create",
        "category": "building_blocks",
        "description": "A flat sheet of brass flattened by a mechanical press. Used in brass casings, tunnels, and funnels.",
        "url": CREATE_BASE_URL + "brass_sheet.png",
        "filename": "create_brass_sheet.png",
        "isHazard": False
    },
    {
        "id": "create:iron_sheet",
        "name": "Iron Sheet",
        "mod": "Create",
        "category": "building_blocks",
        "description": "A plate of compressed iron processed through a mechanical press. Used for reinforced chutes and steam boilers.",
        "url": CREATE_BASE_URL + "iron_sheet.png",
        "filename": "create_iron_sheet.png",
        "isHazard": False
    },
    {
        "id": "create:copper_sheet",
        "name": "Copper Sheet",
        "mod": "Create",
        "category": "building_blocks",
        "description": "Pressed copper plate used in fluid pipes, pumps, and copper casings.",
        "url": CREATE_BASE_URL + "copper_sheet.png",
        "filename": "create_copper_sheet.png",
        "isHazard": False
    },
    {
        "id": "create:golden_sheet",
        "name": "Golden Sheet",
        "mod": "Create",
        "category": "building_blocks",
        "description": "A delicate gold foil pressed for high-precision kinetic components.",
        "url": CREATE_BASE_URL + "golden_sheet.png",
        "filename": "create_golden_sheet.png",
        "isHazard": False
    },
    {
        "id": "create:precision_mechanism",
        "name": "Precision Mechanism",
        "mod": "Create",
        "category": "mechanical_and_logistics",
        "description": "An intricate clockwork assembly crafted on sequence assembly lines using brass sheets and cogwheels.",
        "url": CREATE_BASE_URL + "precision_mechanism.png",
        "filename": "create_precision_mechanism.png",
        "isHazard": False
    },
    {
        "id": "create:electron_tube",
        "name": "Electron Tube",
        "mod": "Create",
        "category": "power_and_digital",
        "description": "A vacuum tube with polished rose quartz and iron sheet. Provides electronic sensing for smart observers and brass machines.",
        "url": CREATE_BASE_URL + "electron_tube.png",
        "filename": "create_electron_tube.png",
        "isHazard": False
    },
    {
        "id": "create:wrench",
        "name": "Create Wrench",
        "mod": "Create",
        "category": "mechanical_and_logistics",
        "description": "The engineer's multi-tool for rotating kinetic gearboxes, configuring directional funnels, and configuring machines.",
        "url": CREATE_BASE_URL + "wrench.png",
        "filename": "create_wrench.png",
        "isHazard": False
    },
    {
        "id": "create:whisk",
        "name": "Mechanical Whisk",
        "mod": "Create",
        "category": "mechanical_and_logistics",
        "description": "A kinetic mixer attachment designed to blend fluids and ingredients in a basin.",
        "url": CREATE_BASE_URL + "whisk.png",
        "filename": "create_whisk.png",
        "isHazard": False
    },
    {
        "id": "create:propeller",
        "name": "Fan Propeller",
        "mod": "Create",
        "category": "mechanical_and_logistics",
        "description": "A bladed propeller used inside encased fans for bulk washing, smoking, and blasting.",
        "url": CREATE_BASE_URL + "propeller.png",
        "filename": "create_propeller.png",
        "isHazard": False
    },
    {
        "id": "create:crushed_raw_iron",
        "name": "Crushed Raw Iron",
        "mod": "Create",
        "category": "ores_and_gems",
        "description": "Raw iron chunk pulverized by crushing wheels. Yields extra iron nuggets when washed.",
        "url": CREATE_BASE_URL + "crushed_raw_iron.png",
        "filename": "create_crushed_raw_iron.png",
        "isHazard": False
    },
    {
        "id": "create:crushed_raw_copper",
        "name": "Crushed Raw Copper",
        "mod": "Create",
        "category": "ores_and_gems",
        "description": "Raw copper crushed into gravel-like ore chunks for high-efficiency mineral processing.",
        "url": CREATE_BASE_URL + "crushed_raw_copper.png",
        "filename": "create_crushed_raw_copper.png",
        "isHazard": False
    },
    {
        "id": "create:crushed_raw_gold",
        "name": "Crushed Raw Gold",
        "mod": "Create",
        "category": "ores_and_gems",
        "description": "Concentrated crushed gold ready for washing into precious nuggets.",
        "url": CREATE_BASE_URL + "crushed_raw_gold.png",
        "filename": "create_crushed_raw_gold.png",
        "isHazard": False
    },
    {
        "id": "create:polished_rose_quartz",
        "name": "Polished Rose Quartz",
        "mod": "Create",
        "category": "magic_and_ritual",
        "description": "Rose quartz smoothed with sandpaper to optical purity. Acts as a semiconductor for electron tubes.",
        "url": CREATE_BASE_URL + "polished_rose_quartz.png",
        "filename": "create_polished_rose_quartz.png",
        "isHazard": False
    },
    {
        "id": "create:super_glue",
        "name": "Super Glue",
        "mod": "Create",
        "category": "mechanical_and_logistics",
        "description": "Industrial adhesive used to bind blocks together into contraptions, trains, and elevators.",
        "url": CREATE_BASE_URL + "super_glue.png",
        "filename": "create_super_glue.png",
        "isHazard": False
    },
    {
        "id": "create:brass_nugget",
        "name": "Brass Nugget",
        "mod": "Create",
        "category": "ores_and_gems",
        "description": "A fractional fragment of brass alloy.",
        "url": CREATE_BASE_URL + "brass_nugget.png",
        "filename": "create_brass_nugget.png",
        "isHazard": False
    },

    # --- Vanilla Minecraft Items (Ingots, Gems, Food, Combat, Drops) ---
    {
        "id": "minecraft:diamond",
        "name": "Diamond",
        "mod": "Vanilla",
        "category": "ores_and_gems",
        "description": "A rare gemstone mined deep underground. The gold standard of durable tools and high-tier armor.",
        "url": VANILLA_BASE_URL + "diamond.png",
        "filename": "minecraft_diamond.png",
        "isHazard": False
    },
    {
        "id": "minecraft:iron_ingot",
        "name": "Iron Ingot",
        "mod": "Vanilla",
        "category": "ores_and_gems",
        "description": "Standard metallic bar smelted from iron ore. Essential for tools, rails, minecarts, and machines.",
        "url": VANILLA_BASE_URL + "iron_ingot.png",
        "filename": "minecraft_iron_ingot.png",
        "isHazard": False
    },
    {
        "id": "minecraft:gold_ingot",
        "name": "Gold Ingot",
        "mod": "Vanilla",
        "category": "ores_and_gems",
        "description": "Precious soft metal ingot used for barter with Piglins and clockwork components.",
        "url": VANILLA_BASE_URL + "gold_ingot.png",
        "filename": "minecraft_gold_ingot.png",
        "isHazard": False
    },
    {
        "id": "minecraft:netherite_ingot",
        "name": "Netherite Ingot",
        "mod": "Vanilla",
        "category": "ores_and_gems",
        "description": "Ultra-dense Nether alloy of ancient debris scrap and gold. Fireproof, durable, and floats in lava.",
        "url": VANILLA_BASE_URL + "netherite_ingot.png",
        "filename": "minecraft_netherite_ingot.png",
        "isHazard": False
    },
    {
        "id": "minecraft:emerald",
        "name": "Emerald",
        "mod": "Vanilla",
        "category": "ores_and_gems",
        "description": "A brilliant green gem used as universal trade currency with villagers.",
        "url": VANILLA_BASE_URL + "emerald.png",
        "filename": "minecraft_emerald.png",
        "isHazard": False
    },
    {
        "id": "minecraft:raw_iron",
        "name": "Raw Iron",
        "mod": "Vanilla",
        "category": "ores_and_gems",
        "description": "Unrefined iron ore chunk straight from the veins of stone and deepslate.",
        "url": VANILLA_BASE_URL + "raw_iron.png",
        "filename": "minecraft_raw_iron.png",
        "isHazard": False
    },
    {
        "id": "minecraft:raw_copper",
        "name": "Raw Copper",
        "mod": "Vanilla",
        "category": "ores_and_gems",
        "description": "Raw chunk of native copper ready for smelting into conductive ingots.",
        "url": VANILLA_BASE_URL + "raw_copper.png",
        "filename": "minecraft_raw_copper.png",
        "isHazard": False
    },
    {
        "id": "minecraft:raw_gold",
        "name": "Raw Gold",
        "mod": "Vanilla",
        "category": "ores_and_gems",
        "description": "Native raw gold nugget cluster mined from subterranean badlands and stone.",
        "url": VANILLA_BASE_URL + "raw_gold.png",
        "filename": "minecraft_raw_gold.png",
        "isHazard": False
    },
    {
        "id": "minecraft:redstone",
        "name": "Redstone Dust",
        "mod": "Vanilla",
        "category": "power_and_digital",
        "description": "An energetic conductive mineral dust capable of transmitting continuous electrical logic signals.",
        "url": VANILLA_BASE_URL + "redstone.png",
        "filename": "minecraft_redstone_dust.png",
        "isHazard": False
    },
    {
        "id": "minecraft:apple",
        "name": "Apple",
        "mod": "Vanilla",
        "category": "mob_drops_and_food",
        "description": "Fresh orchard fruit gathered from oak leaves. Edible food that restores hunger.",
        "url": VANILLA_BASE_URL + "apple.png",
        "filename": "minecraft_apple.png",
        "isHazard": False
    },
    {
        "id": "minecraft:bread",
        "name": "Bread",
        "mod": "Vanilla",
        "category": "mob_drops_and_food",
        "description": "Baked agricultural loaf made from processed wheat grains.",
        "url": VANILLA_BASE_URL + "bread.png",
        "filename": "minecraft_bread.png",
        "isHazard": False
    },
    {
        "id": "minecraft:cooked_beef",
        "name": "Steak",
        "mod": "Vanilla",
        "category": "mob_drops_and_food",
        "description": "Thoroughly cooked beef steak providing high saturation for survival adventures.",
        "url": VANILLA_BASE_URL + "cooked_beef.png",
        "filename": "minecraft_cooked_beef.png",
        "isHazard": False
    },
    {
        "id": "minecraft:golden_carrot",
        "name": "Golden Carrot",
        "mod": "Vanilla",
        "category": "mob_drops_and_food",
        "description": "A root vegetable encased in golden nuggets. Exceptional survival food providing maximum saturation.",
        "url": VANILLA_BASE_URL + "golden_carrot.png",
        "filename": "minecraft_golden_carrot.png",
        "isHazard": False
    },
    {
        "id": "minecraft:ender_pearl",
        "name": "Ender Pearl",
        "mod": "Vanilla",
        "category": "magic_and_ritual",
        "description": "An otherworldly orb dropped by Endermen. Used for spatial teleportation and crafting eyes of ender.",
        "url": VANILLA_BASE_URL + "ender_pearl.png",
        "filename": "minecraft_ender_pearl.png",
        "isHazard": False
    },
    {
        "id": "minecraft:blaze_rod",
        "name": "Blaze Rod",
        "mod": "Vanilla",
        "category": "magic_and_ritual",
        "description": "A glowing thermic rod retrieved from Nether fortresses. Essential alchemical fuel for brewing stands.",
        "url": VANILLA_BASE_URL + "blaze_rod.png",
        "filename": "minecraft_blaze_rod.png",
        "isHazard": False
    },
    {
        "id": "minecraft:bone",
        "name": "Bone",
        "mod": "Vanilla",
        "category": "mob_drops_and_food",
        "description": "Skeletal remains of fallen monsters. Milled into bonemeal fertilizer for agricultural acceleration.",
        "url": VANILLA_BASE_URL + "bone.png",
        "filename": "minecraft_bone.png",
        "isHazard": False
    },
    {
        "id": "minecraft:gunpowder",
        "name": "Gunpowder",
        "mod": "Vanilla",
        "category": "building_blocks",
        "description": "Volatile chemical powder harvested from Creepers. Highly reactive combustible ingredient for TNT and fireworks.",
        "url": VANILLA_BASE_URL + "gunpowder.png",
        "filename": "minecraft_gunpowder.png",
        "isHazard": True
    },
    {
        "id": "minecraft:totem_of_undying",
        "name": "Totem of Undying",
        "mod": "Vanilla",
        "category": "magic_and_ritual",
        "description": "An ancient protective idol held in the offhand. Bestows instant resurrection and regeneration upon fatal injury.",
        "url": VANILLA_BASE_URL + "totem_of_undying.png",
        "filename": "minecraft_totem_of_undying.png",
        "isHazard": False
    },
    {
        "id": "minecraft:diamond_sword",
        "name": "Diamond Sword",
        "mod": "Vanilla",
        "category": "mob_drops_and_food",
        "description": "A sharp edged combat weapon forged from pure diamonds and a stick.",
        "url": VANILLA_BASE_URL + "diamond_sword.png",
        "filename": "minecraft_diamond_sword.png",
        "isHazard": False
    },
    {
        "id": "minecraft:diamond_pickaxe",
        "name": "Diamond Pickaxe",
        "mod": "Vanilla",
        "category": "mechanical_and_logistics",
        "description": "The quintessential mining tool capable of extracting obsidian and ancient debris.",
        "url": VANILLA_BASE_URL + "diamond_pickaxe.png",
        "filename": "minecraft_diamond_pickaxe.png",
        "isHazard": False
    }
]

out_dir = "public/textures/items"
os.makedirs(out_dir, exist_ok=True)

downloaded_items = []
manifest_assets = []

for item in ITEMS_DEF:
    file_path = os.path.join(out_dir, item["filename"])
    rel_url = f"/textures/items/{item['filename']}"
    
    # Download texture if not cached
    if not os.path.exists(file_path):
        print(f"Downloading {item['name']} from {item['url']}...")
        req = urllib.request.Request(item['url'], headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            with open(file_path, 'wb') as f:
                f.write(data)
    else:
        with open(file_path, 'rb') as f:
            data = f.read()

    sha256 = hashlib.sha256(data).hexdigest()
    # Read PNG dimensions from IHDR chunk (bytes 16..24)
    w, h = 16, 16
    if data[:8] == b'\x89PNG\r\n\x1a\n' and len(data) >= 24:
        w, h = struct.unpack('>II', data[16:24])

    # New item entry for blocks.json
    entry = {
        "id": item["id"],
        "name": item["name"],
        "mod": item["mod"],
        "category": item["category"],
        "description": item["description"],
        "texture": rel_url,
        "isHazard": item["isHazard"],
        "kind": "item",
        "render": {
            "mode": "sprite",
            "src": rel_url
        }
    }
    downloaded_items.append(entry)

    manifest_assets.append({
        "id": item["id"],
        "url": rel_url,
        "source": f"verified mod/vanilla item asset: {item['mod']}",
        "sha256": sha256,
        "width": w,
        "height": h,
        "kind": "item asset",
        "rights": "Upstream rights reserved by respective mod creators / Mojang."
    })

print(f"\nSuccessfully processed {len(downloaded_items)} items.")

# Load existing blocks.json
with open("public/data/blocks.json", "r") as f:
    existing_catalog = json.load(f)

print(f"Existing catalog entries: {len(existing_catalog)}")

# Tag existing blocks with kind: "block" if not tagged
existing_ids = set()
updated_catalog = []
for b in existing_catalog:
    if "kind" not in b:
        b["kind"] = "block"
        b["render"] = { "mode": "model-icon", "src": b["texture"] }
    existing_ids.add(b["id"])
    updated_catalog.append(b)

# Append new items if not already present
added_count = 0
for item in downloaded_items:
    if item["id"] not in existing_ids:
        updated_catalog.append(item)
        existing_ids.add(item["id"])
        added_count += 1
    else:
        # Update entry with kind and render
        for idx, b in enumerate(updated_catalog):
            if b["id"] == item["id"]:
                updated_catalog[idx] = item

print(f"Added {added_count} new items to catalog. Total now: {len(updated_catalog)}")

# Save updated blocks.json
with open("public/data/blocks.json", "w") as f:
    json.dump(updated_catalog, f, indent=2)

# Update asset-sources.json
with open("public/data/asset-sources.json", "r") as f:
    asset_sources = json.load(f)

existing_asset_ids = {a["id"] for a in asset_sources["assets"]}
for a in manifest_assets:
    if a["id"] not in existing_asset_ids:
        asset_sources["assets"].append(a)

with open("public/data/asset-sources.json", "w") as f:
    json.dump(asset_sources, f, indent=2)

print("Saved public/data/blocks.json and public/data/asset-sources.json successfully!")
