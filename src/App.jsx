import { useEffect, useMemo, useRef, useState } from "react";
import "./index.css";
import { loadCatalog } from './utils/catalog';

// Load categories from SVG files
const CATEGORIES = loadCatalog();

// Add category icons for display
const CATEGORY_ICONS = {
  colors: "🎨",
  letters: "🔤", 
  numbers: "🔢",
  machines: "🚗",
  fruitveg: "🥕",
  food: "🍽️",
  animals: "🐾",
  jobs: "👩‍🚒"
};

function useSpeech() {
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const preferredVoiceRef = useRef(null);

  useEffect(() => {
    if (!synthRef.current) return;
    const chooseVoice = () => {
      const all = synthRef.current.getVoices?.() || [];
      // Prefer Google US English Female if present, else any English voice
      const exact = all.find(v => /Google US English/i.test(v.name) && /en-US/i.test(v.lang));
      const fallback = all.find(v => /en(-| )US|GB|AU/i.test(v.lang));
      preferredVoiceRef.current = exact || fallback || all[0] || null;
    };
    chooseVoice();
    synthRef.current.onvoiceschanged = chooseVoice;

    const id = setInterval(() => {
      if (synthRef.current && !synthRef.current.speaking) setIsSpeaking(false);
    }, 200);
    return () => {
      clearInterval(id);
      if (synthRef.current) synthRef.current.onvoiceschanged = null;
    };
  }, []);

  const speak = (text) => {
    try {
      if (!synthRef.current) return;
      synthRef.current.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      // Slightly slower and brighter for kids
      utter.rate = 0.85;
      utter.pitch = 1.05;
      utter.volume = 1;
      if (preferredVoiceRef.current) utter.voice = preferredVoiceRef.current;
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      synthRef.current.speak(utter);
    } catch {}
  };

  return { speak, isSpeaking };
}

// Convert item to spoken text
function getSpeakText(categoryKey, word) {
  if (categoryKey === "letters") {
    // Speak the letter as-is
    return String(word);
  }
  if (categoryKey === "numbers") {
    const n = Number(word);
    const words = [
      '', 'one','two','three','four','five','six','seven','eight','nine','ten',
      'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'
    ];
    return words[n] || String(n);
  }
  return String(word);
}

function Splash({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  // Play a short chime when the splash screen first appears.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;

    const ctx = new AudioCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const start = ctx.currentTime;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, start);
    osc.frequency.exponentialRampToValueAtTime(880, start + 0.22);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + 0.85);

    const cleanup = setTimeout(() => {
      ctx.close().catch(() => {});
    }, 900);

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    return () => {
      clearTimeout(cleanup);
      try {
        osc.stop();
      } catch (_) {}
      ctx.close().catch(() => {});
    };
  }, []);

  return (
    <div className="screen splash">
      <div className="splash-bubble">
        <div className="splash-title">Tiny Wordy</div>
      </div>
      {/* Floating icons around the title, avoiding the center */}
      {(() => {
        const icons = ['🎨','🔤','🔢','🧰','🥕','🍽️','🐾','🍎','🍌','🍇','🍕','🍔','🐶','🐱','🦁','🐘','🦆','🔨','🔧','📏','🍉','🥦'];
        const elems = [];
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const isMobile = vw <= 480;
        const avoidMin = isMobile ? 25 : 35; // larger exclusion on phones
        const avoidMax = isMobile ? 75 : 65;
        for (let i = 0; i < icons.length; i++) {
          let top, left;
          let tries = 0;
          do {
            top = (isMobile ? 8 : 5) + Math.random() * (isMobile ? 84 : 90); // safe top/bottom
            left = 5 + Math.random() * 90;
            tries++;
            // Avoid center box
          } while ((top > avoidMin && top < avoidMax && left > avoidMin && left < avoidMax) && tries < 10);
          const delay = (i % 6) * 0.2;
          const baseSize = isMobile ? 18 : 22;
          const size = baseSize + (i % 4) * (isMobile ? 4 : 6);
          elems.push(
            <span
              key={i}
              className="floating-icon"
              style={{ top: `${top}%`, left: `${left}%`, animationDelay: `${delay}s`, fontSize: `${size}px` }}
              aria-hidden="true"
            >
              {icons[i]}
            </span>
          );
        }
        return elems;
      })()}
      <div className="splash-clouds" />
    </div>
  );
}

