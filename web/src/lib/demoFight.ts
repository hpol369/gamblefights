// Demo fight script for spectator mode on landing page
import { FightScript, FightEvent } from '@/app/context/GameContext';

// Generate a randomized demo fight
export function generateDemoFight(): FightScript {
  const gladiatorNames = [
    'Maximus', 'Spartacus', 'Crixus', 'Commodus', 'Tigris',
    'Flamma', 'Priscus', 'Verus', 'Spiculus', 'Carpophorus'
  ];

  const playerA = gladiatorNames[Math.floor(Math.random() * gladiatorNames.length)];
  let playerB = gladiatorNames[Math.floor(Math.random() * gladiatorNames.length)];
  while (playerB === playerA) {
    playerB = gladiatorNames[Math.floor(Math.random() * gladiatorNames.length)];
  }

  const characterA = 'trump';
  const characterB = 'maduro';

  const events: FightEvent[] = [];
  let time = 0;
  let healthA = 99;
  let healthB = 99;
  let winner: 'playerA' | 'playerB' | null = null;

  // Generate fight events until someone wins
  while (healthA > 0 && healthB > 0 && time < 30) {
    const attacker = Math.random() > 0.5 ? 'playerA' : 'playerB';
    const eventType = Math.random();

    time += 0.8 + Math.random() * 0.8; // 0.8-1.6 seconds between attacks

    if (eventType < 0.6) {
      // Hit
      const isCrit = Math.random() < 0.15;
      const baseDamage = 8 + Math.floor(Math.random() * 12); // 8-20
      const damage = isCrit ? Math.floor(baseDamage * 1.5) : baseDamage;

      events.push({
        time: parseFloat(time.toFixed(2)),
        type: 'attack_slash',
        actor: attacker,
        hit: true,
        crit: isCrit,
        damage: damage,
      });

      if (attacker === 'playerA') {
        healthB -= damage;
      } else {
        healthA -= damage;
      }
    } else if (eventType < 0.8) {
      // Block
      events.push({
        time: parseFloat(time.toFixed(2)),
        type: 'attack_slash',
        actor: attacker,
        hit: false,
      });
      events.push({
        time: parseFloat((time + 0.1).toFixed(2)),
        type: 'react_block',
        actor: attacker === 'playerA' ? 'playerB' : 'playerA',
      });
    } else {
      // Dodge
      events.push({
        time: parseFloat(time.toFixed(2)),
        type: 'attack_slash',
        actor: attacker,
        hit: false,
        dodge: true,
      });
      events.push({
        time: parseFloat((time + 0.1).toFixed(2)),
        type: 'react_dodge',
        actor: attacker === 'playerA' ? 'playerB' : 'playerA',
      });
    }
  }

  // Determine winner
  if (healthA <= 0) {
    winner = 'playerB';
    events.push({
      time: parseFloat((time + 0.5).toFixed(2)),
      type: 'ko',
      actor: 'playerA',
    });
    events.push({
      time: parseFloat((time + 0.8).toFixed(2)),
      type: 'victory',
      actor: 'playerB',
    });
  } else {
    winner = 'playerA';
    events.push({
      time: parseFloat((time + 0.5).toFixed(2)),
      type: 'ko',
      actor: 'playerB',
    });
    events.push({
      time: parseFloat((time + 0.8).toFixed(2)),
      type: 'victory',
      actor: 'playerA',
    });
  }

  return {
    matchId: `demo-${Date.now()}`,
    playerA: {
      id: 'demo-a',
      username: playerA,
      character: characterA,
      skin: 'default',
    },
    playerB: {
      id: 'demo-b',
      username: playerB,
      character: characterB,
      skin: 'default',
    },
    winner: winner,
    duration: parseFloat(time.toFixed(2)),
    events: events,
  };
}
