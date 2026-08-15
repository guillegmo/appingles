// tools/generate-content.js
// Genera el curriculum provisional de 21 días + assessment + planes.
// Regenerable: cuando llegue el ebook real, se edita DAYS y se re-ejecuta.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'content');

// ============================================================
// 21 días — curriculum provisional basado en la estructura temática
// ============================================================

const WEEKS = [
  {
    label: 'Fundamentos',
    days: [
      {
        day: 1, title: 'Presentations', topic: 'introductions',
        goal: 'Introduce yourself: say your name, your nationality and where you are from.',
        grammarFocus: "to be (am/is/are)",
        vocabulary: [
          { en: 'Hello', es: 'Hola' },
          { en: 'Good morning', es: 'Buenos días' },
          { en: 'My name is...', es: 'Mi nombre es...' },
          { en: 'Nice to meet you', es: 'Encantado de conocerte' },
          { en: 'I am from...', es: 'Soy de...' },
          { en: 'What is your name?', es: '¿Cómo te llamas?' },
          { en: 'How are you?', es: '¿Cómo estás?' },
          { en: 'Fine, thanks', es: 'Bien, gracias' },
        ],
        phrases: [
          { en: 'Hello, my name is Maria.', es: 'Hola, mi nombre es María.' },
          { en: 'I am from Mexico.', es: 'Soy de México.' },
          { en: 'Nice to meet you.', es: 'Encantado de conocerte.' },
          { en: 'What is your name?', es: '¿Cómo te llamas?' },
          { en: 'I am a student.', es: 'Soy estudiante.' },
        ],
        speak: 'Say hello, tell your name, your country and one thing about you. Speak for 30 seconds.',
        challenge: 'Record a 30-second introduction video-style audio: name, country, profession.',
      },
      {
        day: 2, title: 'Personal Information', topic: 'personal-info',
        goal: 'Give and ask for basic personal information: age, phone number, origin.',
        grammarFocus: 'to be + questions',
        vocabulary: [
          { en: 'How old are you?', es: '¿Cuántos años tienes?' },
          { en: 'I am 30 years old.', es: 'Tengo 30 años.' },
          { en: 'phone number', es: 'número de teléfono' },
          { en: 'email address', es: 'dirección de correo' },
          { en: 'Where are you from?', es: '¿De dónde eres?' },
          { en: 'married', es: 'casado(a)' },
          { en: 'single', es: 'soltero(a)' },
          { en: 'address', es: 'dirección' },
        ],
        phrases: [
          { en: 'How old are you?', es: '¿Cuántos años tienes?' },
          { en: 'I am 30 years old.', es: 'Tengo 30 años.' },
          { en: 'My phone number is 555-1234.', es: 'Mi número es 555-1234.' },
          { en: 'I am from Colombia.', es: 'Soy de Colombia.' },
          { en: 'Where do you live?', es: '¿Dónde vives?' },
        ],
        speak: 'Answer: age, phone number, where you live. 45 seconds.',
        challenge: 'Ask a partner (real or AI) their name, age and origin. Repeat their answers.',
      },
      {
        day: 3, title: 'Likes and Dislikes', topic: 'likes',
        goal: 'Say what you like and do not like.',
        grammarFocus: 'like / don\'t like + noun/verb-ing',
        vocabulary: [
          { en: 'I like...', es: 'Me gusta...' },
          { en: 'I don\'t like...', es: 'No me gusta...' },
          { en: 'food', es: 'comida' },
          { en: 'music', es: 'música' },
          { en: 'movies', es: 'películas' },
          { en: 'sports', es: 'deportes' },
          { en: 'Do you like...?', es: '¿Te gusta...?' },
          { en: 'I love...', es: 'Me encanta...' },
        ],
        phrases: [
          { en: 'I like coffee.', es: 'Me gusta el café.' },
          { en: 'I don\'t like traffic.', es: 'No me gusta el tráfico.' },
          { en: 'Do you like pizza?', es: '¿Te gusta la pizza?' },
          { en: 'I love music.', es: 'Me encanta la música.' },
          { en: 'I like to read at night.', es: 'Me gusta leer por la noche.' },
        ],
        speak: 'Say 3 things you like and 2 you don\'t like. 45 seconds.',
        challenge: 'Answer the question "Do you like...?" 5 times with different topics.',
      },
      {
        day: 4, title: 'Daily Routines', topic: 'routines',
        goal: 'Talk about your daily routine using the present simple.',
        grammarFocus: 'present simple + time',
        vocabulary: [
          { en: 'wake up', es: 'despertarse' },
          { en: 'breakfast', es: 'desayuno' },
          { en: 'go to work', es: 'ir al trabajo' },
          { en: 'lunch', es: 'almuerzo' },
          { en: 'at 7:00', es: 'a las 7:00' },
          { en: 'every day', es: 'todos los días' },
          { en: 'usually', es: 'usualmente' },
          { en: 'go to bed', es: 'acostarse' },
        ],
        phrases: [
          { en: 'I wake up at 7:00.', es: 'Me despierto a las 7:00.' },
          { en: 'I usually have breakfast at home.', es: 'Usualmente desayuno en casa.' },
          { en: 'I go to work at 8:00.', es: 'Voy al trabajo a las 8:00.' },
          { en: 'I work from Monday to Friday.', es: 'Trabajo de lunes a viernes.' },
          { en: 'I go to bed at 11:00.', es: 'Me acuesto a las 11:00.' },
        ],
        speak: 'Describe your routine from waking up to going to bed. 60 seconds.',
        challenge: 'Explain your ideal morning routine in 5 sentences.',
      },
      {
        day: 5, title: 'Asking Questions', topic: 'questions',
        goal: 'Ask and answer WH-questions: what, where, when, who, why.',
        grammarFocus: 'WH-questions',
        vocabulary: [
          { en: 'What', es: 'Qué' },
          { en: 'Where', es: 'Dónde' },
          { en: 'When', es: 'Cuándo' },
          { en: 'Who', es: 'Quién' },
          { en: 'Why', es: 'Por qué' },
          { en: 'How', es: 'Cómo' },
          { en: 'How much', es: 'Cuánto cuesta' },
          { en: 'How often', es: 'Con qué frecuencia' },
        ],
        phrases: [
          { en: 'What is your name?', es: '¿Cuál es tu nombre?' },
          { en: 'Where do you work?', es: '¿Dónde trabajas?' },
          { en: 'When do you finish?', es: '¿Cuándo terminas?' },
          { en: 'Who is your friend?', es: '¿Quién es tu amigo?' },
          { en: 'How much is this?', es: '¿Cuánto cuesta esto?' },
        ],
        speak: 'Ask 5 different WH-questions out loud. 45 seconds.',
        challenge: 'Interview someone (real or AI): 5 questions and answers.',
      },
      {
        day: 6, title: 'Speaking Practice 1', topic: 'speaking-1',
        goal: 'Speak about yourself for one minute using everything from week 1.',
        grammarFocus: 'revisión semana 1',
        vocabulary: [],
        phrases: [],
        speak: 'Speak for 60 seconds about yourself: name, origin, age, likes and routine.',
        challenge: 'One-minute self-introduction without reading. Record it.',
      },
      {
        day: 7, title: 'Review and Mini-Test', topic: 'review-1',
        goal: 'Consolidate week 1 and test your progress.',
        grammarFocus: 'repetición semana 1',
        vocabulary: [
          { en: 'revision', es: 'revisión' },
          { en: 'practice', es: 'práctica' },
          { en: 'remember', es: 'recordar' },
          { en: 'mistake', es: 'error' },
          { en: 'again', es: 'otra vez' },
          { en: 'perfect', es: 'perfecto' },
          { en: 'improve', es: 'mejorar' },
          { en: 'progress', es: 'progreso' },
        ],
        phrases: [
          { en: 'Let\'s review.', es: 'Repasemos.' },
          { en: 'I want to improve.', es: 'Quiero mejorar.' },
          { en: 'One more time, please.', es: 'Una vez más, por favor.' },
          { en: 'I remember this word.', es: 'Recuerdo esta palabra.' },
          { en: 'Practice makes perfect.', es: 'La práctica hace al maestro.' },
        ],
        speak: 'Repeat 5 key phrases from week 1 out loud.',
        challenge: 'Mini-test: complete the review quiz for week 1.',
      },
    ],
  },
  {
    label: 'Vida real',
    days: [
      {
        day: 8, title: 'Directions', topic: 'directions',
        goal: 'Ask for and understand basic directions.',
        grammarFocus: 'imperatives + prepositions of place',
        vocabulary: [
          { en: 'turn left', es: 'gira a la izquierda' },
          { en: 'turn right', es: 'gira a la derecha' },
          { en: 'go straight', es: 'sigue recto' },
          { en: 'next to', es: 'al lado de' },
          { en: 'near', es: 'cerca de' },
          { en: 'far', es: 'lejos' },
          { en: 'Where is...?', es: '¿Dónde está...?' },
          { en: 'the bank', es: 'el banco' },
        ],
        phrases: [
          { en: 'Where is the bank?', es: '¿Dónde está el banco?' },
          { en: 'Turn left at the corner.', es: 'Gira a la izquierda en la esquina.' },
          { en: 'Go straight for two blocks.', es: 'Sigue recto dos cuadras.' },
          { en: 'It is next to the supermarket.', es: 'Está al lado del supermercado.' },
          { en: 'Excuse me, how do I get to...?', es: 'Disculpe, ¿cómo llego a...?' },
        ],
        speak: 'Give directions to your home from a known point. 60 seconds.',
        challenge: 'Roleplay: ask a stranger for directions to the train station.',
      },
      {
        day: 9, title: 'Shopping', topic: 'shopping',
        goal: 'Buy things: ask price, size and pay.',
        grammarFocus: 'Can I have...? / How much...?',
        vocabulary: [
          { en: 'How much is this?', es: '¿Cuánto cuesta esto?' },
          { en: 'Can I have...?', es: '¿Me das...?' },
          { en: 'size', es: 'talla' },
          { en: 'price', es: 'precio' },
          { en: 'cheap', es: 'barato' },
          { en: 'expensive', es: 'caro' },
          { en: 'a refund', es: 'un reembolso' },
          { en: 'I am just looking', es: 'Solo estoy mirando' },
        ],
        phrases: [
          { en: 'How much is this shirt?', es: '¿Cuánto cuesta esta camisa?' },
          { en: 'Do you have this in a larger size?', es: '¿Tienes esto en una talla más grande?' },
          { en: 'Can I pay by card?', es: '¿Puedo pagar con tarjeta?' },
          { en: 'It is too expensive.', es: 'Es demasiado caro.' },
          { en: 'I am just looking, thank you.', es: 'Solo estoy mirando, gracias.' },
        ],
        speak: 'Simulate buying a shirt: ask price, size and pay. 45 seconds.',
        challenge: 'Roleplay: you are the customer, the assistant offers a cheaper option.',
      },
      {
        day: 10, title: 'At the Restaurant', topic: 'restaurant',
        goal: 'Order food and drink in a restaurant.',
        grammarFocus: 'I would like... / Can I have...?',
        vocabulary: [
          { en: 'menu', es: 'menú' },
          { en: 'I would like...', es: 'Quisiera...' },
          { en: 'water', es: 'agua' },
          { en: 'the bill', es: 'la cuenta' },
          { en: 'delicious', es: 'delicioso' },
          { en: 'Are you ready to order?', es: '¿Está listo para ordenar?' },
          { en: 'vegetarian', es: 'vegetariano' },
          { en: 'anything else?', es: '¿algo más?' },
        ],
        phrases: [
          { en: 'Could I see the menu, please?', es: '¿Me muestra el menú, por favor?' },
          { en: 'I would like a coffee, please.', es: 'Quisiera un café, por favor.' },
          { en: 'Is this dish vegetarian?', es: '¿Este platillo es vegetariano?' },
          { en: 'Can I have the bill, please?', es: '¿Me trae la cuenta, por favor?' },
          { en: 'The food was delicious.', es: 'La comida estaba deliciosa.' },
        ],
        speak: 'Order a full meal: starter, main dish and drink. 45 seconds.',
        challenge: 'Roleplay: you are the customer at a restaurant (waiter = AI/partner).',
      },
      {
        day: 11, title: 'Traveling', topic: 'travel',
        goal: 'Handle airport and hotel situations.',
        grammarFocus: 'I have a reservation / I need...',
        vocabulary: [
          { en: 'reservation', es: 'reservación' },
          { en: 'hotel', es: 'hotel' },
          { en: 'airport', es: 'aeropuerto' },
          { en: 'luggage', es: 'equipaje' },
          { en: 'flight', es: 'vuelo' },
          { en: 'boarding pass', es: 'pase de abordar' },
          { en: 'check-in', es: 'registro' },
          { en: 'passport', es: 'pasaporte' },
        ],
        phrases: [
          { en: 'I have a reservation.', es: 'Tengo una reservación.' },
          { en: 'Where is the check-in counter?', es: '¿Dónde está el mostrador de registro?' },
          { en: 'I need to go to the airport.', es: 'Necesito ir al aeropuerto.' },
          { en: 'What time is my flight?', es: '¿A qué hora es mi vuelo?' },
          { en: 'My luggage is lost.', es: 'Perdí mi equipaje.' },
        ],
        speak: 'Check in at the hotel: reservation, name, number of nights. 45 seconds.',
        challenge: 'Roleplay: at the airport, ask where your gate is.',
      },
      {
        day: 12, title: 'The Past', topic: 'past',
        goal: 'Talk about the past: what you did yesterday and last week.',
        grammarFocus: 'past simple (was/were + regular verbs)',
        vocabulary: [
          { en: 'yesterday', es: 'ayer' },
          { en: 'last week', es: 'la semana pasada' },
          { en: 'I was...', es: 'Yo estaba/fui...' },
          { en: 'I went...', es: 'Fui...' },
          { en: 'I had...', es: 'Tuve...' },
          { en: 'worked', es: 'trabajé' },
          { en: 'visited', es: 'visité' },
          { en: 'I saw...', es: 'Vi...' },
        ],
        phrases: [
          { en: 'Yesterday I worked from home.', es: 'Ayer trabajé desde casa.' },
          { en: 'I was at the office at 9:00.', es: 'Estaba en la oficina a las 9:00.' },
          { en: 'Last week I visited my family.', es: 'La semana pasada visité a mi familia.' },
          { en: 'I went to the supermarket.', es: 'Fui al supermercado.' },
          { en: 'It was a good day.', es: 'Fue un buen día.' },
        ],
        speak: 'Describe what you did yesterday in 5 sentences. 60 seconds.',
        challenge: 'Tell your "perfect day" from last weekend in the past.',
      },
      {
        day: 13, title: 'Speaking Practice 2', topic: 'speaking-2',
        goal: 'Use real-life language in roleplays from week 2.',
        grammarFocus: 'revisión semana 2',
        vocabulary: [],
        phrases: [],
        speak: 'Roleplay: restaurant scene — order food and pay. 90 seconds.',
        challenge: 'Record a 90-second roleplay as a tourist asking for directions.',
      },
      {
        day: 14, title: 'Review and Mini-Test', topic: 'review-2',
        goal: 'Consolidate week 2 and test your progress.',
        grammarFocus: 'repetición semana 2',
        vocabulary: [
          { en: 'review', es: 'repaso' },
          { en: 'quiz', es: 'prueba' },
          { en: 'score', es: 'puntuación' },
          { en: 'check', es: 'revisar' },
          { en: 'learn', es: 'aprender' },
          { en: 'ready', es: 'listo' },
          { en: 'answer', es: 'respuesta' },
          { en: 'question', es: 'pregunta' },
        ],
        phrases: [
          { en: 'I am ready for the quiz.', es: 'Estoy listo para la prueba.' },
          { en: 'Let me check my answers.', es: 'Déjame revisar mis respuestas.' },
          { en: 'I learned a lot this week.', es: 'Aprendí mucho esta semana.' },
          { en: 'What is the correct answer?', es: '¿Cuál es la respuesta correcta?' },
          { en: 'Great progress!', es: '¡Gran progreso!' },
        ],
        speak: 'Repeat 5 key phrases from week 2 out loud.',
        challenge: 'Mini-test: complete the review quiz for week 2.',
      },
    ],
  },
  {
    label: 'Comunicación',
    days: [
      {
        day: 15, title: 'The Future', topic: 'future',
        goal: 'Talk about future plans using going to and will.',
        grammarFocus: 'going to / will',
        vocabulary: [
          { en: 'I am going to...', es: 'Voy a...' },
          { en: 'I will...', es: 'Yo... (futuro)' },
          { en: 'next month', es: 'el próximo mes' },
          { en: 'plan', es: 'plan' },
          { en: 'maybe', es: 'quizás' },
          { en: 'I am going to travel.', es: 'Voy a viajar.' },
          { en: 'I will call you.', es: 'Te llamaré.' },
          { en: 'soon', es: 'pronto' },
        ],
        phrases: [
          { en: 'I am going to travel next month.', es: 'Voy a viajar el próximo mes.' },
          { en: 'I will call you tomorrow.', es: 'Te llamaré mañana.' },
          { en: 'What are you going to do this weekend?', es: '¿Qué vas a hacer este fin de semana?' },
          { en: 'Maybe I will stay home.', es: 'Quizás me quede en casa.' },
          { en: 'We are going to start soon.', es: 'Vamos a empezar pronto.' },
        ],
        speak: 'Share 3 future plans. 45 seconds.',
        challenge: 'Ask a partner about their weekend plans and answer about yours.',
      },
      {
        day: 16, title: 'Work', topic: 'work',
        goal: 'Talk about your job, the workplace and daily work tasks.',
        grammarFocus: 'present simple + work vocabulary',
        vocabulary: [
          { en: 'job', es: 'trabajo/empleo' },
          { en: 'I work as...', es: 'Trabajo como...' },
          { en: 'colleague', es: 'compañero de trabajo' },
          { en: 'meeting', es: 'reunión' },
          { en: 'boss', es: 'jefe' },
          { en: 'office', es: 'oficina' },
          { en: 'What do you do?', es: '¿A qué te dedicas?' },
          { en: 'I work in...', es: 'Trabajo en...' },
        ],
        phrases: [
          { en: 'I work as a developer.', es: 'Trabajo como desarrollador.' },
          { en: 'I work in a hospital.', es: 'Trabajo en un hospital.' },
          { en: 'I have a meeting at 10:00.', es: 'Tengo una reunión a las 10:00.' },
          { en: 'My colleagues are very friendly.', es: 'Mis compañeros son muy amables.' },
          { en: 'What do you do for a living?', es: '¿A qué te dedicas?' },
        ],
        speak: 'Describe your job: role, company, daily tasks. 60 seconds.',
        challenge: 'Introduce yourself in a meeting: name, role, department.',
      },
      {
        day: 17, title: 'Conversations', topic: 'conversations',
        goal: 'Keep a small talk conversation alive.',
        grammarFocus: 'follow-up questions',
        vocabulary: [
          { en: 'How is your day?', es: '¿Cómo va tu día?' },
          { en: 'Really?', es: '¿En serio?' },
          { en: 'That is interesting!', es: '¡Qué interesante!' },
          { en: 'And you?', es: '¿Y tú?' },
          { en: 'I see.', es: 'Ya veo.' },
          { en: 'For example', es: 'por ejemplo' },
          { en: 'Actually', es: 'en realidad' },
          { en: 'Good idea!', es: '¡Buena idea!' },
        ],
        phrases: [
          { en: 'How was your weekend?', es: '¿Cómo estuvo tu fin de semana?' },
          { en: 'Really? That sounds great!', es: '¿En serio? ¡Suena genial!' },
          { en: 'What do you do in your free time?', es: '¿Qué haces en tu tiempo libre?' },
          { en: 'I like talking to new people.', es: 'Me gusta hablar con gente nueva.' },
          { en: 'Let\'s keep in touch.', es: 'Mantengamos el contacto.' },
        ],
        speak: 'Start and maintain a 3-question conversation. 60 seconds.',
        challenge: 'Small talk: ask 3 questions and react with interest.',
      },
      {
        day: 18, title: 'Problems', topic: 'problems',
        goal: 'Explain problems and ask for help.',
        grammarFocus: 'I need... / Can you help me...?',
        vocabulary: [
          { en: 'problem', es: 'problema' },
          { en: 'I need help.', es: 'Necesito ayuda.' },
          { en: 'It doesn\'t work.', es: 'No funciona.' },
          { en: 'broken', es: 'roto/descompuesto' },
          { en: 'emergency', es: 'emergencia' },
          { en: 'Can you help me?', es: '¿Puedes ayudarme?' },
          { en: 'I lost my phone.', es: 'Perdí mi teléfono.' },
          { en: 'wait a moment', es: 'espera un momento' },
        ],
        phrases: [
          { en: 'Excuse me, I need help.', es: 'Disculpe, necesito ayuda.' },
          { en: 'My phone doesn\'t work.', es: 'Mi teléfono no funciona.' },
          { en: 'Can you help me with this?', es: '¿Puedes ayudarme con esto?' },
          { en: 'There is a problem with the internet.', es: 'Hay un problema con el internet.' },
          { en: 'Please, wait a moment.', es: 'Por favor, espera un momento.' },
        ],
        speak: 'Explain a problem in your apartment to the building manager. 45 seconds.',
        challenge: 'Roleplay: your computer is broken, ask for help to fix it.',
      },
      {
        day: 19, title: 'Opinions', topic: 'opinions',
        goal: 'Give and ask for opinions.',
        grammarFocus: 'I think... / In my opinion...',
        vocabulary: [
          { en: 'I think...', es: 'Creo que...' },
          { en: 'In my opinion', es: 'En mi opinión' },
          { en: 'I agree', es: 'Estoy de acuerdo' },
          { en: 'I disagree', es: 'No estoy de acuerdo' },
          { en: 'What do you think?', es: '¿Qué opinas?' },
          { en: 'Maybe', es: 'Quizás' },
          { en: 'In my experience', es: 'En mi experiencia' },
          { en: 'good point', es: 'buen punto' },
        ],
        phrases: [
          { en: 'I think this movie is great.', es: 'Creo que esta película es genial.' },
          { en: 'In my opinion, English is useful.', es: 'En mi opinión, el inglés es útil.' },
          { en: 'What do you think about it?', es: '¿Qué opinas al respecto?' },
          { en: 'I agree with you.', es: 'Estoy de acuerdo contigo.' },
          { en: 'In my experience, practice helps.', es: 'En mi experiencia, la práctica ayuda.' },
        ],
        speak: 'Give your opinion about your favorite movie or food. 60 seconds.',
        challenge: 'Debate a simple topic: agree and disagree politely.',
      },
      {
        day: 20, title: 'Speaking Practice 3', topic: 'speaking-3',
        goal: 'Combine everything for a short interview.',
        grammarFocus: 'revisión semana 3',
        vocabulary: [],
        phrases: [],
        speak: 'Short interview: introduce yourself, your job and your future plans. 90 seconds.',
        challenge: 'Record a 90-second interview answering 4 questions.',
      },
      {
        day: 21, title: 'Final Test and Transition', topic: 'final',
        goal: 'Complete the final test, review and transition to your next plan.',
        grammarFocus: 'test final + repetición',
        vocabulary: [
          { en: 'congratulations', es: 'felicidades' },
          { en: 'you did it!', es: '¡lo lograste!' },
          { en: 'foundation', es: 'fundamento' },
          { en: 'journey', es: 'viaje/trayecto' },
          { en: 'continue', es: 'continuar' },
          { en: 'next step', es: 'siguiente paso' },
          { en: 'keep going', es: 'sigue adelante' },
          { en: 'fluency', es: 'fluidez' },
        ],
        phrases: [
          { en: 'Congratulations! You did it!', es: '¡Felicidades! ¡Lo lograste!' },
          { en: 'You built your foundation.', es: 'Construiste tu base.' },
          { en: 'Your English journey is just beginning.', es: 'Tu viaje de inglés apenas comienza.' },
          { en: 'Let\'s continue to the next step.', es: 'Continuemos al siguiente paso.' },
          { en: 'Keep going!', es: '¡Sigue adelante!' },
        ],
        speak: 'Final speaking task: one minute about what you learned and your next goal.',
        challenge: 'Complete the final test and start the post-challenge assessment.',
      },
    ],
  },
];