function Home({ onOpenCategory }) {
  return (
    <div className="screen home">
      <div className="app-title">Tiny Wordy</div>
      <div className="category-grid">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className="category-button"
            aria-label={c.label}
            onClick={() => onOpenCategory(c.key)}
          >
            <span className="category-icon" role="img" aria-hidden="true">
              {CATEGORY_ICONS[c.key] || "📁"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Category({ categoryKey, onBack }) {
  const category = useMemo(() => CATEGORIES.find((c) => c.key === categoryKey), [categoryKey]);
  const { speak, isSpeaking } = useSpeech();
  if (!category) return null;

  const items = (() => {
    const base = [...category.items];
    if (category.key === "numbers") {
      return base.sort((a, b) => Number(a.slug) - Number(b.slug));
    }
    if (category.key === "letters") {
      return base.sort((a, b) => a.slug.localeCompare(b.slug));
    }
    return base.sort((a, b) => a.label.localeCompare(b.label));
  })();

  const itemIcon = (slug) => {
    const map = {
      // Colors
      red: "🟥", orange: "🟧", yellow: "🟨", green: "🟩", blue: "🟦", purple: "🟪", pink: "🌸", brown: "🟫", black: "⬛", white: "⬜",
      gray: "⚫", silver: "🔘", gold: "🟡", turquoise: "🟢", lime: "🟢", magenta: "🟣", cyan: "🔵", indigo: "🟣", violet: "🟣", maroon: "🟤", navy: "🔵", olive: "🟢", teal: "🟢", coral: "🟠", beige: "🟡",
      
      // Machines
      tractor: "🚜", car: "🚗", plane: "✈️", "monster-truck": "🚛", bus: "🚌", truck: "🚚", motorcycle: "🏍️", bicycle: "🚲", scooter: "🛴", train: "🚂", boat: "🚤", ship: "🚢", helicopter: "🚁", submarine: "🛸", tank: "🚗", bulldozer: "🚜", crane: "🏗️", excavator: "🚜", forklift: "🚜", ambulance: "🚑", "fire-truck": "🚒", "police-car": "🚔", taxi: "🚕", van: "🚐", "semi-truck": "🚛", "race-car": "🏎️", sailboat: "⛵", yacht: "🛥️", "jet-ski": "🛥️", snowmobile: "🛷",
      
      // Fruits & Vegetables
      apple: "🍎", banana: "🍌", orange_fruit: "🍊", grape: "🍇", strawberry: "🍓", watermelon: "🍉", carrot: "🥕", broccoli: "🥦", tomato: "🍅", potato: "🥔",
      pear: "🍐", peach: "🍑", cherry: "🍒", lemon: "🍋", lime: "🍋", pineapple: "🍍", mango: "🥭", kiwi: "🥝", avocado: "🥑", cucumber: "🥒", lettuce: "🥬", onion: "🧅", pepper: "🌶️", corn: "🌽", spinach: "🥬", cabbage: "🥬", radish: "🥕", beet: "🥕", squash: "🎃", zucchini: "🥒",
      
      // Food
      bread: "🍞", cheese: "🧀", milk: "🥛", egg: "🥚", rice: "🍚", noodles: "🍜", pizza: "🍕", burger: "🍔", soup: "🍲", salad: "🥗", sandwich: "🥪", pasta: "🍝", cake: "🍰", cookie: "🍪", candy: "🍬", chocolate: "🍫", "ice-cream": "🍦", yogurt: "🥛", butter: "🧈", jam: "🍯", honey: "🍯", cereal: "🥣", pancake: "🥞", waffle: "🧇", donut: "🍩", muffin: "🧁", bagel: "🥯", cracker: "🍪", pretzel: "🥨", popcorn: "🍿",
      
      // Animals
      cat: "🐱", dog: "🐶", bird: "🐦", fish: "🐟", lion: "🦁", tiger: "🐯", elephant: "🐘", monkey: "🐵", horse: "🐴", duck: "🦆",
      cow: "🐄", pig: "🐷", sheep: "🐑", goat: "🐐", chicken: "🐔", rooster: "🐓", rabbit: "🐰", hamster: "🐹", mouse: "🐭", squirrel: "🐿️", bear: "🐻", wolf: "🐺", fox: "🦊", deer: "🦌", giraffe: "🦒", zebra: "🦓", penguin: "🐧", owl: "🦉", eagle: "🦅", dolphin: "🐬", whale: "🐋", shark: "🦈", octopus: "🐙", crab: "🦀", lobster: "🦞", butterfly: "🦋", bee: "🐝", spider: "🕷️", ant: "🐜", ladybug: "🐞",
      
      // Jobs
      teacher: "👩‍🏫", doctor: "👨‍⚕️", nurse: "👩‍⚕️", firefighter: "👩‍🚒", "police-officer": "👮", chef: "👨‍🍳", farmer: "👩‍🌾", artist: "👩‍🎨", driver: "🚗", engineer: "👨‍💻", scientist: "👩‍🔬", lawyer: "👨‍💼", judge: "👨‍⚖️", dentist: "👩‍⚕️", veterinarian: "👩‍⚕️", mechanic: "👨‍🔧", electrician: "👨‍🔧", plumber: "👨‍🔧", carpenter: "👨‍🔧", architect: "👩‍💼", designer: "👩‍🎨", photographer: "📷", musician: "🎵", singer: "🎤", dancer: "💃", actor: "🎭", writer: "✍️", journalist: "📰", reporter: "📺", librarian: "📚", lifeguard: "🏊", mailman: "📮", "delivery-person": "📦", cashier: "💰", waiter: "🍽️", barber: "💇", hairdresser: "💇", cleaner: "🧹", "security-guard": "🛡️",
    };
    if (category.key === "letters") return slug;
    if (category.key === "numbers") return slug;
    if (category.key !== 'colors' && slug === 'orange') return map.orange_fruit;
    return map[slug] || "🖼️";
  };

  const colorValue = (name) => {
    const map = {
      red: '#ff4d4d', orange: '#ffa94d', yellow: '#ffd43b', green: '#69db7c', blue: '#4dabf7', purple: '#b197fc', pink: '#ff85c0', brown: '#b08968', black: '#1f1f1f', white: '#ffffff',
      gray: '#808080', silver: '#c0c0c0', gold: '#ffd700', turquoise: '#40e0d0', lime: '#00ff00', magenta: '#ff00ff', cyan: '#00ffff', indigo: '#4b0082', violet: '#8a2be2', maroon: '#800000', navy: '#000080', olive: '#808000', teal: '#008080', coral: '#ff7f50', beige: '#f5f5dc'
    };
    return map[name] || '#cccccc';
  };

  return (
    <div className="screen category">
      <div className="category-header">
        <button className="back-button" onClick={onBack} aria-label="Go back">
          ⟵
        </button>
        <div className="category-title">
          <span className="category-title-icon" role="img" aria-hidden="true">
            {CATEGORY_ICONS[category.key] || "📁"}
          </span>
          {category.label}
        </div>
        <div className={`speaker-indicator ${isSpeaking ? "playing" : ""}`} aria-hidden="true">
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
        </div>
      </div>

      <div className="items-grid">
        {items.map((item) => (
          <div key={item.slug} className="item-card">
            <div className="item-picture">
              {category.key === "colors" ? (
                <span
                  style={{
                    display: 'inline-block',
                    width: '64px',
                    height: '64px',
                    borderRadius: '12px',
                    backgroundColor: colorValue(item.slug),
                    boxShadow: '0 4px 8px rgba(0,0,0,0.15), inset 0 0 0 2px rgba(255,255,255,0.3)',
                    border: '2px solid rgba(0,0,0,0.1)'
                  }}
                />
              ) : item.iconUrl ? (
                <>
                  <img
                    src={item.iconUrl}
                    alt={item.label}
                    width={96}
                    height={96}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.style.display = "block";
                    }}
                    style={{ display: "block" }}
                  />
                  <span className="emoji-fallback" role="img" aria-hidden="true" style={{ display: "none", fontSize: "64px" }}>
                    {itemIcon(item.slug)}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: "64px" }}>
                  {itemIcon(item.slug)}
                </span>
              )}
            </div>
            <div className="item-word">{item.label}</div>
            <button className="play-button" onClick={() => speak(getSpeakText(category.key, item.slug))} aria-label={`Play ${item.label}`}>
              🔊
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [screen, setScreen] = useState("home"); // "home" or category key

  useEffect(() => {
    if (showSplash) return;
    const handler = (e) => e.preventDefault();
    document.addEventListener('gesturestart', handler, { passive: false });
    return () => document.removeEventListener('gesturestart', handler, { passive: false });
  }, [showSplash]);

  return (
    <div className="app">
      {showSplash ? (
        <Splash onDone={() => setShowSplash(false)} />
      ) : screen === "home" ? (
        <Home onOpenCategory={(key) => setScreen(key)} />
      ) : (
        <Category categoryKey={screen} onBack={() => setScreen("home")} />
      )}
    </div>
  );
}
