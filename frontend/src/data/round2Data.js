const serverAi = "/reference/r2/image1.webp";
const serverReal = "/reference/r2/image2.webp";
const tiger = "/reference/r2/image3.webp";
const street = "/reference/r2/image4.webp";
const bird = "/reference/r2/image5.webp";

// Round 2 — Image Challenge.
// Q3 is evaluated server-side from the submitted prompt text.
const round2Data = [
  {
    id: "r2-q1",
    order: 1,
    title: "Round 2 — Server Room",
    focus: "Which image is AI-generated?",
    type: "image-choice",
    images: [
      { src: serverAi, label: "Image 1" },
      { src: serverReal, label: "Image 2" }
    ],
    options: [
      { key: "A", label: "Image 1" },
      { key: "B", label: "Image 2" }
    ]
  },
  {
    id: "r2-q2",
    order: 2,
    title: "Round 2 — Wildlife Photography",
    focus: "Which part of the image was AI-edited?",
    type: "image-choice",
    image: tiger,
    options: [
      { key: "A", label: "The head / face" },
      { key: "B", label: "The stripes on the abdomen" },
      { key: "C", label: "The legs" },
      { key: "D", label: "The background" }
    ]
  },
  {
    id: "r2-q3",
    order: 3,
    title: "Round 2 — Street Photography",
    focus: "Write a prompt that recreates this image as closely as possible.",
    type: "text",
    image: street,
    placeholder: "Describe the scene, lighting, camera style, subjects, atmosphere, and other details...",
    minLength: 10
  },
  {
    id: "r2-q4",
    order: 4,
    title: "Round 2 — Bird Photography",
    focus: "Is this image real or AI-generated?",
    type: "image-choice",
    image: bird,
    options: [
      { key: "A", label: "Real" },
      { key: "B", label: "AI-generated" }
    ]
  }
];

export default round2Data;
