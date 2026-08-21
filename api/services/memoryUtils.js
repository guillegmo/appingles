// services/memoryUtils.js
// Utilidades de categorización e iconos SVG para Memory Match (Node.js CommonJS).

const CATEGORY_COLOR = {
  food: '#e67e22',
  drink: '#3498db',
  animal: '#27ae60',
  object: '#8e44ad',
  place: '#f39c12',
  action: '#e74c3c',
  clothing: '#9b59b6',
  body: '#1abc9c',
  nature: '#2ecc71',
  transport: '#34495e',
  time: '#f1c40f',
  abstract: '#95a5a6',
};

const templates = {
  food: (c) => `
    <circle cx="50" cy="55" r="32" fill="${c}" />
    <ellipse cx="30" cy="30" rx="12" ry="8" fill="#27ae60" transform="rotate(-30 30 30)" />
    <ellipse cx="70" cy="45" rx="8" ry="5" fill="#27ae60" transform="rotate(15 70 45)" />
  `,
  drink: (c) => `
    <rect x="30" y="25" width="40" height="55" rx="8" fill="none" stroke="${c}" stroke-width="6" />
    <path d="M 40 30 Q 50 18 60 30" stroke="${c}" stroke-width="4" fill="none" />
    <rect x="42" y="15" width="16" height="12" rx="4" fill="${c}" />
  `,
  animal: (c) => `
    <ellipse cx="50" cy="60" rx="30" ry="24" fill="${c}" />
    <circle cx="38" cy="50" r="7" fill="#fff" />
    <circle cx="38" cy="50" r="3" fill="#000" />
    <circle cx="62" cy="50" r="7" fill="#fff" />
    <circle cx="62" cy="50" r="3" fill="#000" />
    <ellipse cx="50" cy="72" rx="8" ry="4" fill="#fff" />
    <ellipse cx="50" cy="72" rx="4" ry="2" fill="#000" />
  `,
  object: (c) => `
    <rect x="22" y="28" width="56" height="48" rx="6" fill="none" stroke="${c}" stroke-width="5" />
    <line x1="50" y1="28" x2="50" y2="76" stroke="${c}" stroke-width="3" />
    <line x1="22" y1="52" x2="78" y2="52" stroke="${c}" stroke-width="2" stroke-dasharray="8,4" />
  `,
  place: (c) => `
    <rect x="20" y="42" width="60" height="35" fill="${c}" rx="4" />
    <polygon points="50,12 80,42 20,42" fill="${c}" />
    <rect x="44" y="52" width="12" height="25" fill="#fff" rx="2" />
    <rect x="32" y="55" width="14" height="18" fill="#fff" rx="2" />
    <rect x="54" y="55" width="14" height="18" fill="#fff" rx="2" />
  `,
  action: (c) => `
    <circle cx="50" cy="22" r="14" fill="${c}" />
    <ellipse cx="50" cy="58" rx="20" ry="26" fill="${c}" />
    <line x1="35" y1="52" x2="28" y2="82" stroke="${c}" stroke-width="6" stroke-linecap="round" />
    <line x1="65" y1="52" x2="72" y2="82" stroke="${c}" stroke-width="6" stroke-linecap="round" />
    <line x1="40" y1="70" x2="32" y2="92" stroke="${c}" stroke-width="5" stroke-linecap="round" />
    <line x1="60" y1="70" x2="68" y2="92" stroke="${c}" stroke-width="5" stroke-linecap="round" />
  `,
  clothing: (c) => `
    <path d="M 30 32 L 70 32 L 64 78 L 36 78 Z" fill="${c}" stroke="${c}" stroke-width="2" />
    <rect x="45" y="20" width="10" height="15" fill="${c}" />
    <path d="M 30 32 Q 25 40 22 55 Q 20 65 30 78" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round" />
    <path d="M 70 32 Q 75 40 78 55 Q 80 65 70 78" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round" />
  `,
  body: (c) => `
    <ellipse cx="50" cy="30" rx="20" ry="16" fill="${c}" />
    <circle cx="44" cy="26" r="4" fill="#000" />
    <circle cx="56" cy="26" r="4" fill="#000" />
    <ellipse cx="50" cy="38" rx="8" ry="4" fill="none" stroke="#000" stroke-width="2" />
    <ellipse cx="50" cy="68" rx="28" ry="18" fill="${c}" />
  `,
  nature: (c) => `
    <ellipse cx="50" cy="75" rx="28" ry="16" fill="#8b7355" />
    <circle cx="50" cy="45" r="22" fill="${c}" />
    <ellipse cx="35" cy="40" rx="8" ry="12" fill="#fff" transform="rotate(-20 35 40)" />
    <ellipse cx="65" cy="40" rx="8" ry="12" fill="#fff" transform="rotate(20 65 40)" />
    <circle cx="35" cy="35" r="3" fill="#000" />
    <circle cx="65" cy="35" r="3" fill="#000" />
  `,
  transport: (c) => `
    <rect x="18" y="50" width="64" height="28" rx="6" fill="${c}" />
    <rect x="28" y="35" width="44" height="18" rx="4" fill="${c}" />
    <circle cx="32" cy="78" r="11" fill="#333" />
    <circle cx="68" cy="78" r="11" fill="#333" />
    <circle cx="32" cy="78" r="5" fill="#fff" />
    <circle cx="68" cy="78" r="5" fill="#fff" />
  `,
  time: (c) => `
    <circle cx="50" cy="50" r="42" fill="none" stroke="${c}" stroke-width="5" />
    <circle cx="50" cy="50" r="6" fill="${c}" />
    <line x1="50" y1="50" x2="50" y2="18" stroke="${c}" stroke-width="4" stroke-linecap="round" />
    <line x1="50" y1="50" x2="78" y2="50" stroke="${c}" stroke-width="3" stroke-linecap="round" />
    <circle cx="50" cy="50" r="38" fill="none" stroke="${c}" stroke-width="1" stroke-dasharray="4,4" />
  `,
  abstract: (c) => `
    <path d="M 50 18 C 68 18 78 35 78 50 C 78 65 50 92 50 92 C 50 92 22 65 22 50 C 22 35 32 18 50 18 Z" fill="${c}" />
    <circle cx="50" cy="42" r="12" fill="#fff" opacity="0.3" />
  `,
};

