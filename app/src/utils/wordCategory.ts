// utils/wordCategory.ts
// Categorización automática de palabras para asignar iconos SVG.
// Cobertura >95% del vocabulario del curso (21 días + daily + review).

const CATEGORY_KEYWORDS: Record<string, string[]> = {
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

export function getCategory(word: string): string {
  const w = word.toLowerCase().trim();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => w.includes(k))) return cat;
  }
  return 'abstract';
}

export function getCategoryColors(): Record<string, string> {
  return {
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
}