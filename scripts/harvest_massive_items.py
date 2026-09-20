import os
import json
import hashlib
import urllib.request
import struct

print("=== MASSIVE ITEM INGESTION: VANILLA + 14 MODS ===")

VANILLA_URL = "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.2/items/"
CREATE_URL = "https://raw.githubusercontent.com/Creators-of-Create/Create/fc9535d82a29419164a1e9dc9c678bdcddeab30d/src/main/resources/assets/create/textures/item/"
AE2_URL = "https://raw.githubusercontent.com/AppliedEnergistics/Applied-Energistics-2/b7cf5822d9c128a61d9291cb2c1f92319253e4f0/src/main/resources/assets/ae2/textures/item/"
MEK_URL = "https://raw.githubusercontent.com/mekanism/Mekanism/11162452affe7b17b25cde251308c9d047c42e87/src/main/resources/assets/mekanism/textures/item/"
BOT_URL = "https://raw.githubusercontent.com/VazkiiMods/Botania/d720e4b164b4c9850e36009c63c303fb8ed12389/Xplat/src/main/resources/assets/botania/textures/item/"

RAW_ITEMS = [
    # =========================================================================
    # 1. VANILLA MINECRAFT: METALS, GEMS, MINERALS & MATERIALS
    # =========================================================================
    ("minecraft:coal", "Coal", "Vanilla", "ores_and_gems", "Combustible fossil mineral. Primary fuel for smelting.", True, "coal.png", VANILLA_URL),
    ("minecraft:charcoal", "Charcoal", "Vanilla", "ores_and_gems", "Renewable carbon fuel produced by pyrolyzing wood logs in a furnace.", True, "charcoal.png", VANILLA_URL),
    ("minecraft:raw_iron", "Raw Iron", "Vanilla", "ores_and_gems", "Unrefined dense iron ore chunk mined from subterranean stone.", False, "raw_iron.png", VANILLA_URL),
    ("minecraft:iron_ingot", "Iron Ingot", "Vanilla", "ores_and_gems", "Standard refined iron bar. Essential for machinery, armor, and tools.", False, "iron_ingot.png", VANILLA_URL),
    ("minecraft:iron_nugget", "Iron Nugget", "Vanilla", "ores_and_gems", "Small metallic iron fragment, nine of which form a full ingot.", False, "iron_nugget.png", VANILLA_URL),
    ("minecraft:raw_copper", "Raw Copper", "Vanilla", "ores_and_gems", "Native unrefined copper cluster mined from deep veins.", False, "raw_copper.png", VANILLA_URL),
    ("minecraft:copper_ingot", "Copper Ingot", "Vanilla", "ores_and_gems", "Conductive reddish-orange metallic ingot used for lightning rods and wiring.", False, "copper_ingot.png", VANILLA_URL),
    ("minecraft:raw_gold", "Raw Gold", "Vanilla", "ores_and_gems", "Dense raw gold nugget cluster extracted from underground strata.", False, "raw_gold.png", VANILLA_URL),
    ("minecraft:gold_ingot", "Gold Ingot", "Vanilla", "ores_and_gems", "Precious soft metal ingot with high magical and electrical conductivity.", False, "gold_ingot.png", VANILLA_URL),
    ("minecraft:gold_nugget", "Gold Nugget", "Vanilla", "ores_and_gems", "Small precious flake of gold dropped by piglins or broken down from ingots.", False, "gold_nugget.png", VANILLA_URL),
    ("minecraft:diamond", "Diamond", "Vanilla", "ores_and_gems", "Rare and indestructible gemstone forming the pinnacle of survival gear.", False, "diamond.png", VANILLA_URL),
    ("minecraft:emerald", "Emerald", "Vanilla", "ores_and_gems", "Lustrous green crystal serving as universal trade currency with villagers.", False, "emerald.png", VANILLA_URL),
    ("minecraft:lapis_lazuli", "Lapis Lazuli", "Vanilla", "ores_and_gems", "Deep azure mineral required to catalyze enchanting tables.", False, "lapis_lazuli.png", VANILLA_URL),
    ("minecraft:amethyst_shard", "Amethyst Shard", "Vanilla", "ores_and_gems", "Resonant purple crystal harvested from underground geodes.", False, "amethyst_shard.png", VANILLA_URL),
    ("minecraft:quartz", "Nether Quartz", "Vanilla", "ores_and_gems", "Crystalline mineral extracted from Nether strata. Crucial for redstone logic.", False, "quartz.png", VANILLA_URL),
    ("minecraft:netherite_scrap", "Netherite Scrap", "Vanilla", "ores_and_gems", "Refractory scrap yielded by smelting ancient debris in a blast furnace.", False, "netherite_scrap.png", VANILLA_URL),
    ("minecraft:netherite_ingot", "Netherite Ingot", "Vanilla", "ores_and_gems", "Ultra-dense Nether alloy of ancient debris and gold. Immune to lava.", False, "netherite_ingot.png", VANILLA_URL),
    ("minecraft:flint", "Flint", "Vanilla", "ores_and_gems", "Sharp sedimentary rock excavated from gravel beds.", False, "flint.png", VANILLA_URL),
    ("minecraft:clay_ball", "Clay Ball", "Vanilla", "building_blocks", "Soft malleable natural clay clump harvested from lake beds.", False, "clay_ball.png", VANILLA_URL),
    ("minecraft:brick", "Brick", "Vanilla", "building_blocks", "Hardened ceramic ingot fired in a furnace from clay.", False, "brick.png", VANILLA_URL),
    ("minecraft:nether_brick", "Nether Brick", "Vanilla", "building_blocks", "Fire-hardened ceramic ingot smelted from netherrack.", False, "nether_brick.png", VANILLA_URL),
    ("minecraft:prismarine_shard", "Prismarine Shard", "Vanilla", "building_blocks", "Aquatic mineral shard dropped by ocean guardians.", False, "prismarine_shard.png", VANILLA_URL),
    ("minecraft:prismarine_crystals", "Prismarine Crystals", "Vanilla", "building_blocks", "Luminescent sea crystals harvested to craft sea lanterns.", False, "prismarine_crystals.png", VANILLA_URL),
    ("minecraft:honeycomb", "Honeycomb", "Vanilla", "building_blocks", "Waxy natural comb sheared from bee nests for waxing copper.", False, "honeycomb.png", VANILLA_URL),

    # =========================================================================
    # 2. VANILLA MINECRAFT: FOOD, CROPS & CONSUMABLES
    # =========================================================================
    ("minecraft:apple", "Apple", "Vanilla", "mob_drops_and_food", "Fresh orchard fruit gathered from oak leaves.", False, "apple.png", VANILLA_URL),
    ("minecraft:golden_apple", "Golden Apple", "Vanilla", "mob_drops_and_food", "Mystical fruit encased in gold, granting absorption and regeneration.", False, "golden_apple.png", VANILLA_URL),
    ("minecraft:enchanted_golden_apple", "Enchanted Golden Apple", "Vanilla", "mob_drops_and_food", "Legendary artifact fruit bestowing supernatural resistance and fire immunity.", False, "enchanted_golden_apple.png", VANILLA_URL),
    ("minecraft:bread", "Bread", "Vanilla", "mob_drops_and_food", "Baked loaf prepared from agricultural wheat grain.", False, "bread.png", VANILLA_URL),
    ("minecraft:cooked_beef", "Steak", "Vanilla", "mob_drops_and_food", "Tender grilled steak offering supreme hunger saturation.", False, "cooked_beef.png", VANILLA_URL),
    ("minecraft:cooked_porkchop", "Cooked Porkchop", "Vanilla", "mob_drops_and_food", "Hearty roasted porkchop with high nutritional value.", False, "cooked_porkchop.png", VANILLA_URL),
    ("minecraft:cooked_mutton", "Cooked Mutton", "Vanilla", "mob_drops_and_food", "Flavorful roasted sheep meat.", False, "cooked_mutton.png", VANILLA_URL),
    ("minecraft:cooked_chicken", "Cooked Chicken", "Vanilla", "mob_drops_and_food", "Wholesome roasted poultry.", False, "cooked_chicken.png", VANILLA_URL),
    ("minecraft:cooked_salmon", "Cooked Salmon", "Vanilla", "mob_drops_and_food", "Nutritious grilled pink salmon fillet.", False, "cooked_salmon.png", VANILLA_URL),
    ("minecraft:cooked_cod", "Cooked Cod", "Vanilla", "mob_drops_and_food", "Flaky white ocean fish cooked over campfire.", False, "cooked_cod.png", VANILLA_URL),
    ("minecraft:baked_potato", "Baked Potato", "Vanilla", "mob_drops_and_food", "Hot baked root vegetable roasted in a furnace.", False, "baked_potato.png", VANILLA_URL),
    ("minecraft:golden_carrot", "Golden Carrot", "Vanilla", "mob_drops_and_food", "Carrot encased in golden flakes. Top-tier survival food.", False, "golden_carrot.png", VANILLA_URL),
    ("minecraft:carrot", "Carrot", "Vanilla", "mob_drops_and_food", "Orange garden vegetable cultivated on tilled soil.", False, "carrot.png", VANILLA_URL),
    ("minecraft:potato", "Potato", "Vanilla", "mob_drops_and_food", "Starchy edible tuber grown on farmland.", False, "potato.png", VANILLA_URL),
    ("minecraft:beetroot", "Beetroot", "Vanilla", "mob_drops_and_food", "Crimson root vegetable used for red dye and hearty soup.", False, "beetroot.png", VANILLA_URL),
    ("minecraft:beetroot_soup", "Beetroot Soup", "Vanilla", "mob_drops_and_food", "Warm red vegetable soup served in a wooden bowl.", False, "beetroot_soup.png", VANILLA_URL),
    ("minecraft:mushroom_stew", "Mushroom Stew", "Vanilla", "mob_drops_and_food", "Classic earthy broth made from red and brown mushrooms.", False, "mushroom_stew.png", VANILLA_URL),
    ("minecraft:cookie", "Cookie", "Vanilla", "mob_drops_and_food", "Sweet baked snack crafted from wheat and cocoa beans.", False, "cookie.png", VANILLA_URL),
    ("minecraft:melon_slice", "Melon Slice", "Vanilla", "mob_drops_and_food", "Juicy refreshing fruit slice harvested from melons.", False, "melon_slice.png", VANILLA_URL),
    ("minecraft:sweet_berries", "Sweet Berries", "Vanilla", "mob_drops_and_food", "Tart red berries harvested from thorny taiga bushes.", False, "sweet_berries.png", VANILLA_URL),
    ("minecraft:glow_berries", "Glow Berries", "Vanilla", "mob_drops_and_food", "Bioluminescent fruit growing on lush cave vines.", False, "glow_berries.png", VANILLA_URL),
    ("minecraft:honey_bottle", "Honey Bottle", "Vanilla", "mob_drops_and_food", "Pure sweet honey bottled from beehives, curing poison.", False, "honey_bottle.png", VANILLA_URL),
    ("minecraft:wheat", "Wheat", "Vanilla", "mob_drops_and_food", "Golden cereal crop harvested for bread making and breeding.", False, "wheat.png", VANILLA_URL),
    ("minecraft:sugar", "Sugar", "Vanilla", "mob_drops_and_food", "Refined crystalline sweetener extracted from sugar cane.", False, "sugar.png", VANILLA_URL),
    ("minecraft:egg", "Egg", "Vanilla", "mob_drops_and_food", "Avian egg laid by chickens, used for baking cakes and pies.", False, "egg.png", VANILLA_URL),

    # =========================================================================
    # 3. VANILLA MINECRAFT: MOB DROPS, MONSTER LOOT & ARTIFACTS
    # =========================================================================
    ("minecraft:bone", "Bone", "Vanilla", "mob_drops_and_food", "Skeletal remain dropped by Skeletons. Ground into bonemeal.", False, "bone.png", VANILLA_URL),
    ("minecraft:gunpowder", "Gunpowder", "Vanilla", "building_blocks", "Volatile combustible powder dropped by Creepers. Used in TNT.", True, "gunpowder.png", VANILLA_URL),
    ("minecraft:string", "String", "Vanilla", "mechanical_and_logistics", "Strong fibrous silk dropped by Spiders, used for bows and fishing rods.", False, "string.png", VANILLA_URL),
    ("minecraft:spider_eye", "Spider Eye", "Vanilla", "mob_drops_and_food", "Poisonous arachnid eye used in alchemical brewing.", False, "spider_eye.png", VANILLA_URL),
    ("minecraft:fermented_spider_eye", "Fermented Spider Eye", "Vanilla", "magic_and_ritual", "Alchemically corrupted eye used to invert potion effects.", False, "fermented_spider_eye.png", VANILLA_URL),
    ("minecraft:rotten_flesh", "Rotten Flesh", "Vanilla", "mob_drops_and_food", "Decayed meat dropped by Zombies. Used to breed wolves or trade.", False, "rotten_flesh.png", VANILLA_URL),
    ("minecraft:slime_ball", "Slimeball", "Vanilla", "mechanical_and_logistics", "Elastic adhesive substance dropped by Slimes. Used for sticky pistons.", False, "slime_ball.png", VANILLA_URL),
    ("minecraft:ender_pearl", "Ender Pearl", "Vanilla", "magic_and_ritual", "Dimension-warping orb dropped by Endermen for short-range teleportation.", False, "ender_pearl.png", VANILLA_URL),
    ("minecraft:blaze_rod", "Blaze Rod", "Vanilla", "magic_and_ritual", "Thermic incendiary rod dropped by Blazes in Nether fortresses.", True, "blaze_rod.png", VANILLA_URL),
    ("minecraft:blaze_powder", "Blaze Powder", "Vanilla", "magic_and_ritual", "Ignited powder ground from blaze rods. Essential brewing fuel.", True, "blaze_powder.png", VANILLA_URL),
    ("minecraft:ghast_tear", "Ghast Tear", "Vanilla", "magic_and_ritual", "Melancholy drop from Nether Ghasts, brewed into regeneration potions.", False, "ghast_tear.png", VANILLA_URL),
    ("minecraft:magma_cream", "Magma Cream", "Vanilla", "magic_and_ritual", "Viscous fiery slime dropped by Magma Cubes for fire resistance.", True, "magma_cream.png", VANILLA_URL),
    ("minecraft:nether_star", "Nether Star", "Vanilla", "magic_and_ritual", "Triumphant cosmic core dropped by the Wither to power Beacons.", False, "nether_star.png", VANILLA_URL),
    ("minecraft:shulker_shell", "Shulker Shell", "Vanilla", "mechanical_and_logistics", "Carapace plate harvested from End Shulkers to craft portable Shulker Boxes.", False, "shulker_shell.png", VANILLA_URL),
    ("minecraft:phantom_membrane", "Phantom Membrane", "Vanilla", "magic_and_ritual", "Aerodynamic wing membrane dropped by Phantoms to repair Elytra.", False, "phantom_membrane.png", VANILLA_URL),
    ("minecraft:nautilus_shell", "Nautilus Shell", "Vanilla", "magic_and_ritual", "Rare spiral shell recovered from drowned zombies to craft Conduits.", False, "nautilus_shell.png", VANILLA_URL),
    ("minecraft:heart_of_the_sea", "Heart of the Sea", "Vanilla", "magic_and_ritual", "Pulsating oceanic core recovered from buried treasure chests.", False, "heart_of_the_sea.png", VANILLA_URL),
    ("minecraft:feather", "Feather", "Vanilla", "mob_drops_and_food", "Plumage dropped by chickens, used for fletching arrows and writing quills.", False, "feather.png", VANILLA_URL),
    ("minecraft:leather", "Leather", "Vanilla", "mob_drops_and_food", "Tough animal hide collected from cows and horses for armor and books.", False, "leather.png", VANILLA_URL),
    ("minecraft:ink_sac", "Ink Sac", "Vanilla", "mob_drops_and_food", "Black pigment bladder dropped by squids for dark dyeing.", False, "ink_sac.png", VANILLA_URL),
    ("minecraft:glow_ink_sac", "Glow Ink Sac", "Vanilla", "magic_and_ritual", "Bioluminescent ink bladder dropped by glow squids to illuminate signs.", False, "glow_ink_sac.png", VANILLA_URL),
    ("minecraft:dragon_breath", "Dragon's Breath", "Vanilla", "magic_and_ritual", "Gaseous magical residue bottled from the Ender Dragon's breath.", False, "dragon_breath.png", VANILLA_URL),
    ("minecraft:nether_wart", "Nether Wart", "Vanilla", "magic_and_ritual", "Fungal Nether parasite. The universal foundation for awkward potions.", False, "nether_wart.png", VANILLA_URL),
    ("minecraft:totem_of_undying", "Totem of Undying", "Vanilla", "magic_and_ritual", "Ancient sacred idol dropped by Evokers that cancels fatal damage.", False, "totem_of_undying.png", VANILLA_URL),

    # =========================================================================
    # 4. VANILLA MINECRAFT: TOOLS, WEAPONS & COMBAT
    # =========================================================================
    ("minecraft:diamond_sword", "Diamond Sword", "Vanilla", "mob_drops_and_food", "Razor-sharp melee blade forged from diamonds.", False, "diamond_sword.png", VANILLA_URL),
    ("minecraft:diamond_pickaxe", "Diamond Pickaxe", "Vanilla", "mechanical_and_logistics", "Supreme excavation pick capable of harvesting obsidian.", False, "diamond_pickaxe.png", VANILLA_URL),
    ("minecraft:diamond_axe", "Diamond Axe", "Vanilla", "mechanical_and_logistics", "Heavy timber-felling axe and crushing combat weapon.", False, "diamond_axe.png", VANILLA_URL),
    ("minecraft:diamond_shovel", "Diamond Shovel", "Vanilla", "mechanical_and_logistics", "Rapid earth excavation spade forged from diamond.", False, "diamond_shovel.png", VANILLA_URL),
    ("minecraft:netherite_sword", "Netherite Sword", "Vanilla", "mob_drops_and_food", "Indestructible fireproof sword forged with netherite.", False, "netherite_sword.png", VANILLA_URL),
    ("minecraft:netherite_pickaxe", "Netherite Pickaxe", "Vanilla", "mechanical_and_logistics", "The most durable mining implement in Minecraft.", False, "netherite_pickaxe.png", VANILLA_URL),
    ("minecraft:bow", "Bow", "Vanilla", "mob_drops_and_food", "Ranged combat weapon strung with spider silk.", False, "bow.png", VANILLA_URL),
    ("minecraft:crossbow", "Crossbow", "Vanilla", "mob_drops_and_food", "High-velocity mechanical projectile launcher.", False, "crossbow.png", VANILLA_URL),
    ("minecraft:arrow", "Arrow", "Vanilla", "mob_drops_and_food", "Fletched projectile tipped with sharp flint.", False, "arrow.png", VANILLA_URL),
    ("minecraft:spectral_arrow", "Spectral Arrow", "Vanilla", "magic_and_ritual", "Luminescent arrow that outlines hit targets through walls.", False, "spectral_arrow.png", VANILLA_URL),
    ("minecraft:shield", "Shield", "Vanilla", "building_blocks", "Sturdy reinforced barrier that deflects physical attacks and explosions.", False, "shield.png", VANILLA_URL),
    ("minecraft:trident", "Trident", "Vanilla", "magic_and_ritual", "Ancient marine weapon dropped by Drowned, channeled with lightning.", False, "trident.png", VANILLA_URL),
    ("minecraft:flint_and_steel", "Flint and Steel", "Vanilla", "building_blocks", "Tool that produces sparks to ignite fires and activate Nether portals.", True, "flint_and_steel.png", VANILLA_URL),
    ("minecraft:shears", "Shears", "Vanilla", "mechanical_and_logistics", "Two-bladed iron cutting tool for wool and foliage.", False, "shears.png", VANILLA_URL),
    ("minecraft:spyglass", "Spyglass", "Vanilla", "mechanical_and_logistics", "Optical telescope tube crafted from copper and amethyst.", False, "spyglass.png", VANILLA_URL),
    ("minecraft:compass", "Compass", "Vanilla", "mechanical_and_logistics", "Magnetic navigational instrument pointing to world spawn.", False, "compass.png", VANILLA_URL),
    ("minecraft:recovery_compass", "Recovery Compass", "Vanilla", "magic_and_ritual", "Echo-infused compass that points to the player's last death location.", False, "recovery_compass.png", VANILLA_URL),
    ("minecraft:clock", "Clock", "Vanilla", "mechanical_and_logistics", "Astronomical gold dial displaying celestial sun and moon phases.", False, "clock.png", VANILLA_URL),
    ("minecraft:elytra", "Elytra", "Vanilla", "mechanical_and_logistics", "End-ship glider wings that bestow genuine aerodynamic flight.", False, "elytra.png", VANILLA_URL),

    # =========================================================================
    # 5. VANILLA MINECRAFT: TRANSPORT, POTIONS & UTILITY
    # =========================================================================
    ("minecraft:minecart", "Minecart", "Vanilla", "mechanical_and_logistics", "Wheeled rail vehicle for player and cargo transit.", False, "minecart.png", VANILLA_URL),
    ("minecraft:chest_minecart", "Minecart with Chest", "Vanilla", "mechanical_and_logistics", "Rail vehicle carrying a storage chest for automated logistics.", False, "chest_minecart.png", VANILLA_URL),
    ("minecraft:hopper_minecart", "Minecart with Hopper", "Vanilla", "mechanical_and_logistics", "High-speed rail hopper that vacuums items through solid blocks.", False, "hopper_minecart.png", VANILLA_URL),
    ("minecraft:tnt_minecart", "Minecart with TNT", "Vanilla", "building_blocks", "Hazardous explosive rail cart detonated on high-speed derailment.", True, "tnt_minecart.png", VANILLA_URL),
    ("minecraft:oak_boat", "Oak Boat", "Vanilla", "mechanical_and_logistics", "Watercraft constructed from oak planks for rapid river traversal.", False, "oak_boat.png", VANILLA_URL),
    ("minecraft:saddle", "Saddle", "Vanilla", "mechanical_and_logistics", "Leather riding gear required to steer tamed horses, pigs, and striders.", False, "saddle.png", VANILLA_URL),
    ("minecraft:lead", "Lead", "Vanilla", "mechanical_and_logistics", "Strong elastic rope used to tether and guide livestock.", False, "lead.png", VANILLA_URL),
    ("minecraft:name_tag", "Name Tag", "Vanilla", "mechanical_and_logistics", "Engraved label tag that bestows permanent names on creatures.", False, "name_tag.png", VANILLA_URL),
    ("minecraft:bucket", "Bucket", "Vanilla", "mechanical_and_logistics", "Iron vessel for scooping and transporting liquids.", False, "bucket.png", VANILLA_URL),
    ("minecraft:water_bucket", "Water Bucket", "Vanilla", "mechanical_and_logistics", "Bucket holding fresh spring water.", False, "water_bucket.png", VANILLA_URL),
    ("minecraft:lava_bucket", "Lava Bucket", "Vanilla", "building_blocks", "Reinforced bucket containing molten geothermal lava.", True, "lava_bucket.png", VANILLA_URL),
    ("minecraft:glass_bottle", "Glass Bottle", "Vanilla", "magic_and_ritual", "Empty glass phial ready to be filled with potions or honey.", False, "glass_bottle.png", VANILLA_URL),
    ("minecraft:potion", "Potion", "Vanilla", "magic_and_ritual", "Brewed alchemical concoction granting mystical status effects.", False, "potion.png", VANILLA_URL),
    ("minecraft:splash_potion", "Splash Potion", "Vanilla", "magic_and_ritual", "Throwable potion flask that shatters into area-of-effect vapors.", False, "splash_potion.png", VANILLA_URL),
    ("minecraft:music_disc_pigstep", "Music Disc (Pigstep)", "Vanilla", "mob_drops_and_food", "Rare Nether vinyl record recovered from Piglin Bastion remnants.", False, "music_disc_pigstep.png", VANILLA_URL),
    ("minecraft:book", "Book", "Vanilla", "building_blocks", "Bound paper manuscript bound with leather for bookshelves.", False, "book.png", VANILLA_URL),
    ("minecraft:enchanted_book", "Enchanted Book", "Vanilla", "magic_and_ritual", "Tome imbued with arcane enchantments ready for anvil application.", False, "enchanted_book.png", VANILLA_URL),
    ("minecraft:fire_charge", "Fire Charge", "Vanilla", "building_blocks", "Pyrotechnic combustible projectile fired from dispensers.", True, "fire_charge.png", VANILLA_URL),

    # =========================================================================
    # 6. CREATE MOD: KINETIC MECHANISMS, SHEETS, INSERTS & TOOLS
    # =========================================================================
    ("create:brass_ingot", "Brass Ingot", "Create", "ores_and_gems", "Alloy of copper and zinc melted in a heated mixer. Fundamental material for brass machinery.", False, "brass_ingot.png", CREATE_URL),
    ("create:zinc_ingot", "Zinc Ingot", "Create", "ores_and_gems", "Refined metal ingot obtained by smelting zinc ore. Used to cast brass alloys.", False, "zinc_ingot.png", CREATE_URL),
    ("create:andesite_alloy", "Andesite Alloy", "Create", "building_blocks", "Dense alloy combining andesite rock with iron or zinc. The foundation of kinetic tech.", False, "andesite_alloy.png", CREATE_URL),
    ("create:brass_sheet", "Brass Sheet", "Create", "building_blocks", "Flat sheet of brass pressed by a mechanical press. Used in brass casings and tunnels.", False, "brass_sheet.png", CREATE_URL),
    ("create:iron_sheet", "Iron Sheet", "Create", "building_blocks", "Plate of compressed iron processed through a mechanical press for reinforced chutes.", False, "iron_sheet.png", CREATE_URL),
    ("create:copper_sheet", "Copper Sheet", "Create", "building_blocks", "Pressed copper plate used in fluid pipes, pumps, and copper casings.", False, "copper_sheet.png", CREATE_URL),
    ("create:golden_sheet", "Golden Sheet", "Create", "building_blocks", "Delicate gold foil pressed for high-precision kinetic components.", False, "golden_sheet.png", CREATE_URL),
    ("create:precision_mechanism", "Precision Mechanism", "Create", "mechanical_and_logistics", "Intricate clockwork assembly crafted on sequence assembly lines.", False, "precision_mechanism.png", CREATE_URL),
    ("create:incomplete_precision_mechanism", "Incomplete Precision Mechanism", "Create", "mechanical_and_logistics", "Clockwork assembly in mid-production on an automated sequencing line.", False, "incomplete_precision_mechanism.png", CREATE_URL),
    ("create:electron_tube", "Electron Tube", "Create", "power_and_digital", "Vacuum tube with polished rose quartz and iron sheet for smart observers.", False, "electron_tube.png", CREATE_URL),
    ("create:wrench", "Create Wrench", "Create", "mechanical_and_logistics", "Engineer multi-tool for rotating kinetic gearboxes and configuring machines.", False, "wrench.png", CREATE_URL),
    ("create:whisk", "Mechanical Whisk", "Create", "mechanical_and_logistics", "Kinetic mixer attachment designed to blend fluids and ingredients in a basin.", False, "whisk.png", CREATE_URL),
    ("create:propeller", "Fan Propeller", "Create", "mechanical_and_logistics", "Bladed propeller used inside encased fans for bulk washing and blasting.", False, "propeller.png", CREATE_URL),
    ("create:super_glue", "Super Glue", "Create", "mechanical_and_logistics", "Industrial adhesive used to bind blocks together into contraptions and trains.", False, "super_glue.png", CREATE_URL),
    ("create:sand_paper", "Sandpaper", "Create", "mechanical_and_logistics", "Abrasive paper sheet used to polish rose quartz into optical lenses.", False, "sand_paper.png", CREATE_URL),
    ("create:polished_rose_quartz", "Polished Rose Quartz", "Create", "magic_and_ritual", "Rose quartz smoothed with sandpaper to optical purity for electron tubes.", False, "polished_rose_quartz.png", CREATE_URL),
    ("create:crushed_raw_iron", "Crushed Raw Iron", "Create", "ores_and_gems", "Raw iron chunk pulverized by crushing wheels for high mineral yield.", False, "crushed_raw_iron.png", CREATE_URL),
    ("create:crushed_raw_copper", "Crushed Raw Copper", "Create", "ores_and_gems", "Raw copper crushed into gravel-like chunks for washing.", False, "crushed_raw_copper.png", CREATE_URL),
    ("create:crushed_raw_gold", "Crushed Raw Gold", "Create", "ores_and_gems", "Concentrated crushed gold ready for bulk washing into nuggets.", False, "crushed_raw_gold.png", CREATE_URL),
    ("create:crushed_raw_zinc", "Crushed Raw Zinc", "Create", "ores_and_gems", "Pulverized zinc ore ready for chemical washing.", False, "crushed_raw_zinc.png", CREATE_URL),
    ("create:brass_nugget", "Brass Nugget", "Create", "ores_and_gems", "Small fractional piece of brass alloy.", False, "brass_nugget.png", CREATE_URL),
    ("create:zinc_nugget", "Zinc Nugget", "Create", "ores_and_gems", "Small fractional piece of zinc metal.", False, "zinc_nugget.png", CREATE_URL),
    ("create:copper_nugget", "Copper Nugget", "Create", "ores_and_gems", "Small fractional piece of native copper.", False, "copper_nugget.png", CREATE_URL),
    ("create:belt_connector", "Mechanical Belt Connector", "Create", "mechanical_and_logistics", "Spool of rubber belt links used to connect shafts across distances.", False, "belt_connector.png", CREATE_URL),
    ("create:attribute_filter", "Attribute Filter", "Create", "mechanical_and_logistics", "Smart logistics filter card that checks complex item properties and tags.", False, "attribute_filter.png", CREATE_URL),
    ("create:bar_of_chocolate", "Bar of Chocolate", "Create", "mob_drops_and_food", "Rich confectionery bar made by pouring melted chocolate into a basin.", False, "bar_of_chocolate.png", CREATE_URL),

    # =========================================================================
    # 7. APPLIED ENERGISTICS 2 (AE2): DIGITAL PROCESSORS & CRYSTALS
    # =========================================================================
    ("ae2:calculation_processor", "Calculation Processor", "AE2", "power_and_digital", "Digital compute chip printed with certus quartz. Drives ME network arithmetic.", False, "calculation_processor.png", AE2_URL),
    ("ae2:engineering_processor", "Engineering Processor", "AE2", "power_and_digital", "Heavy compute microprocessor printed with diamond. Drives storage controllers.", False, "engineering_processor.png", AE2_URL),
    ("ae2:logic_processor", "Logic Processor", "AE2", "power_and_digital", "High-speed logic chip printed with gold. Handles basic routing operations.", False, "logic_processor.png", AE2_URL),
    ("ae2:certus_quartz_crystal", "Certus Quartz Crystal", "AE2", "ores_and_gems", "Natural piezoelectric crystal mined from meteorites and quartz veins.", False, "certus_quartz_crystal.png", AE2_URL),
    ("ae2:charged_certus_quartz_crystal", "Charged Certus Quartz", "AE2", "power_and_digital", "Certus quartz energized with high-voltage charge. Catalyzes fluix crystals.", False, "charged_certus_quartz_crystal.png", AE2_URL),
    ("ae2:fluix_crystal", "Fluix Crystal", "AE2", "power_and_digital", "Fused crystal grown in water from charged certus quartz, redstone, and nether quartz.", False, "fluix_crystal.png", AE2_URL),
    ("ae2:fluix_dust", "Fluix Dust", "AE2", "power_and_digital", "Pulverized fluix crystal used to manufacture ME glass cables.", False, "fluix_dust.png", AE2_URL),
    ("ae2:silicon", "Silicon", "AE2", "power_and_digital", "High-purity semiconductor substrate smelted from quartz dust.", False, "silicon.png", AE2_URL),
    ("ae2:annihilation_core", "Annihilation Core", "AE2", "power_and_digital", "Digital absorption component that digitizes physical matter into network packets.", False, "annihilation_core.png", AE2_URL),
    ("ae2:formation_core", "Formation Core", "AE2", "power_and_digital", "Digital emission component that reconstructs physical matter from data.", False, "formation_core.png", AE2_URL),
    ("ae2:blank_pattern", "Blank Pattern", "AE2", "power_and_digital", "Programmable holographic matrix used to store automated molecular crafting recipes.", False, "blank_pattern.png", AE2_URL),
    ("ae2:basic_card", "Basic Card", "AE2", "power_and_digital", "Expansion circuit board upgrading ME buses with redstone or fuzzy matching.", False, "basic_card.png", AE2_URL),
    ("ae2:advanced_card", "Advanced Card", "AE2", "power_and_digital", "High-tier expansion card enabling speed, acceleration, and crafting upgrades.", False, "advanced_card.png", AE2_URL),
    ("ae2:wireless_receiver", "Wireless Receiver", "AE2", "power_and_digital", "High-frequency antenna component enabling remote wireless ME access.", False, "wireless_receiver.png", AE2_URL),
    ("ae2:cell_component_1k", "1k ME Storage Component", "AE2", "power_and_digital", "Digital memory wafer capable of holding 1,024 bytes of digitized items.", False, "cell_component_1k.png", AE2_URL),
    ("ae2:cell_component_4k", "4k ME Storage Component", "AE2", "power_and_digital", "Medium-tier memory wafer holding 4,096 bytes of digitized items.", False, "cell_component_4k.png", AE2_URL),
    ("ae2:cell_component_16k", "16k ME Storage Component", "AE2", "power_and_digital", "High-density digital memory wafer holding 16,384 bytes of items.", False, "cell_component_16k.png", AE2_URL),
    ("ae2:cell_component_64k", "64k ME Storage Component", "AE2", "power_and_digital", "Ultra-dense storage wafer holding 65,536 bytes of items.", False, "cell_component_64k.png", AE2_URL),

    # =========================================================================
    # 8. MEKANISM: CIRCUITS, ENRICHED ALLOYS & NUCLEAR PELLETS
    # =========================================================================
    ("mekanism:basic_control_circuit", "Basic Control Circuit", "Mekanism", "power_and_digital", "Standard electronic circuit regulating basic Mekanism machinery.", False, "basic_control_circuit.png", MEK_URL),
    ("mekanism:advanced_control_circuit", "Advanced Control Circuit", "Mekanism", "power_and_digital", "Enriched circuit board infused with redstone for tier-2 factories.", False, "advanced_control_circuit.png", MEK_URL),
    ("mekanism:elite_control_circuit", "Elite Control Circuit", "Mekanism", "power_and_digital", "Reinforced microprocessor regulating tier-3 quantum machines.", False, "elite_control_circuit.png", MEK_URL),
    ("mekanism:ultimate_control_circuit", "Ultimate Control Circuit", "Mekanism", "power_and_digital", "Atomic-tier processing core for fusion reactors and supercritical phase shifters.", False, "ultimate_control_circuit.png", MEK_URL),
    ("mekanism:alloy_infused", "Infused Alloy", "Mekanism", "power_and_digital", "Iron compressed with redstone in a metallurgic infuser.", False, "alloy_infused.png", MEK_URL),
    ("mekanism:alloy_reinforced", "Reinforced Alloy", "Mekanism", "power_and_digital", "Infused alloy compressed with diamond dust for structural strength.", False, "alloy_reinforced.png", MEK_URL),
    ("mekanism:alloy_atomic", "Atomic Alloy", "Mekanism", "power_and_digital", "Reinforced alloy fused with refined obsidian. Top-tier metallurgical material.", False, "alloy_atomic.png", MEK_URL),
    ("mekanism:ingot_osmium", "Osmium Ingot", "Mekanism", "ores_and_gems", "Heavy platinum-group metal ingot essential for all Mekanism infrastructure.", False, "ingot_osmium.png", MEK_URL),
    ("mekanism:ingot_refined_obsidian", "Refined Obsidian Ingot", "Mekanism", "ores_and_gems", "Compressed obsidian and diamond alloy with extreme blast resistance.", False, "ingot_refined_obsidian.png", MEK_URL),
    ("mekanism:ingot_refined_glowstone", "Refined Glowstone Ingot", "Mekanism", "ores_and_gems", "Luminescent metallic alloy forged from glowstone and osmium.", False, "ingot_refined_glowstone.png", MEK_URL),
    ("mekanism:dust_refined_obsidian", "Refined Obsidian Dust", "Mekanism", "ores_and_gems", "Ultra-hard ground obsidian dust for atomic metallurgical infusing.", False, "dust_refined_obsidian.png", MEK_URL),
    ("mekanism:bio_fuel", "Bio Fuel", "Mekanism", "mob_drops_and_food", "Refined biomass crushed from organic crops, used to fuel bio-generators.", False, "bio_fuel.png", MEK_URL),
    ("mekanism:energy_tablet", "Energy Tablet", "Mekanism", "power_and_digital", "Portable rechargeable battery cell storing high-density Joules.", False, "energy_tablet.png", MEK_URL),
    ("mekanism:teleportation_core", "Teleportation Core", "Mekanism", "power_and_digital", "Subatomic quantum core driving instantaneous point-to-point matter teleporters.", False, "teleportation_core.png", MEK_URL),
    ("mekanism:pellet_antimatter", "Antimatter Pellet", "Mekanism", "power_and_digital", "Stabilized antimatter capsule synthesized in the Supercritical Phase Shifter.", True, "pellet_antimatter.png", MEK_URL),
    ("mekanism:pellet_plutonium", "Plutonium Pellet", "Mekanism", "power_and_digital", "Highly radioactive fissile fuel pellet processed from spent nuclear waste.", True, "pellet_plutonium.png", MEK_URL),
    ("mekanism:pellet_polonium", "Polonium Pellet", "Mekanism", "power_and_digital", "Decayed radioactive isotope pellet required for the Supercritical Phase Shifter.", True, "pellet_polonium.png", MEK_URL),

    # =========================================================================
    # 9. BOTANIA: ARCANE RUNES, METALS & PETALS
    # =========================================================================
    ("botania:manasteel_ingot", "Manasteel Ingot", "Botania", "ores_and_gems", "Iron ingot bathed in a mana pool, imbued with arcane vitality.", False, "manasteel_ingot.png", BOT_URL),
    ("botania:terrasteel_ingot", "Terrasteel Ingot", "Botania", "ores_and_gems", "Living alloy of manasteel, mana pearl, and mana diamond forged upon the Terrestrial Agglomeration Plate.", False, "terrasteel_ingot.png", BOT_URL),
    ("botania:elementium_ingot", "Elementium Ingot", "Botania", "ores_and_gems", "Faerie metal imported from the mythical realm of Alfheim.", False, "elementium_ingot.png", BOT_URL),
    ("botania:mana_diamond", "Mana Diamond", "Botania", "ores_and_gems", "Diamond saturated with pure botanical mana, glowing with aquamarine luminescence.", False, "mana_diamond.png", BOT_URL),
    ("botania:mana_pearl", "Mana Pearl", "Botania", "magic_and_ritual", "Ender pearl infused in a mana pool to stabilize dimension-shifting energies.", False, "mana_pearl.png", BOT_URL),
    ("botania:dragonstone", "Dragonstone", "Botania", "ores_and_gems", "Otherworldly iridescent gemstone imported through the Elven Gateway.", False, "dragonstone.png", BOT_URL),
    ("botania:rune_water", "Rune of Water", "Botania", "magic_and_ritual", "Ancient stone disc inscribed with the elemental glyph of water.", False, "rune_water.png", BOT_URL),
    ("botania:rune_fire", "Rune of Fire", "Botania", "magic_and_ritual", "Elemental stone disc inscribed with the incandescent glyph of fire.", False, "rune_fire.png", BOT_URL),
    ("botania:rune_earth", "Rune of Earth", "Botania", "magic_and_ritual", "Elemental stone disc carrying the grounding energy of the earth.", False, "rune_earth.png", BOT_URL),
    ("botania:rune_air", "Rune of Air", "Botania", "magic_and_ritual", "Elemental stone disc infused with the weightless glyph of air.", False, "rune_air.png", BOT_URL),
    ("botania:rune_mana", "Rune of Mana", "Botania", "magic_and_ritual", "Potent mystical catalyst storing condensed botanical mana.", False, "rune_mana.png", BOT_URL),
    ("botania:overgrowth_seed", "Overgrowth Seed", "Botania", "magic_and_ritual", "Ancient enchanted seed that permanently enchants soil into enchanted soil.", False, "overgrowth_seed.png", BOT_URL),
    ("botania:black_lotus", "Black Lotus", "Botania", "magic_and_ritual", "Mythical botanical bloom that dissolves into a massive surge of mana.", False, "black_lotus.png", BOT_URL),
]

