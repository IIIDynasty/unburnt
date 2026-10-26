// Unburnt — Stories & Categories Database
// "The Founding Fathers of Nigeria" (Active Path) + Coming Soon placeholders

const CATEGORIES = [
  {
    id: 1,
    title: "The Founding Fathers of Nigeria",
    subtitle: "Leaders who shaped independence & the First Republic",
    icon: "🏛️",
    color: "#ffc107",
    colorGlow: "rgba(255, 193, 7, 0.3)",
    isAvailable: true,
    stories: [
      {
        id: 1,
        title: "Who Was Nigeria's First President?",
        theme: "First Republic — 1963",
        image: "images/first Nigeria president.jpg",
        targetWordCount: 15,
        introduction: "You might think Nigeria's first president was Tafawa Balewa because he led the country at independence. Save the scrolls to uncover how Nnamdi Azikiwe became Nigeria's first President.",
        narrative: `You might think Nigeria's first president was Tafawa Balewa because he led the country at independence. But Nigeria was initially a parliamentary system, with Balewa as Prime Minister and the British monarch as head of state. It was only when Nigeria became a republic in 1963 that Nnamdi Azikiwe, popularly called "Zik," became Nigeria's first President.`,
        source: "Federal Ministry of Information and National Orientation — Today in Nigeria's History",
        words: ["Azikiwe", "President", "Republic", "Balewa", "Prime", "Minister", "Parliamentary", "Monarch", "System", "Zik", "Independence", "Federal", "Ministry", "History", "Nigeria"]
      },
      {
        id: 2,
        title: "Sir Ahmadu Bello's Last Encounter",
        theme: "Kaduna — January 1966",
        image: "images/Sir Ahmadu Bello.jpg",
        targetWordCount: 25,
        introduction: "The night of 14–15 January 1966 changed Nigeria forever. Save the scrolls to witness Sir Ahmadu Bello's courage during the military coup.",
        narrative: `The night of 14–15 January 1966 changed Nigeria forever. Major Chukwuma Kaduna Nzeogwu and soldiers under his command attacked Ahmadu Bello's residence in Kaduna during the military coup. According to accounts from people close to Bello, he had spent the evening receiving visitors and attending to his usual affairs, apparently unaware that soldiers were coming for him. He was killed alongside his wife, Kogguna, in the early hours of the morning. As the soldiers demanded to know which person was Ahmadu Bello, Bello stood up and said: "I'm the one you're looking for." He was then shot alongside his wife.`,
        source: "Gidado Idris, Sir Ahmadu Bello's personal secretary (Daily Trust)",
        words: ["Bello", "Ahmadu", "Nzeogwu", "Kaduna", "January", "Soldiers", "Coup", "Residence", "Kogguna", "Command", "Wife", "Affairs", "Visitors", "Secretary", "Idris", "Courage", "Premier", "Region", "Leader", "History", "Military", "Attack", "Night", "Northern", "Nigeria"]
      },
      {
        id: 3,
        title: "Tafawa Balewa's Independence Speech",
        theme: "Lagos — 1 October 1960",
        image: "images/Tafawa Balewa.jpg",
        targetWordCount: 35,
        introduction: "On the morning Nigeria became independent, Sir Abubakar Tafawa Balewa stood before the nation. Save the scrolls to restore his historic words.",
        narrative: `On the morning Nigeria became independent, Sir Abubakar Tafawa Balewa stood before the nation and received the constitutional instruments marking the end of British rule. He described the moment as a day Nigerians had eagerly awaited and said he felt privileged to dedicate his life to the service of the country. But he didn't stop at celebrating independence—he reminded Nigerians that the new nation had to work with the rest of the world and build on the foundations already laid.`,
        source: "Sir Abubakar Tafawa Balewa — Independence Day Speech, 1 October 1960",
        words: ["Balewa", "Abubakar", "Tafawa", "Independence", "October", "Speech", "Constitutional", "Instruments", "British", "Rule", "Nation", "Privileged", "Service", "Country", "Celebrating", "Foundations", "World", "Build", "Freedom", "Lagos", "Prime", "Minister", "History", "Heritage", "Nigeria", "Democracy", "Sovereign", "Flag", "Promise", "Future", "Citizens", "Unity", "Peace", "Progress", "Africa"]
      },
      {
        id: 4,
        title: "More Historical Eras",
        theme: "Coming Soon",
        introduction: "Additional stories about Nigeria's founding figures and pivotal moments are currently being archived.",
        narrative: `More historical chapters are currently being compiled from national archives. Check back soon for new historical stories!`,
        source: "Unburnt Archives",
        isComingSoon: true,
        words: []
      }
    ]
  },
  {
    id: 2,
    title: "Ancient Kingdoms & Folklore",
    subtitle: "Legends of Oduduwa, Moremi, Bayajidda & Nok Culture",
    icon: "🏺",
    color: "#ff5722",
    colorGlow: "rgba(255, 87, 34, 0.3)",
    isAvailable: false,
    stories: []
  },
  {
    id: 3,
    title: "Heroes & Warrior Queens",
    subtitle: "Stories of Queen Amina, Idia, Jaja & Efunsetan Aniwura",
    icon: "👑",
    color: "#7e57c2",
    colorGlow: "rgba(126, 87, 194, 0.3)",
    isAvailable: false,
    stories: []
  },
  {
    id: 4,
    title: "Courage & Resistance",
    subtitle: "Aba Women's War, Benin Expedition & Ekumeku Movement",
    icon: "⚔️",
    color: "#4caf50",
    colorGlow: "rgba(76, 175, 80, 0.3)",
    isAvailable: false,
    stories: []
  }
];