// ============================================================
// Assessment post-21
// ============================================================

const ASSESSMENT = {
  id: 'post21-assessment',
  title: 'Post-Challenge Assessment',
  description: 'A quick check to identify your strengths and what to improve.',
  generated_content: true,
  source: 'provisional',
  status: 'published',
  sections: [
    { key: 'vocabulary', label: 'Vocabulary', items: 5, type: 'multiple-choice' },
    { key: 'listening', label: 'Listening', items: 4, type: 'listening' },
    { key: 'grammar', label: 'Grammar Fundamentals', items: 5, type: 'fill-in' },
    { key: 'conversation', label: 'Conversation', items: 3, type: 'dialogue' },
    { key: 'speaking', label: 'Speaking', items: 2, type: 'speaking' },
    { key: 'confidence', label: 'Confidence', items: 3, type: 'self-report' },
  ],
  scoreFields: [
    'speakingScore', 'listeningScore', 'vocabularyScore',
    'conversationScore', 'grammarScore', 'confidenceScore',
  ],
};

// ============================================================
// Plan base post-21 (30 días, 4 semanas)
// ============================================================

const PLANS = {
  id: 'learning-plan-base',
  title: 'My English Plan',
  generated_content: true,
  source: 'provisional',
  status: 'published',
  variants: [
    {
      condition: 'weakest: speaking',
      weeks: [
        { week: 1, focus: 'Speaking confidence', skill: 'speaking', dailyMinutes: 15 },
        { week: 2, focus: 'Listening', skill: 'listening', dailyMinutes: 15 },
        { week: 3, focus: 'Real conversations', skill: 'conversation', dailyMinutes: 20 },
        { week: 4, focus: 'Travel English', skill: 'travel', dailyMinutes: 15 },
      ],
    },
    {
      condition: 'weakest: listening',
      weeks: [
        { week: 1, focus: 'Listening basics', skill: 'listening', dailyMinutes: 15 },
        { week: 2, focus: 'Speaking confidence', skill: 'speaking', dailyMinutes: 15 },
        { week: 3, focus: 'Everyday conversations', skill: 'conversation', dailyMinutes: 15 },
        { week: 4, focus: 'Work English', skill: 'work', dailyMinutes: 15 },
      ],
    },
    {
      condition: 'default',
      weeks: [
        { week: 1, focus: 'Speaking confidence', skill: 'speaking', dailyMinutes: 15 },
        { week: 2, focus: 'Listening', skill: 'listening', dailyMinutes: 15 },
        { week: 3, focus: 'Real conversations', skill: 'conversation', dailyMinutes: 20 },
        { week: 4, focus: 'Travel English', skill: 'travel', dailyMinutes: 15 },
      ],
    },
  ],
};

