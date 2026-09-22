// Plano padrao: rotacao de 6 treinos (A/B/C/D/E/F), sem dias fixos.
// PLAN_3DAY: modelo alternativo mesclado (A+D, B+E, C+F) em 3 dias.
const PLAN_3DAY = [
 {
  "day": "Dia A",
  "muscle": "Costas/Bíceps",
  "exercises": [
   {
    "nameA": "Puxada Alta na Máquina (Pulley Frontal)",
    "nameB": "Puxada Alta com Halteres (Pullover)",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Remada Baixa na Máquina (Remada Sentada)",
    "nameB": "Remada Curvada com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Rest-pause",
    "rest": "3 min"
   },
   {
    "nameA": "Remada Cavalinho na Máquina",
    "nameB": "Remada Serrote com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Rosca Direta na Máquina (Scott Machine)",
    "nameB": "Rosca Direta com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "Super-set com Tríceps",
    "rest": "3 min"
   },
   {
    "nameA": "Rosca Concentrada com Halteres",
    "nameB": "Rosca Martelo com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Puxada Articulada na Máquina",
    "nameB": "Remada Unilateral com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set",
    "rest": "3 min"
   },
   {
    "nameA": "Remada T na Máquina",
    "nameB": "Pullover com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Rest-pause",
    "rest": "3 min"
   },
   {
    "nameA": "Pull Down na Máquina",
    "nameB": "Remada Inclinada com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Rosca Scott na Máquina",
    "nameB": "Rosca Alternada com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "Super-set com Tríceps",
    "rest": "3 min"
   },
   {
    "nameA": "Rosca Inclinada pra Frente com Halteres",
    "nameB": "Rosca Martelo Inclinada com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   }
  ]
 },
 {
  "day": "Dia B",
  "muscle": "Peito/Ombro/Tríceps",
  "exercises": [
   {
    "nameA": "Supino Inclinado na Máquina",
    "nameB": "Supino Inclinado com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Supino Reto na Máquina",
    "nameB": "Supino Reto com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Rest-pause",
    "rest": "3 min"
   },
   {
    "nameA": "Crucifixo na Máquina (Voador)",
    "nameB": "Crucifixo Inclinado com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Desenvolvimento na Máquina (Shoulder Press)",
    "nameB": "Desenvolvimento Arnold com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Elevação Lateral na Máquina",
    "nameB": "Elevação Lateral com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Tríceps Pulley na Máquina (Barra Reta)",
    "nameB": "Tríceps Francês com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "Super-set com Bíceps",
    "rest": "3 min"
   },
   {
    "nameA": "Extensão de Tríceps na Máquina (Tríceps Máquina)",
    "nameB": "Coice com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Supino Reto na Máquina",
    "nameB": "Supino Reto com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Supino Declinado na Máquina",
    "nameB": "Supino Declinado com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Rest-pause",
    "rest": "3 min"
   },
   {
    "nameA": "Crossover na Polia Alta",
    "nameB": "Crucifixo Reto com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Desenvolvimento com Halteres (Sentado)",
    "nameB": "Desenvolvimento com Barra (Militar Press)",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Elevação Frontal com Halteres",
    "nameB": "Elevação Frontal na Polia",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Tríceps Testa na Máquina (Máquina de Tríceps)",
    "nameB": "Tríceps Testa com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "Super-set com Bíceps",
    "rest": "3 min"
   },
   {
    "nameA": "Tríceps Coice na Polia",
    "nameB": "Tríceps Coice com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   }
  ]
 },
 {
  "day": "Dia C",
  "muscle": "Pernas/Glúteo",
  "exercises": [
   {
    "nameA": "Leg Press 45°",
    "nameB": "Agachamento Goblet com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Cadeira Extensora",
    "nameB": "Agachamento Búlgaro com Halteres",
    "sets": "4",
    "reps": "10-15",
    "technique": "Rest-pause",
    "rest": "3 min"
   },
   {
    "nameA": "Cadeira Flexora",
    "nameB": "Stiff com Halteres",
    "sets": "4",
    "reps": "10-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Cadeira Abdutora",
    "nameB": "Elevação Lateral deitado com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Cadeira Adutora",
    "nameB": "Agachamento Sumô com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Panturrilha Sentado na Máquina",
    "nameB": "Panturrilha em Pé com Halteres",
    "sets": "4",
    "reps": "15-20",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Agachamento no Hack Machine",
    "nameB": "Agachamento Frontal com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Leg Press Horizontal",
    "nameB": "Passada com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Rest-pause",
    "rest": "3 min"
   },
   {
    "nameA": "Mesa Flexora",
    "nameB": "Levantamento Terra Romeno com Halteres",
    "sets": "4",
    "reps": "10-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Glúteo Máquina (Coice)",
    "nameB": "Elevação Pélvica com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Panturrilha em Pé na Máquina",
    "nameB": "Panturrilha Sentado com Halteres",
    "sets": "4",
    "reps": "15-20",
    "technique": "",
    "rest": "3 min"
   }
  ]
 }
];
const PLAN_6DAY = [
 {
  "day": "Plano A",
  "muscle": "Costas/Bíceps",
  "exercises": [
   {
    "nameA": "Puxada Alta na Máquina (Pulley Frontal)",
    "nameB": "Puxada Alta com Halteres (Pullover)",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Remada Baixa na Máquina (Remada Sentada)",
    "nameB": "Remada Curvada com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Rest-pause",
    "rest": "3 min"
   },
   {
    "nameA": "Remada Cavalinho na Máquina",
    "nameB": "Remada Serrote com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Rosca Direta na Máquina (Scott Machine)",
    "nameB": "Rosca Direta com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "Super-set com Tríceps",
    "rest": "3 min"
   },
   {
    "nameA": "Rosca Concentrada com Halteres",
    "nameB": "Rosca Martelo com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   }
  ]
 },
 {
  "day": "Plano B",
  "muscle": "Peito/Ombro/Tríceps",
  "exercises": [
   {
    "nameA": "Supino Inclinado na Máquina",
    "nameB": "Supino Inclinado com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Supino Reto na Máquina",
    "nameB": "Supino Reto com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Rest-pause",
    "rest": "3 min"
   },
   {
    "nameA": "Crucifixo na Máquina (Voador)",
    "nameB": "Crucifixo Inclinado com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Desenvolvimento na Máquina (Shoulder Press)",
    "nameB": "Desenvolvimento Arnold com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Elevação Lateral na Máquina",
    "nameB": "Elevação Lateral com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Tríceps Pulley na Máquina (Barra Reta)",
    "nameB": "Tríceps Francês com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "Super-set com Bíceps",
    "rest": "3 min"
   },
   {
    "nameA": "Extensão de Tríceps na Máquina (Tríceps Máquina)",
    "nameB": "Coice com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   }
  ]
 },
 {
  "day": "Plano C",
  "muscle": "Pernas/Glúteo",
  "exercises": [
   {
    "nameA": "Leg Press 45°",
    "nameB": "Agachamento Goblet com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Cadeira Extensora",
    "nameB": "Agachamento Búlgaro com Halteres",
    "sets": "4",
    "reps": "10-15",
    "technique": "Rest-pause",
    "rest": "3 min"
   },
   {
    "nameA": "Cadeira Flexora",
    "nameB": "Stiff com Halteres",
    "sets": "4",
    "reps": "10-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Cadeira Abdutora",
    "nameB": "Elevação Lateral deitado com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Cadeira Adutora",
    "nameB": "Agachamento Sumô com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Panturrilha Sentado na Máquina",
    "nameB": "Panturrilha em Pé com Halteres",
    "sets": "4",
    "reps": "15-20",
    "technique": "",
    "rest": "3 min"
   }
  ]
 },
 {
  "day": "Plano D",
  "muscle": "Costas/Bíceps",
  "exercises": [
   {
    "nameA": "Puxada Articulada na Máquina",
    "nameB": "Remada Unilateral com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set",
    "rest": "3 min"
   },
   {
    "nameA": "Remada T na Máquina",
    "nameB": "Pullover com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Rest-pause",
    "rest": "3 min"
   },
   {
    "nameA": "Pull Down na Máquina",
    "nameB": "Remada Inclinada com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Rosca Scott na Máquina",
    "nameB": "Rosca Alternada com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "Super-set com Tríceps",
    "rest": "3 min"
   },
   {
    "nameA": "Rosca Inclinada pra Frente com Halteres",
    "nameB": "Rosca Martelo Inclinada com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   }
  ]
 },
 {
  "day": "Plano E",
  "muscle": "Peito/Ombro/Tríceps",
  "exercises": [
   {
    "nameA": "Supino Reto na Máquina",
    "nameB": "Supino Reto com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Supino Declinado na Máquina",
    "nameB": "Supino Declinado com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Rest-pause",
    "rest": "3 min"
   },
   {
    "nameA": "Crossover na Polia Alta",
    "nameB": "Crucifixo Reto com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Desenvolvimento com Halteres (Sentado)",
    "nameB": "Desenvolvimento com Barra (Militar Press)",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Elevação Frontal com Halteres",
    "nameB": "Elevação Frontal na Polia",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Tríceps Testa na Máquina (Máquina de Tríceps)",
    "nameB": "Tríceps Testa com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "Super-set com Bíceps",
    "rest": "3 min"
   },
   {
    "nameA": "Tríceps Coice na Polia",
    "nameB": "Tríceps Coice com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   }
  ]
 },
 {
  "day": "Plano F",
  "muscle": "Pernas/Glúteo",
  "exercises": [
   {
    "nameA": "Agachamento no Hack Machine",
    "nameB": "Agachamento Frontal com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Leg Press Horizontal",
    "nameB": "Passada com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Rest-pause",
    "rest": "3 min"
   },
   {
    "nameA": "Mesa Flexora",
    "nameB": "Levantamento Terra Romeno com Halteres",
    "sets": "4",
    "reps": "10-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Glúteo Máquina (Coice)",
    "nameB": "Elevação Pélvica com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Panturrilha em Pé na Máquina",
    "nameB": "Panturrilha Sentado com Halteres",
    "sets": "4",
    "reps": "15-20",
    "technique": "",
    "rest": "3 min"
   }
  ]
 }
];