// Endless Mode Word Database categorized into short, medium, and long words
const ENDLESS_WORDS = {
  short: [
    "Zik", "Nok", "Owo", "Aba", "Kano", "Bida", "Edo", "Oyo", "Fire", "Ash",
    "King", "Oba", "Ooni", "Hero", "Gold", "Land", "Iron", "Clan", "Palm", "Soil",
    "Brave", "Folk", "Reign", "Myth", "Pact", "Duty", "Lore", "Robe", "Drum", "Mask",
    "Song", "Tale", "War", "Spear", "Wall", "Crown", "Dawn", "Echo", "Flame", "Glow",
    "Heat", "Jest", "Kept", "Leaf", "Mace", "Oath", "Peak", "Rune", "Sage", "Tomb",
    "Veil", "Zeal", "Born", "Calm", "Fort", "Gale", "Helm", "Pike", "Root", "Star"
  ],
  medium: [
    "Balewa", "Bello", "Kaduna", "Benin", "Ibadan", "Empire", "Kingdom", "Legend", "Bronze", "Monarch",
    "Courage", "History", "Leader", "Warrior", "Shield", "Freedom", "Nigeria", "Iyoba", "Sultan", "Emirate",
    "Caliph", "Premier", "Treaty", "Palace", "Statue", "Legacy", "Dynasty", "Ancient", "Flames", "Culture",
    "Resist", "Nation", "Anthem", "Colony", "Soldier", "Heroine", "Prophet", "Wisdom", "Scroll", "Archive",
    "Spirits", "Sacred", "Victory", "Century", "Honour", "Justice", "Tribal", "Village", "Foundry", "Carving",
    "Protect", "Revered", "Command", "Praise", "Council", "Chieftain", "Citadel", "Fortress", "Bastion", "Monolith",
    "Territory", "Scepter", "Ceremony", "Tribute", "Artifact", "Alliance", "Lineage", "Sovereign", "Passage", "Valor"
  ],
  long: [
    "Azikiwe", "Independence", "Parliamentary", "Constitutional", "Colonialism", "Resistance", "Revolution",
    "Civilization", "Archaeology", "Federation", "Administration", "Protectorate", "Sovereignty", "Nationalism",
    "Emancipation", "Celebration", "Governorship", "Proclamation", "Reunification", "Unconquered", "Descendants",
    "Generations", "Perseverance", "Distinguished", "Unshakable", "Brotherhood", "Commonwealth", "Centuries",
    "Monuments", "Foundations", "Patriotism", "Leadership", "Sacrifices", "Inscriptions", "Chronicles",
    "Significance", "Triumphant", "Testament", "Preservation", "Deliverance", "Resilience", "Heritage",
    "Sanctuary", "Testimony", "Courageous", "Triumphs", "Sovereigns", "Ancestral", "Magnificent", "Extraordinary"
  ]
};

if (typeof module !== 'undefined') {
  module.exports = { CATEGORIES, ENDLESS_WORDS };
}