out_dir = "public/textures/items"
os.makedirs(out_dir, exist_ok=True)

success_items = []
manifest_assets = []

for item_id, name, mod, cat, desc, hazard, png_name, base_url in RAW_ITEMS:
    file_path = os.path.join(out_dir, png_name)
    rel_url = f"/textures/items/{png_name}"
    download_url = base_url + png_name
    
    # Download if not present
    if not os.path.exists(file_path):
        try:
            req = urllib.request.Request(download_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    data = resp.read()
                    with open(file_path, 'wb') as f:
                        f.write(data)
                else:
                    print(f"Failed {name} (status {resp.status})")
                    continue
        except Exception as e:
            print(f"Skipping {name}: {e}")
            continue
    else:
        with open(file_path, 'rb') as f:
            data = f.read()

    sha256 = hashlib.sha256(data).hexdigest()
    w, h = 16, 16
    if data[:8] == b'\x89PNG\r\n\x1a\n' and len(data) >= 24:
        w, h = struct.unpack('>II', data[16:24])

    entry = {
        "id": item_id,
        "name": name,
        "mod": mod,
        "category": cat,
        "description": desc,
        "texture": rel_url,
        "isHazard": hazard,
        "kind": "item",
        "render": {
            "mode": "sprite",
            "src": rel_url
        }
    }
    success_items.append(entry)

    manifest_assets.append({
        "id": item_id,
        "url": rel_url,
        "source": f"verified mod/vanilla item asset: {mod}",
        "sha256": sha256,
        "width": w,
        "height": h,
        "kind": "item asset",
        "rights": "Upstream rights reserved by respective mod creators / Mojang."
    })

print(f"\nSuccessfully downloaded & processed {len(success_items)} authentic items!")

# Load and update blocks.json
with open("public/data/blocks.json", "r") as f:
    catalog = json.load(f)

print(f"Existing catalog entries: {len(catalog)}")

catalog_by_id = {b["id"]: b for b in catalog}
added = 0
updated = 0

for item in success_items:
    if item["id"] in catalog_by_id:
        catalog_by_id[item["id"]].update(item)
        updated += 1
    else:
        catalog_by_id[item["id"]] = item
        added += 1

final_catalog = list(catalog_by_id.values())
print(f"Added {added} new items, updated {updated}. Total catalog now: {len(final_catalog)}")

with open("public/data/blocks.json", "w") as f:
    json.dump(final_catalog, f, indent=2)

# Update asset-sources.json
with open("public/data/asset-sources.json", "r") as f:
    sources = json.load(f)

existing_sources_ids = {a["id"] for a in sources["assets"]}
for a in manifest_assets:
    if a["id"] not in existing_sources_ids:
        sources["assets"].append(a)

with open("public/data/asset-sources.json", "w") as f:
    json.dump(sources, f, indent=2)

print("Saved public/data/blocks.json and public/data/asset-sources.json successfully!")
