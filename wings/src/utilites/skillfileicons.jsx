// Skill drawings that live in public/skills/<slug>.svg.
// Add the slug here after dropping the file in. Both icon maps pick it up,
// so the skill tree and the progression charts can keep calling .get(slug).
const fileSkillIcons = [
  "assisted-oahs",
  "assisted-pistol-squat",
  "i-sit",
  "oa-flag",
  "pistol-squat",
  "v-sit",
];

export function registerFileSkillIcons(map, elementId) {
  for (const name of fileSkillIcons) {
    map.set(
      name,
      <img
        id={elementId}
        src={`skills/${name}.svg`}
        alt={name.replaceAll("-", " ")}
      />,
    );
  }
}
