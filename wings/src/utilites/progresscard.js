const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const SITE_URL = "https://wingssw.com";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("logo"));
    image.src = src;
  });
}

async function readyFont(family, weight, size) {
  const spec = `${weight} ${size}px "${family}"`;
  try {
    await document.fonts.load(spec);
    if (document.fonts.check(spec)) return `"${family}"`;
  } catch {
    // The card still draws with a generic face if the webfont is not ready.
  }
  return "sans-serif";
}

function wrapLines(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });

  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function fileSlug(title) {
  const slug = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "skill";
}

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}

export async function createProgressCard({ title, difficulty }) {
  const [logo, displayFont, bodyFont] = await Promise.all([
    loadImage("/wingslogo512.png"),
    readyFont("Major Mono Display", 400, 72),
    readyFont("Fira Sans", 200, 84),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#1b1b1b";
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 64, CARD_WIDTH - 128, CARD_HEIGHT - 128);

  const logoSize = 280;
  ctx.drawImage(
    logo,
    (CARD_WIDTH - logoSize) / 2,
    220,
    logoSize,
    logoSize,
  );

  ctx.textAlign = "center";
  ctx.fillStyle = "#f3f3f3";
  ctx.font = `400 56px ${displayFont}`;
  ctx.fillText("WINGS", CARD_WIDTH / 2, 600);

  ctx.font = `200 84px ${bodyFont}`;
  const nameLines = wrapLines(ctx, title, 860);
  nameLines.forEach((line, index) => {
    ctx.fillText(line, CARD_WIDTH / 2, 820 + index * 104);
  });

  const afterName = 820 + nameLines.length * 104;
  ctx.fillStyle = "#b66da3";
  ctx.font = `200 48px ${bodyFont}`;
  ctx.fillText("mastered", CARD_WIDTH / 2, afterName + 40);

  if (difficulty) {
    ctx.fillStyle = "#f3f3f3";
    ctx.font = `200 36px ${bodyFont}`;
    ctx.fillText(`${difficulty} rated`, CARD_WIDTH / 2, afterName + 120);
  }

  ctx.fillStyle = "#c2c2c2";
  ctx.font = `200 36px ${bodyFont}`;
  ctx.fillText("wingssw.com", CARD_WIDTH / 2, 1760);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob) throw new Error("card");

  return new File([blob], `wings-${fileSlug(title)}.png`, {
    type: "image/png",
  });
}

export async function shareProgressCard(details) {
  const file = await createProgressCard(details);
  const payload = {
    files: [file],
    title: "Wings",
    text: `I mastered the ${details.title} on Wings\n${SITE_URL}`,
  };

  let canShareFile = false;
  try {
    canShareFile = navigator.canShare?.(payload) ?? false;
  } catch {
    canShareFile = false;
  }

  if (canShareFile) {
    await navigator.share(payload);
    return "shared";
  }

  downloadFile(file);
  return "downloaded";
}