// ============================================================
// POST-21 CURRICULUM — contenido continuo por skills/situaciones
// ============================================================

const POST21_LESSONS = [
  // --- SPEAKING / TRAVEL ---
  {
    id: 'p21-airport-checkin', title: 'Airport Check-in', level: 'beginner', skill: 'speaking', situation: 'travel',
    topic: 'Airport check-in', estimatedTime: 15, difficulty: 1, premium: true, contentType: 'lesson',
    goal: 'Check in at the airport: passport, luggage and gate questions.',
    vocabulary: [
      { en: 'boarding pass', es: 'pase de abordar' },
      { en: 'window seat', es: 'asiento de ventana' },
      { en: 'aisle seat', es: 'asiento de pasillo' },
      { en: 'to check in', es: 'hacer el check-in' },
    ],
    phrases: [
      { en: 'Here is my passport.', es: 'Aquí está mi pasaporte.' },
      { en: 'I would like a window seat, please.', es: 'Quisiera un asiento de ventana, por favor.' },
      { en: 'Do I need to check this bag?', es: '¿Necesito facturar esta bolsa?' },
      { en: 'What time does boarding start?', es: '¿A qué hora empieza el abordaje?' },
    ],
    speak: 'Check in for your flight: give your passport, ask for a seat and the gate.',
    challenge: 'Roleplay: full airport check-in with the AI tutor or a partner.',
  },
  {
    id: 'p21-hotel-checkin', title: 'Hotel Check-in', level: 'beginner', skill: 'speaking', situation: 'travel',
    topic: 'Hotel check-in', estimatedTime: 15, difficulty: 1, premium: true, contentType: 'lesson',
    goal: 'Check in at a hotel and ask about services.',
    vocabulary: [
      { en: 'reservation', es: 'reservación' },
      { en: 'room', es: 'habitación' },
      { en: 'Wi-Fi', es: 'wifi' },
      { en: 'breakfast', es: 'desayuno' },
    ],
    phrases: [
      { en: 'I have a reservation under Martinez.', es: 'Tengo una reservación a nombre de Martínez.' },
      { en: 'What time is breakfast?', es: '¿A qué hora es el desayuno?' },
      { en: 'Can I have the Wi-Fi password?', es: '¿Me da la contraseña del wifi?' },
      { en: 'My room does not work.', es: 'Mi habitación no funciona.' },
    ],
    speak: 'Check in at the hotel: name, reservation, breakfast time and Wi-Fi.',
    challenge: 'Ask the hotel staff to fix a problem in your room.',
  },
  // --- SPEAKING / RESTAURANT ---
  {
    id: 'p21-order-food', title: 'Ordering Food', level: 'beginner', skill: 'speaking', situation: 'restaurant',
    topic: 'Ordering food', estimatedTime: 15, difficulty: 1, premium: true, contentType: 'lesson',
    goal: 'Order a full meal and handle the bill.',
    vocabulary: [
      { en: 'appetizer', es: 'entrada' },
      { en: 'main course', es: 'plato principal' },
      { en: 'dessert', es: 'postre' },
      { en: 'the bill', es: 'la cuenta' },
    ],
    phrases: [
      { en: 'For starters, I would like a salad.', es: 'De entrada, quisiera una ensalada.' },
      { en: 'As a main course, the grilled chicken.', es: 'Como plato principal, el pollo a la parrilla.' },
      { en: 'Could we have the bill, please?', es: '¿Nos trae la cuenta, por favor?' },
      { en: 'Is the tip included?', es: '¿Está incluida la propina?' },
    ],
    speak: 'Order starters, a main course, a drink and ask for the bill.',
    challenge: 'Roleplay a full restaurant visit: order and pay.',
  },
  // --- SPEAKING / INTERVIEWS ---
  {
    id: 'p21-job-interview', title: 'Job Interview Basics', level: 'elementary', skill: 'speaking', situation: 'interviews',
    topic: 'Job interview', estimatedTime: 20, difficulty: 2, premium: true, contentType: 'lesson',
    goal: 'Introduce yourself professionally and answer basic interview questions.',
    vocabulary: [
      { en: 'experience', es: 'experiencia' },
      { en: 'strength', es: 'fortaleza' },
      { en: 'team', es: 'equipo' },
      { en: 'apply for', es: 'postularse a' },
    ],
    phrases: [
      { en: 'I have three years of experience in sales.', es: 'Tengo tres años de experiencia en ventas.' },
      { en: 'My main strength is communication.', es: 'Mi principal fortaleza es la comunicación.' },
      { en: 'Why do you want to work here?', es: '¿Por qué quieres trabajar aquí?' },
      { en: 'I am a good team player.', es: 'Trabajo bien en equipo.' },
    ],
    speak: 'Answer 4 interview questions about your experience and strengths.',
    challenge: 'Simulate a short interview with the AI tutor.',
  },
  // --- CONVERSATION / WORK ---
  {
    id: 'p21-meeting-colleagues', title: 'Meeting Colleagues', level: 'beginner', skill: 'conversation', situation: 'work',
    topic: 'Meeting colleagues', estimatedTime: 15, difficulty: 1, premium: true, contentType: 'lesson',
    goal: 'Introduce yourself at work and make small talk.',
    vocabulary: [
      { en: 'colleague', es: 'compañero de trabajo' },
      { en: 'department', es: 'departamento' },
      { en: 'project', es: 'proyecto' },
      { en: 'deadline', es: 'fecha límite' },
    ],
    phrases: [
      { en: 'I work in the marketing department.', es: 'Trabajo en el departamento de marketing.' },
      { en: 'What do you do here?', es: '¿A qué te dedicas aquí?' },
      { en: 'We are working on a new project.', es: 'Estamos trabajando en un proyecto nuevo.' },
      { en: 'The deadline is next Friday.', es: 'La fecha límite es el próximo viernes.' },
    ],
    speak: 'Introduce yourself to a new colleague: role, department and project.',
    challenge: 'Start a conversation with a coworker about your week.',
  },
  // --- CONVERSATION / SOCIAL ---
  {
    id: 'p21-small-talk', title: 'Small Talk', level: 'beginner', skill: 'conversation', situation: 'social',
    topic: 'Small talk', estimatedTime: 15, difficulty: 1, premium: true, contentType: 'lesson',
    goal: 'Make small talk and keep a conversation going.',
    vocabulary: [
      { en: 'weekend', es: 'fin de semana' },
      { en: 'weather', es: 'clima' },
      { en: 'plans', es: 'planes' },
      { en: 'by the way', es: 'por cierto' },
    ],
    phrases: [
      { en: 'How was your weekend?', es: '¿Cómo estuvo tu fin de semana?' },
      { en: 'The weather is nice today.', es: 'El clima está lindo hoy.' },
      { en: 'Do you have any plans tonight?', es: '¿Tienes planes esta noche?' },
      { en: 'By the way, how do you know Maria?', es: 'Por cierto, ¿cómo conoces a María?' },
    ],
    speak: 'Have a 3-question small talk conversation about the weekend.',
    challenge: 'Small talk at a party with the AI tutor for 2 minutes.',
  },
  // --- CONVERSATION / PHONE ---
  {
    id: 'p21-phone-call', title: 'Making a Phone Call', level: 'elementary', skill: 'conversation', situation: 'phone',
    topic: 'Phone calls', estimatedTime: 15, difficulty: 2, premium: true, contentType: 'lesson',
    goal: 'Make and receive basic phone calls.',
    vocabulary: [
      { en: 'hold on', es: 'espere un momento' },
      { en: 'call back', es: 'devolver la llamada' },
      { en: 'message', es: 'mensaje' },
      { en: 'extension', es: 'extensión' },
    ],
    phrases: [
      { en: 'Hello, may I speak to Mr. Perez?', es: 'Hola, ¿podría hablar con el Sr. Pérez?' },
      { en: 'Can you hold on a moment?', es: '¿Puede esperar un momento?' },
      { en: 'Can I leave a message?', es: '¿Puedo dejar un mensaje?' },
      { en: 'I will call you back tomorrow.', es: 'Te devolveré la llamada mañana.' },
    ],
    speak: 'Make a phone call: ask for someone, leave a message, call back.',
    challenge: 'Phone roleplay: order a pizza by phone.',
  },
  // --- LISTENING ---
  {
    id: 'p21-listen-directions', title: 'Understanding Directions', level: 'beginner', skill: 'listening', situation: 'daily-life',
    topic: 'Understanding directions', estimatedTime: 15, difficulty: 1, premium: true, contentType: 'lesson',
    goal: 'Understand spoken directions and follow them.',
    vocabulary: [
      { en: 'turn left', es: 'gira a la izquierda' },
      { en: 'turn right', es: 'gira a la derecha' },
      { en: 'straight ahead', es: 'todo recto' },
      { en: 'intersection', es: 'intersección' },
    ],
    phrases: [
      { en: 'Turn left at the intersection.', es: 'Gira a la izquierda en la intersección.' },
      { en: 'Go straight ahead for two blocks.', es: 'Sigue todo recto dos cuadras.' },
      { en: 'It is on your right.', es: 'Está a tu derecha.' },
      { en: 'You cannot miss it.', es: 'No puedes perderte.' },
    ],
    speak: 'Repeat the directions you just heard, out loud.',
    challenge: 'Listen to directions twice and repeat the route from memory.',
  },
  {
    id: 'p21-listen-airport', title: 'Airport Announcements', level: 'elementary', skill: 'listening', situation: 'travel',
    topic: 'Airport announcements', estimatedTime: 15, difficulty: 2, premium: true, contentType: 'lesson',
    goal: 'Understand common airport announcements.',
    vocabulary: [
      { en: 'gate', es: 'puerta de abordaje' },
      { en: 'delayed', es: 'retrasado' },
      { en: 'boarding', es: 'abordaje' },
      { en: 'final call', es: 'última llamada' },
    ],
    phrases: [
      { en: 'Flight 200 to Madrid is now boarding at gate 12.', es: 'El vuelo 200 a Madrid está abordando en la puerta 12.' },
      { en: 'Your flight is delayed by one hour.', es: 'Su vuelo está retrasado una hora.' },
      { en: 'This is the final call for passengers...', es: 'Esta es la última llamada para los pasajeros...' },
      { en: 'Please proceed to gate 5.', es: 'Por favor diríjase a la puerta 5.' },
    ],
    speak: 'Repeat the key details you heard: flight, gate, time.',
    challenge: 'Listen to an announcement and answer 3 questions about it.',
  },
  // --- VOCABULARY ---
  {
    id: 'p21-shopping-vocab', title: 'Shopping Vocabulary', level: 'beginner', skill: 'vocabulary', situation: 'shopping',
    topic: 'Shopping words', estimatedTime: 10, difficulty: 1, premium: true, contentType: 'lesson',
    goal: 'Learn useful words for shopping and stores.',
    vocabulary: [
      { en: 'discount', es: 'descuento' },
      { en: 'receipt', es: 'recibo' },
      { en: 'fitting room', es: 'probador' },
      { en: 'change', es: 'cambio (vuelto)' },
    ],
    phrases: [
      { en: 'Is there a discount?', es: '¿Hay algún descuento?' },
      { en: 'Where is the fitting room?', es: '¿Dónde está el probador?' },
      { en: 'Can I get a receipt, please?', es: '¿Me da un recibo, por favor?' },
      { en: 'Here is your change.', es: 'Aquí está tu cambio.' },
    ],
    speak: 'Say the 4 new words in a sentence each.',
    challenge: 'Buy something and ask for the receipt and change.',
  },
  {
    id: 'p21-travel-vocab', title: 'Travel Vocabulary', level: 'beginner', skill: 'vocabulary', situation: 'travel',
    topic: 'Travel words', estimatedTime: 10, difficulty: 1, premium: true, contentType: 'lesson',
    goal: 'Learn essential vocabulary for traveling.',
    vocabulary: [
      { en: 'departure', es: 'salida' },
      { en: 'arrival', es: 'llegada' },
      { en: 'currency', es: 'moneda' },
      { en: 'customs', es: 'aduana' },
    ],
    phrases: [
      { en: 'What is the departure time?', es: '¿Cuál es la hora de salida?' },
      { en: 'The arrival is at 6 p.m.', es: 'La llegada es a las 6 de la tarde.' },
      { en: 'Where can I exchange currency?', es: '¿Dónde puedo cambiar moneda?' },
      { en: 'I have nothing to declare at customs.', es: 'No tengo nada que declarar en la aduana.' },
    ],
    speak: 'Use the 4 new words in questions for the airport.',
    challenge: 'Ask 4 travel questions using the new vocabulary.',
  },
  // --- GRAMMAR ---
  {
    id: 'p21-past-review', title: 'Simple Past at Work', level: 'beginner', skill: 'grammar', situation: 'work',
    topic: 'Simple past review', estimatedTime: 15, difficulty: 1, premium: true, contentType: 'lesson',
    goal: 'Review the simple past to talk about your work week.',
    vocabulary: [
      { en: 'finished', es: 'terminé' },
      { en: 'started', es: 'empecé' },
      { en: 'attended', es: 'asistí' },
      { en: 'sent', es: 'envié' },
    ],
    phrases: [
      { en: 'I finished the report on Monday.', es: 'Terminé el informe el lunes.' },
      { en: 'I started a new project last week.', es: 'Empecé un proyecto nuevo la semana pasada.' },
      { en: 'I attended a meeting yesterday.', es: 'Asistí a una reunión ayer.' },
      { en: 'I sent an email to the client.', es: 'Envié un correo al cliente.' },
    ],
    speak: 'Describe your work week using the simple past (4 sentences).',
    challenge: 'Tell your AI tutor what you did at work this week.',
  },
];