function getIconSVG(category, _word) {
  const cat = category && templates[category] ? category : 'abstract';
  const color = CATEGORY_COLOR[cat] || CATEGORY_COLOR.abstract;
  const tpl = templates[cat] || templates.abstract;
  const svg = tpl(color);
  return `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img">${svg}</svg>`;
}

const CATEGORY_KEYWORDS = {
  food: [
    'apple', 'bread', 'rice', 'egg', 'meat', 'fish', 'fruit', 'vegetable', 'soup', 'cake',
    'cookie', 'cheese', 'milk', 'yogurt', 'pizza', 'pasta', 'chicken', 'beef', 'pork',
    'salad', 'sandwich', 'burger', 'fries', 'noodles', 'dumpling', 'tofu', 'bean',
    'carrot', 'potato', 'tomato', 'onion', 'garlic', 'pepper', 'lettuce', 'spinach',
    'banana', 'orange', 'grape', 'strawberry', 'watermelon', 'mango', 'pineapple',
    'lemon', 'lime', 'peach', 'pear', 'plum', 'cherry', 'berry', 'nut', 'almond',
    'peanut', 'seed', 'honey', 'jam', 'butter', 'oil', 'salt', 'sugar', 'spice',
    'breakfast', 'lunch', 'dinner', 'meal', 'snack', 'dessert', 'cook', 'bake', 'fry'
  ],
  drink: [
    'water', 'coffee', 'tea', 'juice', 'beer', 'wine', 'soda', 'milk', 'shake',
    'smoothie', 'cocktail', 'whiskey', 'vodka', 'rum', 'gin', 'champagne',
    'lemonade', 'iced tea', 'hot chocolate', 'cappuccino', 'espresso', 'latte',
    'alcohol', 'beverage', 'drink', 'cup', 'glass', 'bottle', 'can', 'mug'
  ],
  animal: [
    'dog', 'cat', 'bird', 'fish', 'horse', 'cow', 'pig', 'sheep', 'lion', 'tiger',
    'bear', 'elephant', 'giraffe', 'zebra', 'monkey', 'rabbit', 'mouse', 'rat',
    'hamster', 'guinea pig', 'ferret', 'chinchilla', 'hedgehog', 'squirrel',
    'deer', 'fox', 'wolf', 'coyote', 'raccoon', 'skunk', 'otter', 'seal', 'whale',
    'dolphin', 'shark', 'octopus', 'crab', 'lobster', 'shrimp', 'clam', 'oyster',
    'snake', 'lizard', 'turtle', 'frog', 'toad', 'salamander', 'newt', 'gecko',
    'chameleon', 'iguana', 'crocodile', 'alligator', 'dinosaur', 'pet', 'wild',
    'farm', 'zoo', 'vet', 'cage', 'kennel', 'nest', 'burrow', 'den', 'web'
  ],
  object: [
    'book', 'phone', 'chair', 'table', 'door', 'window', 'key', 'bag', 'pen',
    'paper', 'computer', 'laptop', 'tablet', 'mouse', 'keyboard', 'screen',
    'monitor', 'printer', 'scanner', 'camera', 'headphone', 'speaker', 'microphone',
    'charger', 'cable', 'battery', 'plug', 'outlet', 'switch', 'lamp', 'light',
    'bulb', 'fan', 'heater', 'ac', 'remote', 'tv', 'radio', 'clock', 'watch',
    'calendar', 'notebook', 'pencil', 'eraser', 'ruler', 'scissors', 'tape',
    'glue', 'stapler', 'folder', 'binder', 'envelope', 'stamp', 'letter', 'card',
    'box', 'bottle', 'jar', 'can', 'cup', 'mug', 'glass', 'plate', 'bowl',
    'spoon', 'fork', 'knife', 'napkin', 'towel', 'soap', 'shampoo', 'toothbrush',
    'toothpaste', 'comb', 'brush', 'mirror', 'razor', 'cream', 'lotion', 'perfume'
  ],
  place: [
    'house', 'home', 'school', 'park', 'store', 'shop', 'restaurant', 'hospital',
    'bank', 'city', 'country', 'town', 'village', 'street', 'road', 'avenue',
    'boulevard', 'highway', 'bridge', 'tunnel', 'station', 'airport', 'port',
    'harbor', 'beach', 'mountain', 'hill', 'valley', 'river', 'lake', 'sea',
    'ocean', 'island', 'forest', 'woods', 'field', 'farm', 'garden', 'yard',
    'garage', 'basement', 'attic', 'roof', 'ceiling', 'floor', 'wall', 'corner',
    'room', 'bedroom', 'bathroom', 'kitchen', 'living', 'dining', 'office',
    'library', 'museum', 'theater', 'cinema', 'gym', 'pool', 'court', 'field',
    'market', 'mall', 'supermarket', 'pharmacy', 'bakery', 'butcher', 'florist',
    'post office', 'police', 'fire', 'church', 'temple', 'mosque', 'synagogue'
  ],
  action: [
    'run', 'walk', 'eat', 'sleep', 'read', 'write', 'speak', 'listen', 'work',
    'play', 'study', 'drive', 'swim', 'fly', 'jump', 'dance', 'sing', 'draw',
    'paint', 'cook', 'bake', 'clean', 'wash', 'dry', 'iron', 'vacuum', 'sweep',
    'mop', 'dust', 'tidy', 'organize', 'fix', 'repair', 'build', 'make', 'create',
    'design', 'draw', 'code', 'program', 'type', 'click', 'tap', 'swipe', 'scroll',
    'open', 'close', 'start', 'stop', 'pause', 'resume', 'save', 'load', 'delete',
    'copy', 'paste', 'cut', 'undo', 'redo', 'find', 'search', 'browse', 'visit',
    'call', 'text', 'email', 'message', 'chat', 'post', 'share', 'like', 'follow',
    'buy', 'sell', 'pay', 'cost', 'price', 'cheap', 'expensive', 'free', 'discount',
    'learn', 'teach', 'study', 'practice', 'train', 'exercise', 'stretch', 'warm up',
    'cool down', 'rest', 'relax', 'breathe', 'meditate', 'focus', 'concentrate'
  ],
  clothing: [
    'shirt', 'pants', 'shoes', 'hat', 'coat', 'jacket', 'sock', 'dress', 'skirt',
    'tie', 'belt', 'glove', 'scarf', 'cap', 'hoodie', 'sweater', 'cardigan',
    'blazer', 'suit', 'vest', 't-shirt', 'tank top', 'shorts', 'jeans', 'leggings',
    'tights', 'stocking', 'pantyhose', 'underwear', 'bra', 'boxer', 'brief',
    'pajama', 'robe', 'slipper', 'sandal', 'boot', 'sneaker', 'loafer', 'heel',
    'flat', 'pump', 'clog', 'flip flop', 'raincoat', 'poncho', 'umbrella', 'mittens',
    'earmuffs', 'beanie', 'beret', 'fedora', 'baseball cap', 'visor', 'headband',
    'hair tie', 'clip', 'pin', 'brooch', 'necklace', 'bracelet', 'ring', 'earring',
    'watch', 'glasses', 'sunglasses', 'contact', 'lens', 'frame', 'case', 'bag',
    'purse', 'wallet', 'backpack', 'tote', 'satchel', 'briefcase', 'duffel', 'luggage'
  ],
  body: [
    'head', 'hand', 'foot', 'eye', 'ear', 'mouth', 'nose', 'arm', 'leg', 'finger',
    'toe', 'tooth', 'teeth', 'tongue', 'lip', 'chin', 'cheek', 'forehead', 'eyebrow',
    'eyelash', 'eyelid', 'pupil', 'iris', 'retina', 'cornea', 'optic', 'brain',
    'skull', 'face', 'neck', 'shoulder', 'elbow', 'wrist', 'palm', 'thumb', 'nail',
    'knuckle', 'knee', 'ankle', 'heel', 'sole', 'arch', 'thigh', 'calf', 'shin',
    'hip', 'waist', 'chest', 'breast', 'back', 'spine', 'rib', 'stomach', 'belly',
    'navel', 'heart', 'lung', 'liver', 'kidney', 'bone', 'muscle', 'tendon', 'joint',
    'skin', 'hair', 'blood', 'vein', 'artery', 'nerve', 'organ', 'system', 'cell'
  ],
  nature: [
    'tree', 'flower', 'sun', 'cloud', 'rain', 'snow', 'wind', 'sky', 'moon', 'star',
    'grass', 'leaf', 'branch', 'root', 'seed', 'plant', 'flower', 'bush', 'shrub',
    'vine', 'weed', 'moss', 'fern', 'cactus', 'palm', 'pine', 'oak', 'maple', 'birch',
    'willow', 'cedar', 'redwood', 'sequoia', 'bamboo', 'reed', 'grass', 'lawn',
    'meadow', 'field', 'pasture', 'prairie', 'savanna', 'desert', 'dune', 'oasis',
    'spring', 'summer', 'autumn', 'fall', 'winter', 'season', 'weather', 'climate',
    'temperature', 'degree', 'celsius', 'fahrenheit', 'humidity', 'pressure', 'storm',
    'thunder', 'lightning', 'rainbow', 'fog', 'mist', 'dew', 'frost', 'ice', 'hail',
    'cloudy', 'sunny', 'rainy', 'snowy', 'windy', 'stormy', 'clear', 'overcast'
  ],
  transport: [
    'car', 'bus', 'train', 'plane', 'bike', 'bicycle', 'boat', 'ship', 'taxi', 'subway',
    'tram', 'metro', 'rail', 'track', 'station', 'platform', 'ticket', 'pass', 'fare',
    'driver', 'passenger', 'conductor', 'pilot', 'captain', 'crew', 'flight', 'route',
    'schedule', 'timetable', 'delay', 'cancel', 'departure', 'arrival', 'gate', 'terminal',
    'runway', 'hangar', 'control', 'tower', 'radar', 'navigation', 'compass', 'map',
    'gps', 'highway', 'freeway', 'expressway', 'lane', 'exit', 'entrance', 'ramp',
    'bridge', 'tunnel', 'ferry', 'cruise', 'yacht', 'sailboat', 'canoe', 'kayak',
    'raft', 'submarine', 'helicopter', 'jet', 'rocket', 'shuttle', 'satellite', 'space',
    'walk', 'run', 'jog', 'sprint', 'hike', 'trek', 'climb', 'ride', 'drive', 'fly'
  ],
  time: [
    'morning', 'afternoon', 'evening', 'night', 'today', 'tomorrow', 'yesterday',
    'week', 'month', 'year', 'hour', 'minute', 'second', 'day', 'date', 'time',
    'clock', 'watch', 'calendar', 'schedule', 'appointment', 'meeting', 'deadline',
    'early', 'late', 'on time', 'past', 'present', 'future', 'now', 'then', 'when',
    'before', 'after', 'during', 'while', 'since', 'until', 'ago', 'later', 'soon',
    'recent', 'recently', 'new', 'old', 'young', 'age', 'birthday', 'anniversary',
    'holiday', 'vacation', 'break', 'weekend', 'weekday', 'monday', 'tuesday',
    'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february',
    'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october',
    'november', 'december', 'spring', 'summer', 'autumn', 'winter', 'season'
  ],
  abstract: [
    'love', 'happy', 'sad', 'big', 'small', 'hot', 'cold', 'good', 'bad', 'fast',
    'slow', 'easy', 'hard', 'right', 'wrong', 'true', 'false', 'yes', 'no', 'maybe',
    'always', 'never', 'sometimes', 'often', 'rarely', 'usually', 'every', 'all',
    'some', 'any', 'none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
    'eight', 'nine', 'ten', 'first', 'last', 'next', 'previous', 'new', 'old',
    'young', 'fresh', 'stale', 'clean', 'dirty', 'full', 'empty', 'open', 'closed',
    'on', 'off', 'up', 'down', 'in', 'out', 'over', 'under', 'above', 'below',
    'between', 'among', 'through', 'across', 'along', 'around', 'behind', 'beside',
    'near', 'far', 'here', 'there', 'where', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers',
    'ours', 'theirs', 'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else',
    'because', 'so', 'therefore', 'however', 'although', 'though', 'while', 'when'
  ],
};

function getCategory(word) {
  if (!word) return 'abstract';
  const w = word.toLowerCase().trim();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => w.includes(k))) return cat;
  }
  return 'abstract';
}

module.exports = { getCategory, getIconSVG };
