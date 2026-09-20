#!/usr/bin/env python3
"""
Comprehensive Minecraft & Modded Block + Mob Harvester.
Fulfills the 5-agent x 10-round taxonomy:
Agent 1: Hostile Mobs, Bosses, Skulls, Spawners & Nether Terrors
Agent 2: Passive Mobs, Animals, Golems, Pets & Archeology
Agent 3: Create Kinetic Engineering, Trains & Heavy Industry
Agent 4: IC2, GregTech, Thermal Expansion & Mekanism High-Tech
Agent 5: Botania Mana Apparatus & Thaumcraft Arcane Infusion

Extracts verified images via Minecraft Wiki API, FTB Wiki API, and GitHub trees.
"""
import urllib.request
import urllib.parse
import json
import os
import pathlib
import re
import hashlib
import struct
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST_DIR = ROOT / "public/textures/modded"
DEST_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR = ROOT / ".cache/catalog"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

USER_AGENT = "JevFactoryCatalog/3.0 (academic showcase; verified asset ingestion)"

HARVEST_TARGETS = [
    # === AGENT 1: Hostile Mobs, Bosses, Heads & Spawners (Rounds 1-10) ===
    # Heads & Skulls (Placeable blocks)
    {"id": "minecraft:creeper_head", "name": "Creeper Head", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 2, "wikiFile": "File:Creeper Head.png", "desc": "Severed explosive monster trophy dropped when a charged creeper detonates. Halves creeper detection range and can be placed as a decorative block."},
    {"id": "minecraft:zombie_head", "name": "Zombie Head", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 2, "wikiFile": "File:Zombie Head.png", "desc": "Undead trophy acquired when a charged creeper slays a zombie. Wearable as camouflage or placed as a decorative macabre block."},
    {"id": "minecraft:skeleton_skull", "name": "Skeleton Skull", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 2, "wikiFile": "File:Skeleton Skull.png", "desc": "Skeletal monster drop obtained via charged creeper explosion. Halves skeleton detection distance and plays bone clatter sounds atop note blocks."},
    {"id": "minecraft:wither_skeleton_skull", "name": "Wither Skeleton Skull", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 2, "wikiFile": "File:Wither Skeleton Skull.png", "desc": "Rare necrotic skull dropped by Nether fortress wither skeletons. Essential ritual catalyst placed on soul sand to construct and awaken the Wither boss."},
    {"id": "minecraft:piglin_head", "name": "Piglin Head", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 2, "wikiFile": "File:Piglin Head.png", "desc": "Nether trophy acquired when a charged creeper slays a piglin. Flaps its ears rhythmically when powered by redstone or worn by players."},
    {"id": "minecraft:dragon_head", "name": "Dragon Head", "mod": "Vanilla", "category": "building_blocks", "isHazard": False, "rarity": 2, "wikiFile": "File:Dragon Head.png", "desc": "Colossal trophy block mounted on the bow of End Ships. Wearable as an imposing helmet, and mouth opens and closes dynamically when redstone-powered."},
    # Spawner Blocks
    {"id": "minecraft:spawner", "name": "Monster Spawner", "mod": "Vanilla", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Monster Spawner.png", "desc": "Ancient iron cage mechanism that perpetually materializes hostile mobs in low light when players enter within sixteen blocks."},
    {"id": "minecraft:blaze_spawner", "name": "Blaze Spawner", "mod": "Vanilla", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Blaze Spawner.png", "desc": "Nether fortress cage apparatus that continuously generates fiery blazes, serving as an automated furnace fuel and potion ingredient source."},
    {"id": "minecraft:zombie_spawner", "name": "Zombie Spawner", "mod": "Vanilla", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Zombie Spawner.png", "desc": "Subterranean dungeon cage generating undead zombies, automated by engineers to harvest rotten flesh, iron ingots, and rare equipment."},
    {"id": "minecraft:skeleton_spawner", "name": "Skeleton Spawner", "mod": "Vanilla", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Skeleton Spawner.png", "desc": "Subterranean cage mechanism summoning hostile archers, leveraged in industrial mob farms for renewable bone meal fertilizer and arrow ammunition."},
    {"id": "minecraft:spider_spawner", "name": "Spider Spawner", "mod": "Vanilla", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Spider Spawner.png", "desc": "Dungeon cage apparatus materializing wall-climbing venomous arthropods, providing automated harvests of crafting string and alchemical spider eyes."},
    # Hostile Mobs & Bosses (Eggs & Entities)
    {"id": "minecraft:warden_spawn_egg", "name": "Warden Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": True, "rarity": 2, "wikiFile": "File:Warden Spawn Egg.png", "desc": "Summons the blind apex predator of the Deep Dark. Tracks vibrations, unleashes lethal sonic shrieks, and can wipe out fully netherite-armored players."},
    {"id": "minecraft:wither_spawn_egg", "name": "Wither Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": True, "rarity": 2, "wikiFile": "File:Wither Spawn Egg.png", "desc": "Directly summons the catastrophic three-headed necrotic boss. Detonates on arrival, inflicts fatal wither decay, and drops the beacon-powering Nether Star."},
    {"id": "minecraft:creeper_spawn_egg", "name": "Creeper Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": True, "rarity": 1, "wikiFile": "File:Creeper Spawn Egg.png", "desc": "Instant spawn capsule for the iconic silent ambush predator. Sneaks toward players and explodes violently, destroying surrounding terrain and structures."},
    {"id": "minecraft:blaze_spawn_egg", "name": "Blaze Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": True, "rarity": 1, "wikiFile": "File:Blaze Spawn Egg.png", "desc": "Summons floating elemental sentinels of Nether fortresses that hover, emit smoke, and fire bursts of three incendiary fireballs."},
    {"id": "minecraft:ghast_spawn_egg", "name": "Ghast Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": True, "rarity": 2, "wikiFile": "File:Ghast Spawn Egg.png", "desc": "Summons a colossal floating Nether phantom that screeches across cavernous skies and launches high-explosive fireballs capable of shattering terrain."},
    {"id": "minecraft:enderman_spawn_egg", "name": "Enderman Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Enderman Spawn Egg.png", "desc": "Summons an enigmatic tall humanoid capable of dimensional teleportation and picking up terrain blocks. Enrages upon direct eye contact."},
    {"id": "minecraft:shulker_spawn_egg", "name": "Shulker Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 2, "wikiFile": "File:Shulker Spawn Egg.png", "desc": "Summons a defensive shell-lurking End city organism. Shoots guided levitation bullets and drops shulker shells for portable chest crafting."},
    {"id": "minecraft:evoker_spawn_egg", "name": "Evoker Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 2, "wikiFile": "File:Evoker Spawn Egg.png", "desc": "Summons an elite illager caster that summons snapping ground fangs, conjures flying vexes, and yields the life-saving Totem of Undying upon defeat."},
    {"id": "minecraft:vindicator_spawn_egg", "name": "Vindicator Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Vindicator Spawn Egg.png", "desc": "Summons an iron axe wielding illager shock trooper that sprints aggressively toward players and villagers during mansion raids."},
    {"id": "minecraft:ravager_spawn_egg", "name": "Ravager Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": True, "rarity": 2, "wikiFile": "File:Ravager Spawn Egg.png", "desc": "Summons a monstrous horned illager mount that roars with concussive shockwaves, tramples crops, and knocks back opposing combatants."},
    {"id": "minecraft:witch_spawn_egg", "name": "Witch Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Witch Spawn Egg.png", "desc": "Summons a hostile alchemist that hurls splash potions of poison, slowness, and damage while chugging healing draughts under fire."},
    {"id": "minecraft:guardian_spawn_egg", "name": "Guardian Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Guardian Spawn Egg.png", "desc": "Summons a prickly aquatic defender of ocean monuments that fires sustained prismarine laser beams and retaliates with defensive spikes."},
    {"id": "minecraft:elder_guardian_spawn_egg", "name": "Elder Guardian Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 2, "wikiFile": "File:Elder Guardian Spawn Egg.png", "desc": "Summons the ancient spectral guardian boss that inflicts debilitating Mining Fatigue across ocean monuments and commands laser defenses."},
    {"id": "minecraft:phantom_spawn_egg", "name": "Phantom Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Phantom Spawn Egg.png", "desc": "Summons a swooping airborne predator that hunts players who neglect sleep for over three days. Yields durable elytra-repairing membranes."},
    {"id": "minecraft:breeze_spawn_egg", "name": "Breeze Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 2, "wikiFile": "File:Breeze Spawn Egg.png", "desc": "Summons an agile Trial Chamber elemental that leaps rapidly and fires explosive wind projectiles that trigger redstone switches and dispensers."},
    {"id": "minecraft:bogged_spawn_egg", "name": "Bogged Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Bogged Spawn Egg.png", "desc": "Summons a moss-covered swamp skeleton variant that shoots poison-tipped arrows and can be sheared for edible mushrooms."},
    {"id": "minecraft:silverfish_spawn_egg", "name": "Silverfish Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Silverfish Spawn Egg.png", "desc": "Summons a tiny burrowing arthropod that infests stone blocks in strongholds and calls nearby swarm allies when attacked."},
    {"id": "minecraft:magma_cube_spawn_egg", "name": "Magma Cube Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Magma Cube Spawn Egg.png", "desc": "Summons a bouncing fiery slime variant immune to lava. Splits into smaller cubes upon death and drops magma cream for fire resistance potions."},

    # === AGENT 2: Passive Mobs, Animals & Golems (Rounds 11-20) ===
    {"id": "minecraft:iron_golem_spawn_egg", "name": "Iron Golem Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 2, "wikiFile": "File:Iron Golem Spawn Egg.png", "desc": "Summons a massive iron construct that defends villagers from raiding monsters, tossing hostiles into the air with immense mechanical force."},
    {"id": "minecraft:snow_golem_spawn_egg", "name": "Snow Golem Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Snow Golem Spawn Egg.png", "desc": "Summons a snowman sentry that pelts hostile mobs with snowballs and leaves a trail of snow underfoot. Melts in hot biomes and rain."},
    {"id": "minecraft:allay_spawn_egg", "name": "Allay Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 2, "wikiFile": "File:Allay Spawn Egg.png", "desc": "Summons a gentle winged spirit that collects and delivers dropped items matching whichever item it holds, assisting in automated collection."},
    {"id": "minecraft:villager_spawn_egg", "name": "Villager Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Villager Spawn Egg.png", "desc": "Summons a civilized humanoid trader capable of claiming workstations, learning professions, and exchanging emeralds for enchanted gear."},
    {"id": "minecraft:wandering_trader_spawn_egg", "name": "Wandering Trader Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Wandering Trader Spawn Egg.png", "desc": "Summons an itinerant merchant accompanied by two llamas, offering exotic saplings, dyes, and rare flora from distant biomes."},
    {"id": "minecraft:wolf_spawn_egg", "name": "Wolf Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 0, "wikiFile": "File:Wolf Spawn Egg.png", "desc": "Summons a loyal canine companion tamable with bones. Defends its owner in combat and can be equipped with protective armadillo scute armor."},
    {"id": "minecraft:cat_spawn_egg", "name": "Cat Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 0, "wikiFile": "File:Cat Spawn Egg.png", "desc": "Summons a domestic feline tamable with fish. Wards off creepers and phantoms, and gifts morning foraging treasures to sleeping players."},
    {"id": "minecraft:axolotl_spawn_egg", "name": "Axolotl Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 2, "wikiFile": "File:Axolotl Spawn Egg.png", "desc": "Summons an adorable amphibious predator from lush caves that hunts drowned and guardians, playing dead to regenerate health in battle."},
    {"id": "minecraft:bee_spawn_egg", "name": "Bee Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Bee Spawn Egg.png", "desc": "Summons an industrious pollinating bee that gathers nectar from flowers, fertilizes crops, and manufactures sweet honey inside hives."},
    {"id": "minecraft:sniffer_spawn_egg", "name": "Sniffer Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 2, "wikiFile": "File:Sniffer Spawn Egg.png", "desc": "Summons a gentle ancient giant that roots through dirt with its keen snout to excavate extinct decorative torchflower and pitcher crop seeds."},
    {"id": "minecraft:sniffer_egg", "name": "Sniffer Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 2, "wikiFile": "File:Sniffer Egg.png", "desc": "Large prehistoric egg uncovered from ocean ruins. Hatches into a baby snifflet, incubating twice as fast when placed on moss blocks."},
    {"id": "minecraft:armadillo_spawn_egg", "name": "Armadillo Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Armadillo Spawn Egg.png", "desc": "Summons a savanna critter that rolls into a durable armored sphere when threatened. Drops scutes used to craft custom wolf armor."},
    {"id": "minecraft:frog_spawn_egg", "name": "Frog Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Frog Spawn Egg.png", "desc": "Summons an amphibious jumper that eats small magma cubes to produce luminous decorative froglights in temperate, warm, or cold colors."},
    {"id": "minecraft:strider_spawn_egg", "name": "Strider Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Strider Spawn Egg.png", "desc": "Summons a passive Nether creature that walks effortlessly across lava lakes. Rideable with a saddle and warped fungus on a stick."},
    {"id": "minecraft:camel_spawn_egg", "name": "Camel Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Camel Spawn Egg.png", "desc": "Summons a tall desert mount carrying two riders at once. Features a horizontal dash leap and elevates players out of melee monster reach."},
    {"id": "minecraft:glow_squid_spawn_egg", "name": "Glow Squid Spawn Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Glow Squid Spawn Egg.png", "desc": "Summons a luminescent subterranean cephalopod that drops glow ink sacs for crafting illuminated signs and glowing item frames."},
    {"id": "minecraft:turtle_egg", "name": "Turtle Egg", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 0, "wikiFile": "File:Turtle Egg.png", "desc": "Delicate reptile clutch laid on beach sands that slowly incubates into baby turtles. Highly vulnerable to trampling by zombies."},
    {"id": "minecraft:bee_nest", "name": "Bee Nest", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 0, "wikiFile": "File:Bee Nest.png", "desc": "Naturally occurring wild wooden colony block housing up to three pollinating bees, accumulating honey until harvested with shears."},
    {"id": "minecraft:beehive", "name": "Beehive", "mod": "Vanilla", "category": "mob_drops_and_food", "isHazard": False, "rarity": 1, "wikiFile": "File:Beehive.png", "desc": "Crafted apiary box housing domestic bees. Emits comparator redstone signals proportional to the five internal honey saturation levels."},

    # === AGENT 3: Create Kinetic Machinery & Train Transport (Rounds 21-30) ===
    {"id": "create:steam_engine", "name": "Steam Engine", "mod": "Create", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Block Steam Engine (Create).png", "desc": "High-output kinetic power generator mounted on heated fluid boilers. Converts intense thermal energy into massive rotational force and torque."},
    {"id": "create:mechanical_arm", "name": "Mechanical Arm", "mod": "Create", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Block Mechanical Arm.png", "desc": "Programmable articulating robotic arm that picks up items from belts, depots, or chutes and deposits them into target inventories."},
    {"id": "create:train_station", "name": "Train Station", "mod": "Create", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Block Train Station.png", "desc": "Logistical control hub for assembling, scheduling, and automatically docking modular rail locomotives and multi-carriage freight trains."},
    {"id": "create:display_board", "name": "Display Board", "mod": "Create", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 1, "wikiFile": "File:Block Display Board.png", "desc": "Modular flip-digit information terminal that displays dynamic readouts from trains, scoreboards, and factory production metrics."},
    {"id": "create:schematicannon", "name": "Schematicannon", "mod": "Create", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Block Schematicannon.png", "desc": "Autonomous artillery-styled 3D construction cannon. Fires architectural blocks directly from linked chests to build imported blueprints."},
    {"id": "create:flywheel", "name": "Flywheel", "mod": "Create", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 1, "wikiFile": "File:Block Flywheel.png", "desc": "Massive rotating iron wheel that interfaces with rotational engines to distribute rotational kinetic momentum across heavy industrial plants."},
    {"id": "create:item_vault", "name": "Item Vault", "mod": "Create", "category": "building_blocks", "isHazard": False, "rarity": 1, "wikiFile": "File:Block Item Vault.png", "desc": "Multi-block reinforced steel warehouse that connects into vast contiguous bulk storage structures with high-throughput belt interfaces."},
    {"id": "create:spout", "name": "Spout", "mod": "Create", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 1, "wikiFile": "File:Block Spout.png", "desc": "Industrial fluid dispenser positioned over conveyor lines that precisely fills bottles, buckets, and food items traveling on belts underneath."},
    {"id": "create:basin", "name": "Basin", "mod": "Create", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 1, "wikiFile": "File:Block Basin (Create).png", "desc": "Heavy reinforced mixing vessel placed under mechanical presses or mixers to brew alloys, liquid compounds, and compacted industrial materials."},
    {"id": "create:speedometer", "name": "Speedometer", "mod": "Create", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 0, "wikiFile": "File:Block Speedometer.png", "desc": "Dial gauge that measures and visually displays the current rotational speed in RPM of connected shafts and kinetic machinery."},

    # === AGENT 4: IndustrialCraft 2, GregTech & High-Tech (Rounds 31-40) ===
    {"id": "ic2:mfsu", "name": "MFSU", "mod": "IndustrialCraft 2", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Block MFSU.png", "desc": "Top-tier high-voltage energy storage unit with a capacity of 40,000,000 EU, utilizing lapotron crystals for massive grid buffering."},
    {"id": "ic2:mass_fabricator", "name": "Mass Fabricator", "mod": "IndustrialCraft 2", "category": "redstone_and_mechanisms", "isHazard": True, "rarity": 2, "wikiFile": "File:Block Mass Fabricator.png", "desc": "Pinnacle industrial matter synthesizer that consumes millions of EU to condense pure atomic UU-Matter for transmuting any element."},
    {"id": "ic2:induction_furnace", "name": "Induction Furnace", "mod": "IndustrialCraft 2", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Block Induction Furnace.png", "desc": "Dual-slot electric smelting furnace that increases operational speed up to 10000% as heat builds, smelting ingots with near-instant throughput."},
    {"id": "gregtech:industrial_centrifuge", "name": "Industrial Centrifuge", "mod": "GregTech", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Block Industrial Centrifuge.png", "desc": "Advanced multi-tier separator that spins mineral solutions and isotopes at extreme velocities to separate rare chemical elements and byproducts."},
    {"id": "gregtech:vacuum_freezer", "name": "Vacuum Freezer", "mod": "GregTech", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Block Vacuum Freezer (GregTech 5).png", "desc": "Cryogenic multi-block chamber that flash-cools molten hot metal ingots like tungsten and titanium fresh from industrial blast furnaces."},
    {"id": "thermal:magmatic_dynamo", "name": "Magmatic Dynamo", "mod": "Thermal Expansion", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 1, "wikiFile": "File:Block Magmatic Dynamo.png", "desc": "Geothermal power generator that consumes lava and blazing thermal fluids to generate stable Redstone Flux (RF) energy for industrial networks."},
    {"id": "thermal:compression_dynamo", "name": "Compression Dynamo", "mod": "Thermal Expansion", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 1, "wikiFile": "File:Block Compression Dynamo.png", "desc": "Internal combustion electrical generator that burns refined hydrocarbon fuels and bio-fuels alongside coolant liquids to generate high RF outputs."},
    {"id": "thermal:fluid_transposer", "name": "Fluid Transposer", "mod": "Thermal Expansion", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 1, "wikiFile": "File:Block Fluid Transposer.png", "desc": "Precision hydraulic machine that fills buckets, canisters, and tanks with fluids, or empties liquid containers into linked pipe networks."},
    {"id": "mekanism:chemical_injection_chamber", "name": "Chemical Injection Chamber", "mod": "Mekanism", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Block Chemical Injection Chamber.png", "desc": "Advanced gas-ore metallurgical reactor utilizing hydrogen chloride to process raw ores into fourfold shard outputs with maximum yield."},
    {"id": "mekanism:quantum_entangloporter", "name": "Quantum Entangloporter", "mod": "Mekanism", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Block Quantum Entangloporter.png", "desc": "Subatomic frequency transceiver that teleports energy, items, fluids, gases, and heat instantaneously across infinite distances and dimensions."},

    # === AGENT 5: Magic, Thaumic & Botanical Arcana (Rounds 41-50) ===
    {"id": "botania:runic_altar", "name": "Runic Altar", "mod": "Botania", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Block Runic Altar.png", "desc": "Mystical stone altar that infuses mana into elemental components to forge the sixteen elemental and astrological Runes of magic."},
    {"id": "botania:petal_apothecary", "name": "Petal Apothecary", "mod": "Botania", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 1, "wikiFile": "File:Block Petal Apothecary.png", "desc": "Water-filled stone crucible that binds mystical floral petals and seeds to synthesize all generating and functional flora in Botania."},
    {"id": "botania:mana_spreader", "name": "Mana Spreader", "mod": "Botania", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 1, "wikiFile": "File:Block Mana Spreader.png", "desc": "Livingwood optical device that pulses concentrated bursts of raw mana from generating flowers toward mana pools and consumers."},
    {"id": "botania:mana_pylon", "name": "Mana Pylon", "mod": "Botania", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Block Mana Pylon.png", "desc": "Crystalline structure that focuses ambient mana to power the Enchanter and stabilize opening portals to the elven realm of Alfheim."},
    {"id": "thaumcraft:research_table", "name": "Research Table", "mod": "Thaumcraft", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 1, "wikiFile": "File:Block Research Table (Thaumcraft 3).png", "desc": "Scholarly desk equipped with scribing tools and parchment where thaumaturges connect primal aspects to unlock arcane discoveries and recipes."},
    {"id": "thaumcraft:warded_jar", "name": "Warded Jar", "mod": "Thaumcraft", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 1, "wikiFile": "File:Block Warded Jar (Thaumcraft 3).png", "desc": "Enchanted glass container that securely stores up to 250 units of distilled essentia without venting dangerous flux taint into the atmosphere."},
    {"id": "thaumcraft:arcane_pedestal", "name": "Arcane Pedestal", "mod": "Thaumcraft", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 1, "wikiFile": "File:Block Arcane Pedestal (Thaumcraft 4).png", "desc": "Chiseled arcane stone pedestal arranged around the Infusion Altar to hold catalyst ingredients during symmetrical ritual synthesis."},
    {"id": "thaumcraft:arcane_bore", "name": "Arcane Bore", "mod": "Thaumcraft", "category": "redstone_and_mechanisms", "isHazard": False, "rarity": 2, "wikiFile": "File:Block Arcane Bore (Thaumcraft 3).png", "desc": "Heavy enchanted excavator beam cannon powered by magic foci that disintegrates underground rock and funnels raw ores into chests."},
    {"id": "thaumcraft:tainted_soil", "name": "Tainted Soil", "mod": "Thaumcraft", "category": "building_blocks", "isHazard": True, "rarity": 2, "wikiFile": "File:Block Tainted Soil (Thaumcraft 4).png", "desc": "Corrupted eldritch ground infested by excessive magical flux pollution. Spreads fibrous taint tentacles and poisons living beings who walk upon it."},
    {"id": "thaumcraft:eldritch_altar", "name": "Eldritch Altar", "mod": "Thaumcraft", "category": "building_blocks", "isHazard": True, "rarity": 2, "wikiFile": "File:Block Eldritch Altar.png", "desc": "Sinister alien stone altar marking ancient gateways to the Eldritch Outer Lands, flanked by terrifying void guardians."}
]

def fetch_wiki_url(wiki_file):
    # Try Minecraft Wiki first
    params = urllib.parse.urlencode({
        "action": "query",
        "titles": wiki_file,
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json"
    })
    for wiki_base in ["https://minecraft.wiki/api.php?", "https://ftbwiki.org/api.php?"]:
        try:
            req = urllib.request.Request(wiki_base + params, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.load(resp)
            pages = data.get("query", {}).get("pages", {})
            for p in pages.values():
                if "imageinfo" in p and p["imageinfo"]:
                    return p["imageinfo"][0]["url"], wiki_base
        except Exception as e:
            pass
    return None, None

def download_png(url, dest_path):
    cache_name = hashlib.sha256(url.encode()).hexdigest() + ".png"
    cached = CACHE_DIR / cache_name
    if cached.exists():
        data = cached.read_bytes()
    else:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        cached.write_bytes(data)

    # Validate PNG
    if len(data) < 24 or data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f"Not a valid PNG: {url}")
    dest_path.write_bytes(data)
    w, h = struct.unpack(">II", data[16:24])
    return w, h, len(data)

def process_item(item):
    wiki_file = item["wikiFile"]
    img_url, source_wiki = fetch_wiki_url(wiki_file)
    if not img_url:
        # Try alternate naming
        alt_file = wiki_file.replace("File:Block ", "File:").replace("File:", "File:Block ")
        img_url, source_wiki = fetch_wiki_url(alt_file)
    
    if not img_url:
        print(f"[FAIL] Could not resolve image for {item['name']} ({wiki_file})")
        return None

    safe_id = re.sub(r'[^a-z0-9_]', '_', item["id"].lower())
    dest_filename = f"{safe_id}.png"
    dest_path = DEST_DIR / dest_filename

    try:
        w, h, size = download_png(img_url, dest_path)
        rel_texture = f"/textures/modded/{dest_filename}"
        print(f"[OK] {item['name']} ({item['mod']}): {w}x{h} ({size}B) from {source_wiki[:28]}")
        return {
            "id": item["id"],
            "name": item["name"],
            "mod": item["mod"],
            "category": item["category"],
            "description": item["desc"],
            "isHazard": item["isHazard"],
            "rarity": item["rarity"],
            "texture": rel_texture,
            "sourceUrl": img_url
        }
    except Exception as e:
        print(f"[ERROR] Downloading {item['name']}: {e}")
        return None

def main():
    print(f"Executing 5-domain harvest across {len(HARVEST_TARGETS)} iconic blocks & mobs...")
    with ThreadPoolExecutor(max_workers=10) as pool:
        results = list(pool.map(process_item, HARVEST_TARGETS))

    valid_new = [r for r in results if r is not None]
    print(f"\nSuccessfully harvested {len(valid_new)} of {len(HARVEST_TARGETS)} targets!")

    # Merge into public/data/blocks.json
    blocks_file = ROOT / "public/data/blocks.json"
    current_blocks = json.loads(blocks_file.read_text()) if blocks_file.exists() else []
    existing_ids = {b["id"]: i for i, b in enumerate(current_blocks)}

    added = 0
    updated = 0
    for n in valid_new:
        clean_entry = {
            "id": n["id"],
            "name": n["name"],
            "mod": n["mod"],
            "category": n["category"],
            "description": n["description"],
            "texture": n["texture"],
            "isHazard": n["isHazard"],
            "rarity": n["rarity"]
        }
        if n["id"] in existing_ids:
            # Update with better texture/desc
            current_blocks[existing_ids[n["id"]]].update(clean_entry)
            updated += 1
        else:
            current_blocks.append(clean_entry)
            added += 1

    blocks_file.write_text(json.dumps(current_blocks, indent=2, ensure_ascii=False) + "\n")
    print(f"Updated {blocks_file}: {len(current_blocks)} total entries (+{added} new, {updated} upgraded)")

if __name__ == "__main__":
    main()