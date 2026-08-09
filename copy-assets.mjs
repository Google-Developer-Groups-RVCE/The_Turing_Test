import { copyFileSync, mkdirSync } from "fs";
import { join } from "path";

const base = new URL(".", import.meta.url).pathname.slice(1); // strip leading /

mkdirSync(join(base, "public/fonts"), { recursive: true });
mkdirSync(join(base, "public/images"), { recursive: true });

copyFileSync(
  join(base, "cutepunch-personal-use-only/Cutepunch Personal Use Only.ttf"),
  join(base, "public/fonts/Cutepunch.ttf")
);

const imgs = [
  "Background.avif",
  "person1.png","person2.png","person3.png","person4.png","person5.png",
  "person6.png","person7.png","person8.png","person9.png","person10.png",
  "person11.png","person12.png","person13.png"
];

for (const img of imgs) {
  copyFileSync(join(base, "reference", img), join(base, "public/images", img));
}

console.log("Assets copied successfully!");
