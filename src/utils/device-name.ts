// Friendly device name word lists
const ADJECTIVES = [
  'Swift', 'Brave', 'Clever', 'Mighty', 'Noble', 'Bright', 'Bold', 'Calm',
  'Daring', 'Eager', 'Fair', 'Gentle', 'Happy', 'Jolly', 'Kind', 'Lively',
  'Merry', 'Nice', 'Proud', 'Quiet', 'Rapid', 'Smart', 'Vibrant', 'Warm',
  'Witty', 'Zeal', 'Agile', 'Cosmic', 'Fuzzy', 'Humble',
];

const ANIMALS = [
  'Falcon', 'Panda', 'Tiger', 'Dolphin', 'Penguin', 'Raven', 'Lynx', 'Otter',
  'Hawk', 'Koala', 'Eagle', 'Wolf', 'Bear', 'Fox', 'Owl', 'Deer', 'Hare',
  'Swan', 'Crane', 'Bison', 'Mole', 'Viper', 'Gecko', 'Finch', 'Moose',
  'Rhino', 'Lemur', 'Puffin', 'Quokka', 'Walrus',
];

/**
 * Generates a friendly, memorable device name.
 */
export function generateDeviceName(): string {
  const bytes = new Uint8Array(2);
  crypto.getRandomValues(bytes);
  const adj = ADJECTIVES[bytes[0] % ADJECTIVES.length];
  const animal = ANIMALS[bytes[1] % ANIMALS.length];
  return `${adj} ${animal}`;
}
