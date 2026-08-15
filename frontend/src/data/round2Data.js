const cyclist = "/reference/r2/cyclist-night-street.png";
const tiger = "/reference/r2/tiger-edited.png";
const dogReflection = "/reference/r2/dog-reflection.png";
const livingRoom = "/reference/r2/living-room.png";

// Round 2 — Image Challenge. Every question is a fixed-answer MCQ so scores
// are awarded directly by the server.
const round2Data = [
  {
    id: "r2-q1",
    order: 1,
    title: "Round 2 — Prompt Reconstruction",
    focus: "Choose the option that correctly completes the prompt.",
    type: "image-choice",
    image: cyclist,
    prompt: "A cinematic nighttime photograph of a lone cyclist riding through a narrow European city street after rain. The camera is positioned at _____, with the cyclist placed _____ within the frame. The scene is illuminated by _____, creating strong reflections across the wet road.",
    options: [
      { key: "A", label: "High-angle view; far left of the frame; cool white overhead lighting" },
      { key: "B", label: "Eye-level view; near the centre of the frame; warm street lighting against cool blue ambient light" },
      { key: "C", label: "Low-angle view; dead centre of the frame; bright midday sunlight" },
      { key: "D", label: "Eye-level view; far right edge of the frame; flat, uniform studio lighting" }
    ]
  },
  {
    id: "r2-q2",
    order: 2,
    title: "Round 2 — Tiger Image",
    focus: "Which part of this photo was AI-edited?",
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
    title: "Round 2 — Reflection Check",
    focus: "This image is AI-generated. What is wrong with it?",
    type: "image-choice",
    image: dogReflection,
    options: [
      { key: "A", label: "Reflection mismatch" },
      { key: "B", label: "Shadow mismatch" },
      { key: "C", label: "Impossible perspective" },
      { key: "D", label: "Nothing — the image is real" }
    ]
  },
  {
    id: "r2-q4",
    order: 4,
    title: "Round 2 — Living Room Prompt",
    focus: "Choose the prompt that is most appropriate for this image.",
    type: "image-choice",
    image: livingRoom,
    options: [
      { key: "A", label: "A photorealistic photograph of a modern minimalist living room during the afternoon, with large floor-to-ceiling windows, warm sunlight entering from the right, light wooden furniture, and a wide-angle composition viewed from the doorway." },
      { key: "B", label: "A photorealistic photograph of a modern minimalist living room during the evening, with large floor-to-ceiling windows, cool blue ambient light entering from the left, dark wooden furniture, and a wide-angle composition viewed from the centre of the room." },
      { key: "C", label: "A photorealistic photograph of a modern minimalist living room during the afternoon, with large floor-to-ceiling windows, warm sunlight entering from the left, light wooden furniture, and a wide-angle composition viewed from the corner of the room." },
      { key: "D", label: "A photorealistic photograph of a modern minimalist living room during the afternoon, with small windows, soft diffused lighting, light wooden furniture, and a telephoto composition viewed from outside the room." }
    ]
  }
];

export default round2Data;