const POST21_CURRICULUM = {
  id: 'post21-curriculum',
  title: 'Continuous Learning',
  description: 'Contenido continuo organizado por skills y situaciones reales.',
  generated_content: true,
  source: 'provisional',
  status: 'published',
  skills: ['speaking', 'listening', 'vocabulary', 'grammar', 'conversation'],
  situations: ['travel', 'work', 'social', 'shopping', 'restaurant', 'airport', 'hotel', 'phone', 'meetings', 'interviews', 'daily-life'],
  lessons: POST21_LESSONS,
};

// ============================================================
// Daily practice templates
// ============================================================

const DAILY_PRACTICE = {
  id: 'daily-practice-base',
  title: 'Today\'s Practice',
  generated_content: true,
  source: 'provisional',
  status: 'published',
  structure: [
    { block: 'Vocabulary', minutes: 5, contentType: 'flashcards' },
    { block: 'Listening', minutes: 5, contentType: 'audio' },
    { block: 'Speaking', minutes: 5, contentType: 'speaking' },
  ],
};

// ============================================================
// Metadata wrapper
// ============================================================

function buildDay(d) {
  return {
    id: `day-${String(d.day).padStart(2, '0')}`,
    day: d.day,
    title: d.title,
    topic: d.topic,
    goal: d.goal,
    estimatedTime: d.day % 7 === 0 ? 10 : 15,
    skill: d.topic.startsWith('speaking') ? 'speaking' : 'mixed',
    grammarFocus: d.grammarFocus,
    vocabulary: d.vocabulary,
    phrases: d.phrases,
    speak: d.speak,
    challenge: d.challenge,
    xpReward: 30 + (d.day % 7 === 0 ? 0 : 10),
    premium: false,
    source: 'provisional',
    generated_content: true,
    status: 'published',
    steps: ['learn', 'listen', 'pronounce', 'practice', 'speak', 'challenge', 'complete'],
  };
}

