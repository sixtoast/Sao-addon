import { world, system, EntityDamageCause, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

const MENU_ITEM = "aincrad:skill_crystal";
const menuOpen = new Set();
const cooldowns = new Map();

const SKILLS = [
  { name: "Quick Slash", damage: 7, range: 3.2, dot: 0.55, cooldown: 20 },
  { name: "Heavy Strike", damage: 12, range: 3.8, dot: 0.35, cooldown: 40 },
  { name: "Arc Burst", damage: 6, range: 4, area: true, cooldown: 60 }
];

function restoreMenuItem(player) {
  // Food-use is the current touch-friendly activation trigger. Return one token next tick.
  system.runTimeout(() => {
    try {
      const inventory = player.getComponent("minecraft:inventory")?.container;
      if (inventory) inventory.addItem(new ItemStack(MENU_ITEM, 1));
    } catch (error) {
      player.sendMessage("§e[AINCRAD] Could not return the menu token. Check your inventory.");
    }
  }, 1);
}

function showSkillMenu(player) {
  if (menuOpen.has(player.id)) return;
  menuOpen.add(player.id);
  const form = new ActionFormData()
    .title("AINCRAD • Sword Skills")
    .body("Choose a skill. Skills have individual cooldowns. Aim at the enemy you want to strike.")
    .button("Quick Slash\n§7Fast • 7 damage")
    .button("Heavy Strike\n§7Powerful • 12 damage")
    .button("Arc Burst\n§7Area attack • 6 damage");

  form.show(player).then((response) => {
    menuOpen.delete(player.id);
    if (response.canceled || response.selection === undefined) return;
    useSkill(player, SKILLS[response.selection]);
  }).catch((error) => {
    menuOpen.delete(player.id);
    player.sendMessage("§c[AINCRAD] Could not open the skill menu. Check the Content Log.");
  });
}

function useSkill(player, skill) {
  const key = player.id + ":" + skill.name;
  if (cooldowns.has(key)) {
    player.sendMessage("§e[AINCRAD] " + skill.name + " is still on cooldown.");
    return;
  }
  cooldowns.set(key, true);
  system.runTimeout(() => cooldowns.delete(key), skill.cooldown);

  let hitCount = 0;
  const view = player.getViewDirection();
  const origin = player.location;
  try {
    const targets = player.dimension.getEntities({ location: origin, maxDistance: skill.range });
    for (const target of targets) {
      if (target.id === player.id || target.typeId === "minecraft:player") continue;
      const dx = target.location.x - origin.x;
      const dy = target.location.y - origin.y;
      const dz = target.location.z - origin.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance > skill.range) continue;
      if (!skill.area) {
        const horizontalLength = Math.sqrt(dx * dx + dz * dz) || 1;
        const forwardLength = Math.sqrt(view.x * view.x + view.z * view.z) || 1;
        const dot = (dx / horizontalLength) * (view.x / forwardLength) + (dz / horizontalLength) * (view.z / forwardLength);
        if (dot < skill.dot) continue;
      }
      try {
        target.applyDamage(skill.damage, { cause: EntityDamageCause.entityAttack, damagingEntity: player });
        hitCount++;
      } catch (_) {
        // Skip entities that cannot be damaged.
      }
    }
    player.sendMessage("§b[AINCRAD] §f" + skill.name + " §7• Targets hit: " + hitCount);
  } catch (error) {
    player.sendMessage("§c[AINCRAD] Skill failed. Check the Content Log for errors.");
  }
}

world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  if (!player || player.typeId !== "minecraft:player") return;
  if (!event.itemStack || event.itemStack.typeId !== MENU_ITEM) return;
  restoreMenuItem(player);
  showSkillMenu(player);
});
