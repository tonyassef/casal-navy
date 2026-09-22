// Plano padrao: rotacao de 6 treinos (A/B/C/D/E/F), sem dias fixos.
// PLAN_3DAY: modelo alternativo mesclado (A+D, B+E, C+F) em 3 dias.
const PLAN_TPL_V = 2; // versão do template (correção 22/09/2026)
const PLAN_6DAY_SIG_V1 = '[{"day":"Plano A","m":"Costas/Bíceps","ex":[["Puxada Alta na Máquina (Pulley Frontal)","Puxada Alta com Halteres (Pullover)","4","8-12","Drop-set na última série"],["Remada Baixa na Máquina (Remada Sentada)","Remada Curvada com Halteres","4","8-12","Rest-pause"],["Remada Cavalinho na Máquina","Remada Serrote com Halteres","3","10-15",""],["Rosca Direta na Máquina (Scott Machine)","Rosca Direta com Halteres","3","10-15","Super-set com Tríceps"],["Rosca Concentrada com Halteres","Rosca Martelo com Halteres","3","12-15",""]]},{"day":"Plano B","m":"Peito/Ombro/Tríceps","ex":[["Supino Inclinado na Máquina","Supino Inclinado com Halteres","4","8-12","Drop-set na última série"],["Supino Reto na Máquina","Supino Reto com Halteres","4","8-12","Rest-pause"],["Crucifixo na Máquina (Voador)","Crucifixo Inclinado com Halteres","3","10-15",""],["Desenvolvimento na Máquina (Shoulder Press)","Desenvolvimento Arnold com Halteres","4","8-12","Drop-set na última série"],["Elevação Lateral na Máquina","Elevação Lateral com Halteres","3","12-15",""],["Tríceps Pulley na Máquina (Barra Reta)","Tríceps Francês com Halteres","3","10-15","Super-set com Bíceps"],["Extensão de Tríceps na Máquina (Tríceps Máquina)","Coice com Halteres","3","12-15",""]]},{"day":"Plano C","m":"Pernas/Glúteo","ex":[["Leg Press 45°","Agachamento Goblet com Halteres","4","8-12","Drop-set na última série"],["Cadeira Extensora","Agachamento Búlgaro com Halteres","4","10-15","Rest-pause"],["Cadeira Flexora","Stiff com Halteres","4","10-15",""],["Cadeira Abdutora","Elevação Lateral deitado com Halteres","3","12-15",""],["Cadeira Adutora","Agachamento Sumô com Halteres","3","12-15",""],["Panturrilha Sentado na Máquina","Panturrilha em Pé com Halteres","4","15-20",""]]},{"day":"Plano D","m":"Costas/Bíceps","ex":[["Puxada Articulada na Máquina","Remada Unilateral com Halteres","4","8-12","Drop-set"],["Remada T na Máquina","Pullover com Halteres","4","8-12","Rest-pause"],["Pull Down na Máquina","Remada Inclinada com Halteres","3","10-15",""],["Rosca Scott na Máquina","Rosca Alternada com Halteres","3","10-15","Super-set com Tríceps"],["Rosca Inclinada pra Frente com Halteres","Rosca Martelo Inclinada com Halteres","3","12-15",""]]},{"day":"Plano E","m":"Peito/Ombro/Tríceps","ex":[["Supino Reto na Máquina","Supino Reto com Halteres","4","8-12","Drop-set na última série"],["Supino Declinado na Máquina","Supino Declinado com Halteres","4","8-12","Rest-pause"],["Crossover na Polia Alta","Crucifixo Reto com Halteres","3","10-15",""],["Desenvolvimento com Halteres (Sentado)","Desenvolvimento com Barra (Militar Press)","4","8-12","Drop-set na última série"],["Elevação Frontal com Halteres","Elevação Frontal na Polia","3","12-15",""],["Tríceps Testa na Máquina (Máquina de Tríceps)","Tríceps Testa com Halteres","3","10-15","Super-set com Bíceps"],["Tríceps Coice na Polia","Tríceps Coice com Halteres","3","12-15",""]]},{"day":"Plano F","m":"Pernas/Glúteo","ex":[["Agachamento no Hack Machine","Agachamento Frontal com Halteres","4","8-12","Drop-set na última série"],["Leg Press Horizontal","Passada com Halteres","4","8-12","Rest-pause"],["Mesa Flexora","Levantamento Terra Romeno com Halteres","4","10-15",""],["Glúteo Máquina (Coice)","Elevação Pélvica com Halteres","3","12-15",""],["Panturrilha em Pé na Máquina","Panturrilha Sentado com Halteres","4","15-20",""]]}]';
const PLAN_3DAY_SIG_V1 = '[{"day":"Dia A","m":"Costas/Bíceps","ex":[["Puxada Alta na Máquina (Pulley Frontal)","Puxada Alta com Halteres (Pullover)","4","8-12","Drop-set na última série"],["Remada Baixa na Máquina (Remada Sentada)","Remada Curvada com Halteres","4","8-12","Rest-pause"],["Remada Cavalinho na Máquina","Remada Serrote com Halteres","3","10-15",""],["Rosca Direta na Máquina (Scott Machine)","Rosca Direta com Halteres","3","10-15","Super-set com Tríceps"],["Rosca Concentrada com Halteres","Rosca Martelo com Halteres","3","12-15",""],["Puxada Articulada na Máquina","Remada Unilateral com Halteres","4","8-12","Drop-set"],["Remada T na Máquina","Pullover com Halteres","4","8-12","Rest-pause"],["Pull Down na Máquina","Remada Inclinada com Halteres","3","10-15",""],["Rosca Scott na Máquina","Rosca Alternada com Halteres","3","10-15","Super-set com Tríceps"],["Rosca Inclinada pra Frente com Halteres","Rosca Martelo Inclinada com Halteres","3","12-15",""]]},{"day":"Dia B","m":"Peito/Ombro/Tríceps","ex":[["Supino Inclinado na Máquina","Supino Inclinado com Halteres","4","8-12","Drop-set na última série"],["Supino Reto na Máquina","Supino Reto com Halteres","4","8-12","Rest-pause"],["Crucifixo na Máquina (Voador)","Crucifixo Inclinado com Halteres","3","10-15",""],["Desenvolvimento na Máquina (Shoulder Press)","Desenvolvimento Arnold com Halteres","4","8-12","Drop-set na última série"],["Elevação Lateral na Máquina","Elevação Lateral com Halteres","3","12-15",""],["Tríceps Pulley na Máquina (Barra Reta)","Tríceps Francês com Halteres","3","10-15","Super-set com Bíceps"],["Extensão de Tríceps na Máquina (Tríceps Máquina)","Coice com Halteres","3","12-15",""],["Supino Reto na Máquina","Supino Reto com Halteres","4","8-12","Drop-set na última série"],["Supino Declinado na Máquina","Supino Declinado com Halteres","4","8-12","Rest-pause"],["Crossover na Polia Alta","Crucifixo Reto com Halteres","3","10-15",""],["Desenvolvimento com Halteres (Sentado)","Desenvolvimento com Barra (Militar Press)","4","8-12","Drop-set na última série"],["Elevação Frontal com Halteres","Elevação Frontal na Polia","3","12-15",""],["Tríceps Testa na Máquina (Máquina de Tríceps)","Tríceps Testa com Halteres","3","10-15","Super-set com Bíceps"],["Tríceps Coice na Polia","Tríceps Coice com Halteres","3","12-15",""]]},{"day":"Dia C","m":"Pernas/Glúteo","ex":[["Leg Press 45°","Agachamento Goblet com Halteres","4","8-12","Drop-set na última série"],["Cadeira Extensora","Agachamento Búlgaro com Halteres","4","10-15","Rest-pause"],["Cadeira Flexora","Stiff com Halteres","4","10-15",""],["Cadeira Abdutora","Elevação Lateral deitado com Halteres","3","12-15",""],["Cadeira Adutora","Agachamento Sumô com Halteres","3","12-15",""],["Panturrilha Sentado na Máquina","Panturrilha em Pé com Halteres","4","15-20",""],["Agachamento no Hack Machine","Agachamento Frontal com Halteres","4","8-12","Drop-set na última série"],["Leg Press Horizontal","Passada com Halteres","4","8-12","Rest-pause"],["Mesa Flexora","Levantamento Terra Romeno com Halteres","4","10-15",""],["Glúteo Máquina (Coice)","Elevação Pélvica com Halteres","3","12-15",""],["Panturrilha em Pé na Máquina","Panturrilha Sentado com Halteres","4","15-20",""]]}]'; // assinatura do template antigo de 3 dias (Rotação A/B/C) — usada na migração
 // assinatura do template v1 (exercícios incorretos) — usada na migração

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
    "nameA": "Remada Curvada com Halteres",
    "nameB": "Remada Curvada com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Rest-pause",
    "rest": "3 min"
   },
   {
    "nameA": "Remada Curvada com Barra",
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
    "technique": "Super-set com Tríceps Francês UNI",
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
    "nameA": "Puxada Articulada Alternada na Máquina",
    "nameB": "Remada Unilateral com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Alternada",
    "rest": "3 min"
   },
   {
    "nameA": "Remada Serrote com Halteres",
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
    "nameA": "Rosca Direta Barra EZ com Costa no Halter (trocar com scott)",
    "nameB": "Rosca Alternada com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "Super-set com Costa trapézio no Halter",
    "rest": "3 min"
   },
   {
    "nameA": "Rosca Inclinada com Halteres",
    "nameB": "Rosca Martelo Inclinada com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "Super-set com Tríceps Testa",
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
    "technique": "Rest-pause",
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
    "nameA": "Elevação Lateral na Polia",
    "nameB": "Elevação Lateral com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "Drop-set",
    "rest": "3 min"
   },
   {
    "nameA": "Tríceps testa na corda",
    "nameB": "Tríceps Francês com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "Super-set com Bíceps corda",
    "rest": "3 min"
   },
   {
    "nameA": "Triceps na polia com corda",
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
    "nameA": "Desenvolvimento com Halteres (Sentado) c/ Elevação Lateral",
    "nameB": "Desenvolvimento com Barra (Militar Press)",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Elevação Frontal na Corda",
    "nameB": "Elevação Frontal na Polia",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Tríceps triangular unilateral na polia",
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
    "nameA": "Leg Extension Uni",
    "nameB": "Agachamento Goblet com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Agachamento Smith",
    "nameB": "Agachamento Búlgaro com Halteres",
    "sets": "4",
    "reps": "10-15",
    "technique": "Rest-pause",
    "rest": "3 min"
   },
   {
    "nameA": "Leg Press 45°",
    "nameB": "Stiff com Halteres",
    "sets": "4",
    "reps": "10-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Glúteos Hack",
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
    "nameA": "Remada Curvada com Halteres",
    "nameB": "Remada Curvada com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Rest-pause",
    "rest": "3 min"
   },
   {
    "nameA": "Remada Curvada com Barra",
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
    "technique": "Super-set com Tríceps Francês UNI",
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
    "technique": "Rest-pause",
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
    "nameA": "Elevação Lateral na Polia",
    "nameB": "Elevação Lateral com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "Drop-set",
    "rest": "3 min"
   },
   {
    "nameA": "Tríceps testa na corda",
    "nameB": "Tríceps Francês com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "Super-set com Bíceps corda",
    "rest": "3 min"
   },
   {
    "nameA": "Triceps na polia com corda",
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
    "nameA": "Leg Extension Uni",
    "nameB": "Agachamento Goblet com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Agachamento Smith",
    "nameB": "Agachamento Búlgaro com Halteres",
    "sets": "4",
    "reps": "10-15",
    "technique": "Rest-pause",
    "rest": "3 min"
   },
   {
    "nameA": "Leg Press 45°",
    "nameB": "Stiff com Halteres",
    "sets": "4",
    "reps": "10-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Glúteos Hack",
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
    "nameA": "Puxada Articulada Alternada na Máquina",
    "nameB": "Remada Unilateral com Halteres",
    "sets": "4",
    "reps": "8-12",
    "technique": "Alternada",
    "rest": "3 min"
   },
   {
    "nameA": "Remada Serrote com Halteres",
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
    "nameA": "Rosca Direta Barra EZ com Costa no Halter (trocar com scott)",
    "nameB": "Rosca Alternada com Halteres",
    "sets": "3",
    "reps": "10-15",
    "technique": "Super-set com Costa trapézio no Halter",
    "rest": "3 min"
   },
   {
    "nameA": "Rosca Inclinada com Halteres",
    "nameB": "Rosca Martelo Inclinada com Halteres",
    "sets": "3",
    "reps": "12-15",
    "technique": "Super-set com Tríceps Testa",
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
    "nameA": "Desenvolvimento com Halteres (Sentado) c/ Elevação Lateral",
    "nameB": "Desenvolvimento com Barra (Militar Press)",
    "sets": "4",
    "reps": "8-12",
    "technique": "Drop-set na última série",
    "rest": "3 min"
   },
   {
    "nameA": "Elevação Frontal na Corda",
    "nameB": "Elevação Frontal na Polia",
    "sets": "3",
    "reps": "12-15",
    "technique": "",
    "rest": "3 min"
   },
   {
    "nameA": "Tríceps triangular unilateral na polia",
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