// ============================================================
// Write files
// ============================================================

function write() {
  const challengeDir = path.join(OUT, '21-day-challenge');
  fs.mkdirSync(challengeDir, { recursive: true });
  fs.mkdirSync(path.join(OUT, 'post21'), { recursive: true });

  const index = [];
  WEEKS.forEach((week, w) => {
    week.days.forEach((d) => {
      const day = buildDay(d);
      fs.writeFileSync(
        path.join(challengeDir, `day-${String(d.day).padStart(2, '0')}.json`),
        JSON.stringify(day, null, 2),
      );
      index.push({ day: d.day, id: day.id, title: d.title, topic: d.topic, week: w + 1, weekLabel: week.label });
    });
  });

  fs.writeFileSync(
    path.join(challengeDir, 'index.json'),
    JSON.stringify({
      id: '21-day-challenge',
      title: 'Inglés en 21 Días',
      generated_content: true,
      source: 'provisional',
      status: 'published',
      days: index,
    }, null, 2),
  );

  fs.writeFileSync(path.join(OUT, 'post21', 'assessment.json'), JSON.stringify(ASSESSMENT, null, 2));
  fs.writeFileSync(path.join(OUT, 'post21', 'plans.json'), JSON.stringify(PLANS, null, 2));
  fs.writeFileSync(path.join(OUT, 'post21', 'daily-practice.json'), JSON.stringify(DAILY_PRACTICE, null, 2));
  fs.writeFileSync(path.join(OUT, 'post21', 'curriculum.json'), JSON.stringify(POST21_CURRICULUM, null, 2));

  console.log(`OK: ${index.length} días generados en ${challengeDir}`);
  console.log(`OK: ${POST21_LESSONS.length} lecciones post-21 en content/post21/curriculum.json`);
  console.log('OK: assessment, plans, daily-practice en content/post21');
}

write();
